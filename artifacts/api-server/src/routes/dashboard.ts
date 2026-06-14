import { Router } from "express";
import { eq, count } from "drizzle-orm";
import { db, walletsTable, investmentsTable, transactionsTable } from "@workspace/db";

const router = Router();
const DEFAULT_USER_ID = "user_default";

router.get("/summary", async (req, res) => {
  try {
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEFAULT_USER_ID)).limit(1);
    const w = wallet[0] ?? { balance: 0, activeInvestmentsValue: 0, totalEarnings: 0, weeklyChange: 0 };

    const allInvestments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, DEFAULT_USER_ID));
    const activeCount = allInvestments.filter(i => i.status === "active").length;
    const completedCount = allInvestments.filter(i => i.status === "completed").length;

    const recentTxns = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, DEFAULT_USER_ID))
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
