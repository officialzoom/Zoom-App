import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BanNotification() {
  const { user, logout } = useAuth();
  const [banned, setBanned] = useState(false);
  const [bannedReason, setBannedReason] = useState("");

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.banned) {
            setBanned(true);
            setBannedReason(data.bannedReason || "Violation of terms of service");
          }
        }
      },
      () => {}
    );

    return unsub;
  }, [user]);

  if (!banned) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Account Suspended</h2>
        <p className="text-gray-600 mb-2">Your Zoom NG account has been suspended.</p>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-red-700 mb-1">Reason:</p>
          <p className="text-sm text-red-600">{bannedReason}</p>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          If you believe this is a mistake, please contact our support team immediately.
        </p>
        <a href="mailto:officialzoom200@gmail.com">
          <Button className="w-full rounded-xl h-12 font-bold flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5" /> Contact Admin
          </Button>
        </a>
        <Button variant="ghost" className="w-full rounded-xl" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
