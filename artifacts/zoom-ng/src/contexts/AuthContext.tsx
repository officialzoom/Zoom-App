import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsub: () => void = () => {};
    const authInstance = auth;
    void setPersistence(authInstance, browserLocalPersistence)
      .catch((error) => console.error("[v0] Firebase persistence could not initialize", error))
      .finally(() => {
        unsub = onAuthStateChanged(authInstance, (u) => {
          setUser(u);
          setLoading(false);
        });
      });
    return () => unsub();
  }, []);

  const requireAuth = () => {
    if (!auth) {
      throw new Error("Firebase Auth is unavailable. Check the VITE_FIREBASE_* variables in Vercel.");
    }
    return auth;
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuth(), email, password);
  };

  const signup = async (email: string, password: string, displayName: string): Promise<User> => {
    const cred = await createUserWithEmailAndPassword(requireAuth(), email, password);
    await updateProfile(cred.user, { displayName });
    return cred.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(requireAuth(), googleProvider);
    return result.user;
  };

  const logout = async () => {
    await signOut(requireAuth());
  };

  const getToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
