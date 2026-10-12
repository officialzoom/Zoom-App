import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { inspectWalletBalance } from "../server/wallet-balance.mjs";

const applyChanges = process.argv.includes("--apply");

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getApp() {
  const existing = getApps().find((app) => app.name === "wallet-balance-migration");
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: requiredEnvironment("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnvironment("FIREBASE_CLIENT_EMAIL"),
      privateKey: requiredEnvironment("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    databaseURL: requiredEnvironment("FIREBASE_DATABASE_URL"),
  }, "wallet-balance-migration");
}

async function main() {
  const database = getDatabase(getApp());
  const [usersSnapshot, walletsSnapshot] = await Promise.all([
    database.ref("users").get(),
    database.ref("wallets").get(),
  ]);
  const users = usersSnapshot.val() ?? {};
  const wallets = walletsSnapshot.val() ?? {};
  const updates = {};
  const conflicts = [];

  if (typeof users !== "object" || Array.isArray(users) || typeof wallets !== "object" || Array.isArray(wallets)) {
    throw new Error("The users or wallets root is not an object. No wallet data was changed.");
  }

  for (const [uid, profile] of Object.entries(users)) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      conflicts.push(`users/${uid}`);
      continue;
    }
    const existing = wallets[uid];
    if (existing !== undefined) {
      if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
        conflicts.push(`wallets/${uid}`);
        continue;
      }
      if (existing.schemaVersion === 1) {
        const current = inspectWalletBalance(existing.balance);
        if (typeof existing.balance !== "number" || !current.valid) {
          conflicts.push(`wallets/${uid}/balance (${current.issue ?? "invalid-type"})`);
        }
        if (existing.operations !== undefined
          && (!existing.operations || typeof existing.operations !== "object" || Array.isArray(existing.operations))) {
          conflicts.push(`wallets/${uid}/operations`);
        }
        continue;
      }
    }

    const legacy = inspectWalletBalance(profile.walletBalance);
    if (!legacy.valid) {
      conflicts.push(`users/${uid}/walletBalance (${legacy.issue})`);
      continue;
    }
    if (existing !== undefined) {
      const current = inspectWalletBalance(existing.balance);
      if (!current.valid || current.balance !== legacy.balance) {
        conflicts.push(`wallets/${uid}/balance conflicts with legacy profile balance`);
        continue;
      }
      conflicts.push(`wallets/${uid}/schemaVersion`);
      continue;
    }
    updates[`wallets/${uid}`] = { schemaVersion: 1, balance: legacy.balance, operations: {} };
  }

  console.log(`User profiles inspected: ${Object.keys(users).length}.`);
  console.log(`Wallet states to initialize: ${Object.keys(updates).length}.`);
  if (conflicts.length) {
    console.error(`Found ${conflicts.length} conflicting record(s); no data was written.`);
    for (const path of conflicts.slice(0, 50)) console.error(`- ${path}`);
    if (conflicts.length > 50) console.error(`- and ${conflicts.length - 50} more`);
    process.exitCode = 2;
    return;
  }
  if (!applyChanges) {
    console.log("Dry run only. Freeze wallet mutations, review the result, then rerun with --apply.");
    return;
  }
  const entries = Object.entries(updates);
  const chunkSize = 100;
  for (let index = 0; index < entries.length; index += chunkSize) {
    await database.ref().update(Object.fromEntries(entries.slice(index, index + chunkSize)));
  }
  console.log(`Initialized ${entries.length} wallet state(s). Legacy profile balances were left unchanged.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Wallet migration failed.");
  process.exitCode = 1;
});
