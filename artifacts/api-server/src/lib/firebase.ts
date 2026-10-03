import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let database: Database | undefined;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getFirebaseDatabase() {
  if (database) return database;
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    databaseURL: required("FIREBASE_DATABASE_URL"),
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
