import assert from "node:assert/strict";
import test from "node:test";
import { calculateWalletStateUpdate } from "./wallet-state-transaction.mjs";

const initialState = { schemaVersion: 1, balance: 500, operations: {} };

test("applies balance change and stores idempotent bookkeeping together", () => {
  const update = calculateWalletStateUpdate(
    initialState,
    "credit-one",
    125,
    "credit:125",
    1234,
  );

  assert.equal(update.outcome, "applied");
  assert.equal(update.next.balance, 625);
  assert.equal(update.next.operations["credit-one"].createdAt, 1234);
  assert.equal(update.next.operations["credit-one"].fingerprintHash.length, 64);
  assert.equal(Object.hasOwn(update.next.operations["credit-one"], "updates"), false);
});

test("rejects insufficient funds without producing a new state", () => {
  const update = calculateWalletStateUpdate(initialState, "invest-one", -600, "invest:600", 1234);
  assert.equal(update.outcome, "insufficient");
  assert.equal(update.next, undefined);
});

test("does not apply a repeated operation twice", () => {
  const first = calculateWalletStateUpdate(initialState, "credit-one", 125, "credit:125", 1234);
  const replay = calculateWalletStateUpdate(first.next, "credit-one", 125, "credit:125", 9999);
  assert.equal(replay.outcome, "already-applied");
  assert.equal(replay.next.balance, 625);
  assert.equal(replay.operation.createdAt, 1234);
});

test("rejects reuse of an operation ID for different input", () => {
  const first = calculateWalletStateUpdate(initialState, "credit-one", 125, "credit:125", 1234);
  const replay = calculateWalletStateUpdate(first.next, "credit-one", 500, "credit:500", 9999);
  assert.equal(replay.outcome, "operation-conflict");
});

test("requires an initialized numeric wallet state", () => {
  assert.equal(calculateWalletStateUpdate(null, "credit-one", 1, "credit:1", 1234).outcome, "missing");
  assert.equal(
    calculateWalletStateUpdate({ schemaVersion: 1, balance: "500" }, "credit-one", 1, "credit:1", 1234).outcome,
    "invalid-balance",
  );
  assert.equal(
    calculateWalletStateUpdate({ schemaVersion: 1, balance: 500, operations: [] }, "credit-one", 1, "credit:1", 1234).outcome,
    "invalid-state",
  );
});
