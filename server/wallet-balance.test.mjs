import assert from "node:assert/strict";
import test from "node:test";
import { inspectWalletBalance } from "./wallet-balance.mjs";

test("missing wallet balance remains a zero balance", () => {
  assert.deepEqual(inspectWalletBalance(undefined), {
    valid: true,
    balance: 0,
    issue: "missing",
    valueType: "missing",
  });
});

test("accepts whole non-negative numeric balances and numeric strings", () => {
  assert.equal(inspectWalletBalance(2500).balance, 2500);
  assert.equal(inspectWalletBalance("2500").balance, 2500);
});

test("rejects malformed balances without coercing them to zero", () => {
  assert.equal(inspectWalletBalance({ amount: 2500 }).issue, "invalid-type");
  assert.equal(inspectWalletBalance("₦2,500").issue, "not-numeric");
  assert.equal(inspectWalletBalance(" ").issue, "not-numeric");
  assert.equal(inspectWalletBalance(2.5).issue, "not-whole");
  assert.equal(inspectWalletBalance(-1).issue, "negative");
  assert.equal(inspectWalletBalance(Number.MAX_SAFE_INTEGER + 1).issue, "unsafe-integer");
});
