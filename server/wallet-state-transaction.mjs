import { createHash } from "node:crypto";
import { inspectWalletBalance } from "./wallet-balance.mjs";

export function calculateWalletStateUpdate(current, operationId, delta, fingerprint, createdAt) {
  if (current == null) return { outcome: "missing" };
  if (typeof current !== "object" || Array.isArray(current) || current.schemaVersion !== 1) {
    return { outcome: "invalid-state" };
  }
  if (current.operations !== undefined
    && (!current.operations || typeof current.operations !== "object" || Array.isArray(current.operations))) {
    return { outcome: "invalid-state" };
  }

  const existing = current.operations?.[operationId];
  if (existing) {
    const fingerprintHash = createHash("sha256").update(fingerprint).digest("hex");
    if (existing.fingerprintHash !== fingerprintHash) return { outcome: "operation-conflict" };
    return { outcome: "already-applied", operation: existing, next: current };
  }

  const balance = inspectWalletBalance(current.balance);
  if (typeof current.balance !== "number" || !balance.valid) return { outcome: "invalid-balance" };
  const nextBalance = balance.balance + delta;
  if (!Number.isSafeInteger(nextBalance)) return { outcome: "invalid-balance" };
  if (nextBalance < 0) return { outcome: "insufficient" };

  const operation = {
    fingerprintHash: createHash("sha256").update(fingerprint).digest("hex"),
    createdAt,
  };
  return {
    outcome: "applied",
    operation,
    next: {
      ...current,
      balance: nextBalance,
      operations: { ...(current.operations ?? {}), [operationId]: operation },
    },
  };
}
