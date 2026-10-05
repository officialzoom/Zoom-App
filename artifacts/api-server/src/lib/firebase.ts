import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let database: Database | undefined;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value.trim();
}

function resolveCredentials() {
  const rawKey = required("FIREBASE_PRIVATE_KEY");
  let privateKey = rawKey.replace(/\\n/g, "\n");
  if (rawKey.trimStart().startsWith("{")) {
    // Value is a full service account JSON — extract the private_key field.
    const parsed = JSON.parse(rawKey);
    privateKey = String(parsed.private_key ?? "");
  }
  return {
    projectId: required("FIREBASE_PROJECT_ID"),
    clientEmail: required("FIREBASE_CLIENT_EMAIL"),
    privateKey,
    databaseURL: required("FIREBASE_DATABASE_URL"),
  };
}

export function getFirebaseDatabase() {
  if (database) return database;
  const app = getApps()[0] ?? initializeApp({
    credential: cert(resolveCredentials()),
  });
  database = getDatabase(app);
  return database;
}

export function userPath(uid: string, child?: string) {
  return `users/${uid}${child ? `/${child}` : ""}`;
}

export function publicPath(path: string) {
  return path.replace(/^\/+/, "");
}
