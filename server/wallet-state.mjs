import { getRealtimeDatabase } from "./firebase-admin.mjs";
import { HttpError, requireSafeId } from "./http.mjs";
import { inspectWalletBalance } from "./wallet-balance.mjs";
import { calculateWalletStateUpdate } from "./wallet-state-transaction.mjs";

const NULL_RETRY_DELAYS_MS = [50, 100, 200];

export async function getWalletState(uid) {
  const walletRef = getRealtimeDatabase().ref(`wallets/${uid}`);
  const [balanceSnapshot, schemaSnapshot] = await Promise.all([
    walletRef.child("balance").get(),
    walletRef.child("schemaVersion").get(),
  ]);
  if (!balanceSnapshot.exists() || schemaSnapshot.val() !== 1) {
    throw new HttpError(
      503,
      "Your wallet is being prepared. Please try again shortly.",
    );
  }
  const balance = balanceSnapshot.val();
  const wallet = inspectWalletBalance(balance);
  if (typeof balance !== "number" || !wallet.valid) {
    throw new HttpError(
      409,
      "Your wallet balance needs review before it can be used.",
    );
  }
  return { balance: wallet.balance };
}

export async function applyWalletMutation(
  uid,
  operationId,
  delta,
  fingerprint,
  buildUpdates,
) {
  requireSafeId(operationId, "Wallet operation ID");
  if (!Number.isSafeInteger(delta) || delta === 0) {
    throw new HttpError(
      400,
      "Wallet change must be a non-zero whole-naira amount.",
    );
  }
  if (typeof fingerprint !== "string" || typeof buildUpdates !== "function") {
    throw new HttpError(500, "Wallet operation metadata is invalid.");
  }

  const database = getRealtimeDatabase();
  const profile = await database.ref(`users/${uid}`).get();
  if (!profile.exists())
    throw new HttpError(404, "The user profile no longer exists.");
  const walletRef = database.ref(`wallets/${uid}`);
  const requestedAt = Date.now();
  const validateUpdates = (timestamp) => {
    const value = buildUpdates(timestamp);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpError(500, "Wallet operation records are invalid.");
    }
    return value;
  };
  validateUpdates(requestedAt);
  let outcome = "missing";
  let operation;
  let retryCount = 0;
  let result;
  while (true) {
    // Refresh the SDK cache before each attempt. A warm serverless instance can
    // retain a stale missing value after another request has initialized the wallet.
    const freshWallet = await walletRef.get();
    if (!freshWallet.exists()) {
      throw new HttpError(
        503,
        "Your wallet has not been migrated yet. Please try again after wallet setup is complete.",
      );
    }

    let callbackSawMissing = false;
    result = await walletRef.transaction(
      (current) => {
        callbackSawMissing = current == null;
        const update = calculateWalletStateUpdate(
          current,
          operationId,
          delta,
          fingerprint,
          requestedAt,
        );
        outcome = update.outcome;
        operation = update.operation;
        return update.next;
      },
      undefined,
      true,
    );

    if (result.committed || !callbackSawMissing) break;

    const current = await walletRef.get();
    if (!current.exists()) {
      throw new HttpError(
        503,
        "Your wallet has not been migrated yet. Please try again after wallet setup is complete.",
      );
    }
    if (retryCount >= NULL_RETRY_DELAYS_MS.length) {
      console.warn("Firebase wallet-state transaction retry limit reached.", {
        attempts: retryCount + 1,
      });
      throw new HttpError(409, "Your wallet is busy. Refresh and try again.");
    }
    if (retryCount === 0) {
      console.warn(
        "Firebase wallet-state transaction received null while wallet state exists; retrying.",
      );
    }
    await new Promise((resolve) =>
      setTimeout(resolve, NULL_RETRY_DELAYS_MS[retryCount]),
    );
    retryCount += 1;
  }

  if (outcome === "invalid-state") {
    throw new HttpError(
      409,
      "Your wallet data needs review before it can be used.",
    );
  }
  if (outcome === "invalid-balance") {
    throw new HttpError(
      409,
      "Your wallet balance cannot safely accept this transaction.",
    );
  }
  if (outcome === "insufficient") {
    throw new HttpError(400, "Insufficient wallet balance.");
  }
  if (outcome === "operation-conflict") {
    throw new HttpError(
      409,
      "This wallet operation ID was already used for a different request.",
    );
  }
  if (!result.committed && outcome !== "already-applied") {
    throw new HttpError(409, "The wallet operation could not be applied.");
  }

  const currentBalance = inspectWalletBalance(result.snapshot.val()?.balance);
  if (!currentBalance.valid) {
    throw new HttpError(
      500,
      "The wallet transaction completed but its balance could not be read.",
    );
  }
  const balance = currentBalance.balance;
  if (!Number.isSafeInteger(operation.createdAt)) {
    throw new HttpError(409, "The wallet operation record needs review.");
  }
  await database.ref().update(validateUpdates(operation.createdAt));
  return {
    balance,
    alreadyApplied: outcome === "already-applied",
    createdAt: operation.createdAt,
  };
}
