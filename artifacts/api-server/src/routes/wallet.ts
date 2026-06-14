import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, walletsTable, transactionsTable, bankAccountsTable, usersTable, withdrawalRequestsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";

const router = Router();

async function getUserId(firebaseUid: string): Promise<string | null> {
  const user = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
  return user[0]?.id ?? null;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet.length) { res.status(404).json({ error: "Wallet not found" }); return; }
    const w = wallet[0];
    res.json({
      balance: Number(w.balance),
      activeInvestmentsValue: Number(w.activeInvestmentsValue),
      totalEarnings: Number(w.totalEarnings),
      weeklyChange: Number(w.weeklyChange),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/topup", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const { amount } = req.body;
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet.length) { res.status(404).json({ error: "Wallet not found" }); return; }
    const newBalance = Number(wallet[0].balance) + Number(amount);
    const updated = await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.userId, userId)).returning();
    await db.insert(transactionsTable).values({
      id: randomUUID(), userId, type: "deposit", label: "Wallet Top-up",
      amount: String(amount), date: new Date().toISOString(), status: "completed",
    });
    const w = updated[0];
    res.json({ balance: Number(w.balance), activeInvestmentsValue: Number(w.activeInvestmentsValue), totalEarnings: Number(w.totalEarnings), weeklyChange: Number(w.weeklyChange) });
  } catch (err) {
    req.log.error({ err }, "Failed to top up wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/withdraw", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user.length) { res.status(404).json({ error: "User not found" }); return; }

    if (user[0].referralCount < 5) {
      res.status(403).json({ error: `You need ${5 - user[0].referralCount} more referral(s) to unlock withdrawals.`, referralsNeeded: 5 - user[0].referralCount });
      return;
    }

    const { amount, bankId } = req.body;
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet.length) { res.status(404).json({ error: "Wallet not found" }); return; }
    if (Number(wallet[0].balance) < Number(amount)) { res.status(400).json({ error: "Insufficient balance" }); return; }

    const bank = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.id, bankId)).limit(1);
    if (!bank.length) { res.status(404).json({ error: "Bank account not found" }); return; }

    const request = await db.insert(withdrawalRequestsTable).values({
      id: randomUUID(),
      userId,
      userEmail: user[0].email,
      userName: user[0].displayName,
      amount: String(amount),
      bankId,
      bankName: bank[0].bankName,
      accountNumber: bank[0].accountNumber,
      accountName: bank[0].accountName,
      status: "pending",
    }).returning();

    res.status(201).json({ message: "Withdrawal request submitted for admin approval", request: request[0] });
  } catch (err) {
    req.log.error({ err }, "Failed to withdraw");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(transactionsTable.createdAt);
    res.json(txns.map(t => ({ ...t, amount: Number(t.amount) })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/banks", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const banks = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.userId, userId));
    res.json(banks);
  } catch (err) {
    req.log.error({ err }, "Failed to get banks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/banks", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const { bankName, accountName, accountNumber } = req.body;
    const logoMap: Record<string, { logo: string; color: string; bgColor: string }> = {
      "GTBank": { logo: "GT", color: "#f97316", bgColor: "#fff7ed" },
      "Access Bank": { logo: "AC", color: "#dc2626", bgColor: "#fef2f2" },
      "First Bank": { logo: "FB", color: "#1d4ed8", bgColor: "#eff6ff" },
      "Zenith Bank": { logo: "ZB", color: "#7c3aed", bgColor: "#f5f3ff" },
      "UBA": { logo: "UB", color: "#b45309", bgColor: "#fffbeb" },
      "Kuda Bank": { logo: "KD", color: "#7c3aed", bgColor: "#f5f3ff" },
      "Opay": { logo: "OP", color: "#16a34a", bgColor: "#f0fdf4" },
      "Moniepoint": { logo: "MP", color: "#0369a1", bgColor: "#f0f9ff" },
    };
    const meta = logoMap[bankName] || { logo: bankName.slice(0, 2).toUpperCase(), color: "#6B7280", bgColor: "#F3F4F6" };
    const bank = await db.insert(bankAccountsTable).values({
      id: randomUUID(), userId, bankName, accountName, accountNumber, ...meta,
    }).returning();
    res.status(201).json(bank[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to add bank");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/banks/:bankId", requireAuth, async (req, res) => {
  try {
    await db.delete(bankAccountsTable).where(eq(bankAccountsTable.id, req.params.bankId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to remove bank");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
