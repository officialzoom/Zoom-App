import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, walletsTable, investmentsTable, transactionsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

async function getUserId(firebaseUid: string): Promise<string | null> {
  const user = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
  return user[0]?.id ?? null;
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    const w = wallet[0] ?? { balance: 0, activeInvestmentsValue: 0, totalEarnings: 0, weeklyChange: 0 };

    const allInvestments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
    const activeCount = allInvestments.filter(i => i.status === "active").length;
    const completedCount = allInvestments.filter(i => i.status === "completed").length;

    const recentTxns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
      .orderBy(transactionsTable.createdAt)
      .limit(5);

    res.json({
      walletBalance: Number(w.balance),
      activeInvestmentsValue: Number(w.activeInvestmentsValue),
      weeklyChange: Number(w.weeklyChange),
      totalEarnings: Number(w.totalEarnings),
      activeInvestmentsCount: activeCount,
      completedInvestmentsCount: completedCount,
      recentTransactions: recentTxns.reverse().map(t => ({ ...t, amount: Number(t.amount) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
