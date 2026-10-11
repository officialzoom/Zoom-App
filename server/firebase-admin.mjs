import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Server configuration is missing ${name}.`);
    error.status = 503;
    throw error;
  }
  return value;
}

export function getFirebaseAdminApp() {
  const existing = getApps().find((app) => app.name === "zoom-ng-vercel");
  if (existing) return existing;

  const projectId = requiredEnvironment("FIREBASE_PROJECT_ID");
  const clientEmail = requiredEnvironment("FIREBASE_CLIENT_EMAIL");
  const privateKey = requiredEnvironment("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_DATABASE_URL || requiredEnvironment("FIREBASE_DATABSE_URL");

  return initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    },
    "zoom-ng-vercel",
  );
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getRealtimeDatabase() {
  return getDatabase(getFirebaseAdminApp());
}
