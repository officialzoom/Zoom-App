import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  databaseURL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseVariables = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_DATABASE_URL: firebaseConfig.databaseURL,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseVariables.length > 0) {
  console.error(`Missing Firebase web environment variables: ${missingFirebaseVariables.join(", ")}`);
}

export const app = initializeApp(firebaseConfig);

// Keep the public preview renderable when a Firebase web key is misconfigured.
// Auth actions still surface the Firebase error until the Vercel variables are corrected.
export let auth: Auth | null = null;
try {
  auth = getAuth(app);
} catch (error) {
  console.error("[v0] Firebase Auth could not initialize", error);
}

export const db = databaseURL ? getDatabase(app, databaseURL) : getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
