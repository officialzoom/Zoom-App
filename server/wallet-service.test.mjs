import assert from "node:assert/strict";
import test from "node:test";
import { transactUserRootWithNullRetry } from "./user-root-transaction.mjs";

function createUserRef({ profile, missingAttempts = 0, replayWithProfile = false }) {
  let transactions = 0;
  let reads = 0;
  return {
    get transactionCount() {
      return transactions;
    },
    get readCount() {
      return reads;
    },
    async get() {
      reads += 1;
      return { exists: () => profile !== null };
    },
    async transaction(update) {
      transactions += 1;
      if (replayWithProfile && transactions === 1) {
        update(null);
        const next = update(profile);
        profile = next;
        return { committed: true, snapshot: { val: () => profile } };
      }
      if (missingAttempts > 0) {
        missingAttempts -= 1;
        update(null);
        return { committed: false, snapshot: { val: () => null } };
      }
      const next = update(profile);
      if (next === undefined) {
        return { committed: false, snapshot: { val: () => profile } };
      }
      profile = next;
      return { committed: true, snapshot: { val: () => profile } };
    },
  };
}

test("retries a null-initialized user-root transaction when the profile exists", async () => {
  const userRef = createUserRef({ profile: { walletBalance: 100 }, missingAttempts: 1 });
  const delays = [];
  const result = await transactUserRootWithNullRetry(
    userRef,
    (profile) => profile && ({ ...profile, walletBalance: profile.walletBalance + 25 }),
    { delay: async (milliseconds) => delays.push(milliseconds) },
  );

  assert.equal(result.committed, true);
  assert.equal(result.snapshot.val().walletBalance, 125);
  assert.equal(userRef.transactionCount, 2);
  assert.equal(userRef.readCount, 1);
  assert.deepEqual(delays, [50]);
});

test("does not retry when the immediate profile read confirms it is missing", async () => {
  const userRef = createUserRef({ profile: null, missingAttempts: 1 });
  let updateCalled = false;
  const result = await transactUserRootWithNullRetry(userRef, () => {
    updateCalled = true;
    return null;
  }, {
    delay: async () => assert.fail("Should not delay when the profile is missing"),
  });

  assert.equal(result.committed, false);
  assert.equal(updateCalled, false);
  assert.equal(userRef.transactionCount, 1);
  assert.equal(userRef.readCount, 1);
});

test("preserves an aborted business outcome when the callback receives a profile", async () => {
  const userRef = createUserRef({ profile: { walletBalance: 10 } });
  const result = await transactUserRootWithNullRetry(userRef, () => undefined, {
    delay: async () => assert.fail("Should not retry a business abort"),
  });

  assert.equal(result.committed, false);
  assert.equal(userRef.transactionCount, 1);
  assert.equal(userRef.readCount, 0);
});

test("uses the latest callback value when Firebase re-executes a transaction callback", async () => {
  const userRef = createUserRef({ profile: { walletBalance: 100 }, replayWithProfile: true });
  const result = await transactUserRootWithNullRetry(
    userRef,
    (profile) => profile && ({ ...profile, walletBalance: profile.walletBalance - 20 }),
    { delay: async () => assert.fail("A committed callback replay should not retry") },
  );

  assert.equal(result.committed, true);
  assert.equal(result.snapshot.val().walletBalance, 80);
  assert.equal(userRef.readCount, 0);
});

test("returns explicit 409 after bounded retries while the profile remains present", async () => {
  const userRef = createUserRef({ profile: { walletBalance: 100 }, missingAttempts: 3 });
  const delays = [];

  await assert.rejects(
    transactUserRootWithNullRetry(userRef, () => undefined, {
      retryDelaysMs: [1, 2],
      delay: async (milliseconds) => delays.push(milliseconds),
    }),
    (error) => error.status === 409 && /profile exists/i.test(error.message),
  );

  assert.equal(userRef.transactionCount, 3);
  assert.equal(userRef.readCount, 3);
  assert.deepEqual(delays, [1, 2]);
});
