import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getFirebaseDatabase, userPath } from "../lib/firebase";

const router = Router();

/**
 * GET /api/wallet — wallet balance and stats.
 */
router.get("/", requireAuth, async (req, res) => {
  const db = getFirebaseDatabase();
  const walletSnap = await db.ref(userPath(req.userId!, "wallet")).get();
  const wallet = walletSnap.val() ?? {};
  const balance = Number(wallet.balance ?? 0);

  // Sum active investments
  const invSnap = await db.ref(userPath(req.userId!, "investments")).get();
  const investments = invSnap.val() ?? {};
  let activeInvestmentsValue = 0;
  let totalEarnings = 0;
  for (const inv of Object.values(investments) as any[]) {
    if (inv.status === "active") activeInvestmentsValue += Number(inv.amount ?? 0);
    if (inv.status === "completed") totalEarnings += Number(inv.expectedPayout ?? 0) - Number(inv.amount ?? 0);
  }

  // Weekly change: sum earnings from the last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const txSnap = await db.ref(userPath(req.userId!, "transactions")).get();
  const transactions = txSnap.val() ?? {};
  let weeklyChange = 0;
  for (const tx of Object.values(transactions) as any[]) {
    if (Number(tx.date ?? 0) >= weekAgo && (tx.type === "return" || tx.type === "deposit")) {
      weeklyChange += Number(tx.amount ?? 0);
    }
  }

  return res.json({
    balance,
    activeInvestmentsValue,
    totalEarnings,
    weeklyChange,
  });
});

/**
 * POST /api/wallet/topup — initiate SquadCo payment for wallet funding.
 * Returns the checkout URL so the frontend can redirect the user.
 */
router.post("/topup", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: "Minimum top-up is ₦100" });

  const secretKey = process.env.SQUADCO_SECRET_KEY ?? "";
  const baseUrl = process.env.SQUADCO_BASE_URL ?? "https://sandbox-api-d.squadco.com";
  if (!secretKey) return res.status(503).json({ error: "Payment gateway not configured" });

  const transactionRef = `ZMNG-W-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const callbackUrl = `${req.headers.origin ?? ""}/profile?fund=${transactionRef}`;

  const response = await fetch(`${baseUrl}/transaction/initiate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      email: req.userEmail ?? "",
      currency: "NGN",
      initiate_type: "inline",
      transaction_ref: transactionRef,
      callback_url: callbackUrl,
      metadata: { userId: req.userId, type: "wallet_fund" },
    }),
  });
  const data = await response.json() as { data?: { checkout_url?: string }; message?: string };
  if (!response.ok || !data.data?.checkout_url) {
    return res.status(502).json({ error: data.message ?? "Failed to initiate payment" });
  }

  // Record pending payment
  const db = getFirebaseDatabase();
  await db.ref(userPath(req.userId!, `payments/${transactionRef}`)).set({
    amount,
    status: "pending",
    type: "wallet_fund",
    createdAt: Date.now(),
  });

  return res.json({ checkoutUrl: data.data.checkout_url, transactionRef, balance: 0 });
});

/**
 * GET /api/wallet/fund/verify/:transactionRef — verify a SquadCo payment
 * and credit the wallet if successful.
 */
router.get("/fund/verify/:transactionRef", requireAuth, async (req, res) => {
  const secretKey = process.env.SQUADCO_SECRET_KEY ?? "";
  const baseUrl = process.env.SQUADCO_BASE_URL ?? "https://sandbox-api-d.squadco.com";
  if (!secretKey) return res.status(503).json({ error: "Payment gateway not configured" });

  const response = await fetch(`${baseUrl}/transaction/verify/${req.params.transactionRef}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await response.json() as { success?: boolean; message?: string; data?: { transaction_status?: string; transaction_amount?: number } };
  if (!response.ok || !data.success) {
    return res.status(402).json({ verified: false, error: data.message ?? "Payment verification failed" });
  }
  if (data.data?.transaction_status !== "Success") {
    return res.json({ verified: false, status: data.data?.transaction_status ?? "pending" });
  }

  const db = getFirebaseDatabase();
  const amount = Number(data.data.transaction_amount ?? 0) / 100;
  const paymentRef = db.ref(userPath(req.userId!, `payments/${req.params.transactionRef}`));
  const result = await paymentRef.transaction((payment: any) =>
    payment?.credited ? payment : { ...(payment ?? {}), amount, status: "verified", credited: true, verifiedAt: Date.now() },
  );

  if (result.committed) {
    await db.ref(userPath(req.userId!, "wallet/balance")).transaction((balance: number) => Number(balance ?? 0) + amount);
    // Record a deposit transaction
    const txRef = db.ref(userPath(req.userId!, "transactions")).push();
    await txRef.set({
      type: "deposit",
      label: "Wallet Top Up",
      amount,
      date: Date.now(),
      status: "completed",
    });
  }

  return res.json({ verified: true, amount, balance: 0 });
});

/**
 * POST /api/wallet/withdraw — create a withdrawal request.
 * Withdrawals require admin approval (12-hour timer).
 */
router.post("/withdraw", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  const bankId = req.body?.bankId;
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: "Minimum withdrawal is ₦100" });
  if (!bankId) return res.status(400).json({ error: "Select a bank account" });

  const db = getFirebaseDatabase();
  const walletSnap = await db.ref(userPath(req.userId!, "wallet")).get();
  const balance = Number(walletSnap.val()?.balance ?? 0);
  if (amount > balance) return res.status(400).json({ error: "Insufficient balance" });

  // Check referral requirement
  const userSnap = await db.ref(userPath(req.userId!)).get();
  const referralCount = Number(userSnap.val()?.referralCount ?? 0);
  if (referralCount < 5) return res.status(403).json({ error: "You need at least 5 referrals to withdraw" });

  // Create withdrawal request with 12-hour approval timer
  const now = Date.now();
  const approvalDeadline = now + 12 * 60 * 60 * 1000;
  const wRef = db.ref(userPath(req.userId!, "withdrawalRequests")).push();
  await wRef.set({
    amount,
    bankId,
    status: "pending",
    createdAt: now,
    approvalDeadline,
  });

  // Deduct from balance immediately (held in escrow)
  await db.ref(userPath(req.userId!, "wallet/balance")).transaction((bal: number) => Number(bal ?? 0) - amount);

  // Record a withdrawal transaction
  const txRef = db.ref(userPath(req.userId!, "transactions")).push();
  await txRef.set({
    type: "withdrawal",
    label: "Withdrawal Request",
    amount,
    date: now,
    status: "pending",
  });

  return res.json({
    balance: 0,
    message: "Withdrawal request submitted. Admin has 12 hours to approve.",
  });
});

/**
 * GET /api/wallet/transactions — transaction history.
 */
router.get("/transactions", requireAuth, async (req, res) => {
  const db = getFirebaseDatabase();
  const snap = await db.ref(userPath(req.userId!, "transactions")).get();
  const txns = snap.val() ?? {};
  const list = Object.entries(txns).map(([id, tx]: [string, any]) => ({
    id,
    type: tx.type ?? "deposit",
    label: tx.label ?? "",
    amount: Number(tx.amount ?? 0),
    date: new Date(Number(tx.date ?? Date.now())).toISOString(),
    status: tx.status ?? "completed",
  }));
  // Sort by date descending
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return res.json(list);
});

export default router;
