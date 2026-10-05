import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getFirebaseDatabase, userPath } from "../lib/firebase";

const router = Router();

/**
 * GET /api/user/profile
 * Reads the user's profile from Firebase RTDB. Falls back to sensible
 * defaults derived from the auth token when the node doesn't exist yet.
 */
router.get("/profile", requireAuth, async (req, res) => {
  const db = getFirebaseDatabase();
  const snap = await db.ref(userPath(req.userId!)).get();
  const stored = snap.val() ?? {};

  const email = req.userEmail ?? stored.email ?? "";
  const displayName = stored.displayName || email.split("@")[0] || "Investor";
  const avatarInitials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profile = {
    id: req.userId,
    displayName,
    email,
    phone: stored.phone ?? "",
    location: stored.location ?? "",
    avatarInitials,
    kycVerified: Boolean(stored.kycVerified),
    memberSince: stored.memberSince ?? new Date().toISOString().slice(0, 10),
    investorLevel: stored.investorLevel ?? "Bronze",
    referralCount: stored.referralCount ?? 0,
    referralCode: stored.referralCode ?? req.userId!.slice(0, 8).toUpperCase(),
  };

  return res.json(profile);
});

/**
 * PATCH /api/user/profile
 * Updates editable profile fields and persists to Firebase RTDB.
 */
router.patch("/profile", requireAuth, async (req, res) => {
  const updates: Record<string, unknown> = {};
  if (typeof req.body?.displayName === "string" && req.body.displayName.trim()) updates.displayName = req.body.displayName.trim();
  if (typeof req.body?.phone === "string") updates.phone = req.body.phone.trim();
  if (typeof req.body?.location === "string") updates.location = req.body.location.trim();

  const db = getFirebaseDatabase();
  const ref = db.ref(userPath(req.userId!));
  await ref.update(updates);

  const snap = await ref.get();
  const stored = snap.val() ?? {};
  const email = req.userEmail ?? stored.email ?? "";
  const displayName = stored.displayName || email.split("@")[0] || "Investor";
  const avatarInitials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return res.json({
    id: req.userId,
    displayName,
    email,
    phone: stored.phone ?? "",
    location: stored.location ?? "",
    avatarInitials,
    kycVerified: Boolean(stored.kycVerified),
    memberSince: stored.memberSince ?? new Date().toISOString().slice(0, 10),
    investorLevel: stored.investorLevel ?? "Bronze",
    referralCount: stored.referralCount ?? 0,
    referralCode: stored.referralCode ?? req.userId!.slice(0, 8).toUpperCase(),
  });
});

export default router;
