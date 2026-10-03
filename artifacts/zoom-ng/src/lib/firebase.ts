import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

// Keep the public preview renderable when a Firebase web key is misconfigured.
// Auth actions still surface the Firebase error until the Vercel variables are corrected.
export let auth: Auth | null = null;
try {
  auth = getAuth(app);
} catch (error) {
  console.error("[v0] Firebase Auth could not initialize", error);
}

export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
