export function inspectWalletBalance(value) {
  if (value === null || value === undefined) {
    return { valid: true, balance: 0, issue: "missing", valueType: "missing" };
  }

  const valueType = typeof value;
  if (valueType !== "number" && valueType !== "string") {
    return { valid: false, balance: null, issue: "invalid-type", valueType };
  }
  if (valueType === "string" && value.trim() === "") {
    return { valid: false, balance: null, issue: "not-numeric", valueType };
  }

  const balance = Number(value);
  if (!Number.isFinite(balance)) {
    return { valid: false, balance: null, issue: "not-numeric", valueType };
  }
  if (!Number.isInteger(balance)) {
    return { valid: false, balance: null, issue: "not-whole", valueType };
  }
  if (!Number.isSafeInteger(balance)) {
    return { valid: false, balance: null, issue: "unsafe-integer", valueType };
  }
  if (balance < 0) {
    return { valid: false, balance: null, issue: "negative", valueType };
  }

  return { valid: true, balance, issue: null, valueType };
}
