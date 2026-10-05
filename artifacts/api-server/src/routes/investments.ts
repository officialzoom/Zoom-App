import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getFirebaseDatabase, userPath } from "../lib/firebase";

const router = Router();

// Static asset tiers — same data served by the assets route.
// Kept here so investment creation can validate and enrich the record.
const ASSET_TIERS: Record<string, { label: string; returnRate: number; durationDays: number; entryAmount: number }> = {
  "car-suv-fleet": { label: "SUV & Jeep Executive Fleet", returnRate: 16, durationDays: 180, entryAmount: 10000 },
  "car-luxury-fleet": { label: "Executive Luxury SUV Fleet", returnRate: 19, durationDays: 270, entryAmount: 20000 },
  "bus-city-fleet": { label: "City Route Mini-Bus Fleet", returnRate: 20, durationDays: 180, entryAmount: 5000 },
  "bus-interstate-fleet": { label: "Interstate Coach Fleet", returnRate: 24, durationDays: 270, entryAmount: 15000 },
  "truck-pickup-fleet": { label: "Pickup & Delivery Fleet", returnRate: 22, durationDays: 210, entryAmount: 8000 },
  "truck-heavy-fleet": { label: "Heavy Haulage & Tipper Fleet", returnRate: 28, durationDays: 365, entryAmount: 30000 },
};

// Maximum investment amount to keep the platform accessible.
const MAX_INVESTMENT = 30_000;

/**
 * GET /api/investments — list the user's investments.
 */
router.get("/", requireAuth, async (req, res) => {
  const db = getFirebaseDatabase();
  const snap = await db.ref(userPath(req.userId!, "investments")).get();
  const investments = snap.val() ?? {};
  const list = Object.entries(investments).map(([id, inv]: [string, any]) => ({
    id,
    assetId: inv.assetId ?? "",
    assetLabel: inv.assetLabel ?? "",
    amount: Number(inv.amount ?? 0),
    expectedPayout: Number(inv.expectedPayout ?? 0),
    returnRate: Number(inv.returnRate ?? 0),
    status: inv.status ?? "active",
    startDate: inv.startDate ?? new Date().toISOString(),
    endDate: inv.endDate ?? new Date().toISOString(),
  }));
  return res.json(list);
});

/**
 * POST /api/investments — create a new investment.
 *
 * Flow:
 *  1. Validate amount (must be within asset limits and ≤ ₦30k cap).
 *  2. Check wallet balance — user must have enough funds.
 *  3. Deduct from wallet, create investment record, log transaction.
 *
 * If the user doesn't have enough wallet balance, return 400 so the
 * frontend can prompt them to add funds first.
 */
router.post("/", requireAuth, async (req, res) => {
  const assetId = req.body?.assetId;
  const amount = Number(req.body?.amount);
  const lockDays = Number(req.body?.lockDays ?? 0);

  if (!assetId || !ASSET_TIERS[assetId]) {
    return res.status(400).json({ error: "Invalid asset selected" });
  }
  const tier = ASSET_TIERS[assetId];
  if (!Number.isFinite(amount) || amount < tier.entryAmount) {
    return res.status(400).json({ error: `Minimum investment for this asset is ₦${tier.entryAmount.toLocaleString("en-NG")}` });
  }
  if (amount > MAX_INVESTMENT) {
    return res.status(400).json({ error: `Maximum investment is ${MAX_INVESTMENT.toLocaleString("en-NG")} to keep the platform accessible` });
  }
  if (!Number.isInteger(lockDays) || lockDays < 1) {
    return res.status(400).json({ error: "Invalid investment duration" });
  }

  const db = getFirebaseDatabase();

  // Check wallet balance
  const walletSnap = await db.ref(userPath(req.userId!, "wallet")).get();
  const balance = Number(walletSnap.val()?.balance ?? 0);
  if (amount > balance) {
    return res.status(400).json({ error: "Insufficient wallet balance. Please add funds first." });
  }

  // Pro-rate the return based on lockDays vs the tier's full duration.
  const prorate = Math.min(lockDays / tier.durationDays, 1);
  const expectedPayout = Math.round(amount * (1 + (tier.returnRate / 100) * prorate));
  const now = Date.now();
  const startDate = new Date(now).toISOString();
  const endDate = new Date(now + lockDays * 24 * 60 * 60 * 1000).toISOString();

  // Deduct from wallet
  await db.ref(userPath(req.userId!, "wallet/balance")).transaction((bal: number) => Number(bal ?? 0) - amount);

  // Create investment record
  const invRef = db.ref(userPath(req.userId!, "investments")).push();
  await invRef.set({
    assetId,
    assetLabel: tier.label,
    amount,
    expectedPayout,
    returnRate: tier.returnRate,
    status: "active",
    startDate,
    endDate,
    lockDays,
    createdAt: now,
  });

  // Log transaction
  const txRef = db.ref(userPath(req.userId!, "transactions")).push();
  await txRef.set({
    type: "invest",
    label: `Investment in ${tier.label}`,
    amount,
    date: now,
    status: "active",
  });

  return res.status(201).json({
    id: invRef.key,
    assetId,
    assetLabel: tier.label,
    amount,
    expectedPayout,
    returnRate: tier.returnRate,
    status: "active",
    startDate,
    endDate,
  });
});

export default router;
