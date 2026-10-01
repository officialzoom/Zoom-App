import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC94YrR6RsZgbCtmL6C5IKgqOHFBBtMqCE",
  authDomain: "zoom-30417.firebaseapp.com",
  projectId: "zoom-30417",
  storageBucket: "zoom-30417.firebasestorage.app",
  messagingSenderId: "929658070232",
  appId: "1:929658070232:web:bf0a2ac2ab9ba2cce6e3ad",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();