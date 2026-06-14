import { Router } from "express";
import { eq, desc, sum, count } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable, withdrawalRequestsTable, supportMessagesTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_EMAIL = "officialzoom200@gmail.com";

async function requireAdmin(req: any, res: any, next: any) {
  await requireAuth(req, res, async () => {
    if (req.userEmail !== ADMIN_EMAIL) {
      res.status(403).json({ error: "Admin access only" });
      return;
    }
    next();
  });
}

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
    const wallets = await db.select().from(walletsTable);
    const walletMap = new Map(wallets.map(w => [w.userId, w]));
    res.json(users.map(u => ({
      ...u,
      wallet: walletMap.get(u.id) ? {
        balance: Number(walletMap.get(u.id)!.balance),
        totalEarnings: Number(walletMap.get(u.id)!.totalEarnings),
      } : null,
    })));
  } catch (err) {
    logger.error({ err }, "Failed to get users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/:userId/ban", requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await db.update(usersTable)
      .set({ banned: true, bannedReason: reason || "Violation of terms" })
      .where(eq(usersTable.id, req.params.userId))
      .returning();
    if (!updated.length) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({
      id: randomUUID(),
      userId: req.params.userId,
      type: "ban",
      title: "Account Suspended",
      message: `Your account has been suspended. Reason: ${reason || "Violation of terms"}. Contact admin@zoomng.com for assistance.`,
      read: false,
    });
    res.json(updated[0]);
  } catch (err) {
    logger.error({ err }, "Failed to ban user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/:userId/unban", requireAdmin, async (req, res) => {
  try {
    const updated = await db.update(usersTable)
      .set({ banned: false, bannedReason: null })
      .where(eq(usersTable.id, req.params.userId))
      .returning();
    if (!updated.length) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(notificationsTable).values({
      id: randomUUID(),
      userId: req.params.userId,
      type: "unban",
      title: "Account Restored",
      message: "Your account has been restored. Welcome back to Zoom NG!",
      read: false,
    });
    res.json(updated[0]);
  } catch (err) {
    logger.error({ err }, "Failed to unban user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:userId", requireAdmin, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.params.userId));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const userCount = await db.select({ count: count() }).from(usersTable);
    const totalEarnings = await db.select({ total: sum(walletsTable.totalEarnings) }).from(walletsTable);
    const totalDeposits = await db.select({ total: sum(transactionsTable.amount) })
      .from(transactionsTable).where(eq(transactionsTable.type, "deposit"));
    const pendingWithdrawals = await db.select().from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.status, "pending"));

    res.json({
      totalUsers: userCount[0]?.count ?? 0,
      allTimeEarnings: Number(totalEarnings[0]?.total ?? 0),
      totalDeposits: Number(totalDeposits[0]?.total ?? 0),
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsAmount: pendingWithdrawals.reduce((s, w) => s + Number(w.amount), 0),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/withdrawals", requireAdmin, async (req, res) => {
  try {
    const requests = await db.select().from(withdrawalRequestsTable).orderBy(desc(withdrawalRequestsTable.createdAt));
    res.json(requests.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (err) {
    logger.error({ err }, "Failed to get withdrawals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/withdrawals/:id/approve", requireAdmin, async (req, res) => {
  try {
    const request = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, req.params.id)).limit(1);
    if (!request.length) { res.status(404).json({ error: "Request not found" }); return; }
    const wr = request[0];

    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, wr.userId)).limit(1);
    if (wallet.length && Number(wallet[0].balance) >= Number(wr.amount)) {
      await db.update(walletsTable)
        .set({ balance: String(Number(wallet[0].balance) - Number(wr.amount)) })
        .where(eq(walletsTable.userId, wr.userId));
      await db.insert(transactionsTable).values({
        id: randomUUID(), userId: wr.userId, type: "withdrawal",
        label: `Withdrawal to ${wr.bankName} — ${wr.accountNumber}`,
        amount: String(-Math.abs(Number(wr.amount))), date: new Date().toISOString(), status: "completed",
      });
    }

    const updated = await db.update(withdrawalRequestsTable)
      .set({ status: "approved", adminNote: req.body.note })
      .where(eq(withdrawalRequestsTable.id, req.params.id)).returning();

    await db.insert(notificationsTable).values({
      id: randomUUID(), userId: wr.userId, type: "withdrawal",
      title: "Withdrawal Approved",
      message: `Your withdrawal of ₦${Number(wr.amount).toLocaleString()} has been approved and processed.`,
      read: false,
    });

    res.json({ ...updated[0], amount: Number(updated[0].amount) });
  } catch (err) {
    logger.error({ err }, "Failed to approve withdrawal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/withdrawals/:id/reject", requireAdmin, async (req, res) => {
  try {
    const request = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, req.params.id)).limit(1);
    if (!request.length) { res.status(404).json({ error: "Request not found" }); return; }
    const wr = request[0];
    const updated = await db.update(withdrawalRequestsTable)
      .set({ status: "rejected", adminNote: req.body.note })
      .where(eq(withdrawalRequestsTable.id, req.params.id)).returning();

    await db.insert(notificationsTable).values({
      id: randomUUID(), userId: wr.userId, type: "withdrawal",
      title: "Withdrawal Rejected",
      message: `Your withdrawal request of ₦${Number(wr.amount).toLocaleString()} was not approved. Reason: ${req.body.note || "Under review"}. Contact support for details.`,
      read: false,
    });

    res.json({ ...updated[0], amount: Number(updated[0].amount) });
  } catch (err) {
    logger.error({ err }, "Failed to reject withdrawal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/support", requireAdmin, async (req, res) => {
  try {
    const messages = await db.select().from(supportMessagesTable).orderBy(desc(supportMessagesTable.createdAt));
    res.json(messages);
  } catch (err) {
    logger.error({ err }, "Failed to get support messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/support/:id/reply", requireAdmin, async (req, res) => {
  try {
    const { reply } = req.body;
    const msg = await db.select().from(supportMessagesTable).where(eq(supportMessagesTable.id, req.params.id)).limit(1);
    if (!msg.length) { res.status(404).json({ error: "Message not found" }); return; }
    const updated = await db.update(supportMessagesTable)
      .set({ adminReply: reply, status: "resolved" })
      .where(eq(supportMessagesTable.id, req.params.id)).returning();

    await db.insert(notificationsTable).values({
      id: randomUUID(), userId: msg[0].userId, type: "support",
      title: "Support Reply",
      message: `Admin replied to your message: "${reply}"`,
      read: false,
    });

    res.json(updated[0]);
  } catch (err) {
    logger.error({ err }, "Failed to reply to support message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
