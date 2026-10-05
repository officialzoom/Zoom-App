import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getFirebaseDatabase, userPath } from "../lib/firebase";

const router = Router();

/**
 * GET /api/dashboard/summary — aggregated stats for the dashboard.
 */
router.get("/summary", requireAuth, async (req, res) => {
  const db = getFirebaseDatabase();
  const userRef = db.ref(userPath(req.userId!));

  const [walletSnap, invSnap, txSnap] = await Promise.all([
    userRef.child("wallet").get(),
    userRef.child("investments").get(),
    userRef.child("transactions").get(),
  ]);

  const wallet = walletSnap.val() ?? {};
  const balance = Number(wallet.balance ?? 0);
  const investments = invSnap.val() ?? {};
  const transactions = txSnap.val() ?? {};

  let activeInvestmentsValue = 0;
  let totalEarnings = 0;
  let activeCount = 0;
  let completedCount = 0;

  for (const inv of Object.values(investments) as any[]) {
    if (inv.status === "active") {
      activeInvestmentsValue += Number(inv.amount ?? 0);
      activeCount++;
    }
    if (inv.status === "completed") {
      totalEarnings += Number(inv.expectedPayout ?? 0) - Number(inv.amount ?? 0);
      completedCount++;
    }
  }

  // Weekly change from the last 7 days of returns and deposits
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let weeklyChange = 0;
  const recentTransactions = Object.entries(transactions)
    .map(([id, tx]: [string, any]) => ({
      id,
      type: tx.type ?? "deposit",
      label: tx.label ?? "",
      amount: Number(tx.amount ?? 0),
      date: new Date(Number(tx.date ?? Date.now())).toISOString(),
      status: tx.status ?? "completed",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const tx of recentTransactions) {
    if (new Date(tx.date).getTime() >= weekAgo && (tx.type === "return" || tx.type === "deposit")) {
      weeklyChange += tx.amount;
    }
  }

  return res.json({
    walletBalance: balance,
    activeInvestmentsValue,
    weeklyChange,
    totalEarnings,
    activeInvestmentsCount: activeCount,
    completedInvestmentsCount: completedCount,
    recentTransactions: recentTransactions.slice(0, 8),
  });
});

export default router;
