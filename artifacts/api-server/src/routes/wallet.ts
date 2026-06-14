import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, walletsTable, transactionsTable, bankAccountsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router = Router();
const DEFAULT_USER_ID = "user_default";

router.get("/", async (req, res) => {
  try {
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEFAULT_USER_ID)).limit(1);
    if (!wallet.length) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
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

router.post("/topup", async (req, res) => {
  try {
    const { amount } = req.body;
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEFAULT_USER_ID)).limit(1);
    if (!wallet.length) { res.status(404).json({ error: "Wallet not found" }); return; }
    const newBalance = Number(wallet[0].balance) + Number(amount);
    const updated = await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.userId, DEFAULT_USER_ID)).returning();
    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      type: "deposit",
      label: "Wallet Top-up",
      amount: String(amount),
      date: new Date().toISOString(),
      status: "completed",
    });
    const w = updated[0];
    res.json({ balance: Number(w.balance), activeInvestmentsValue: Number(w.activeInvestmentsValue), totalEarnings: Number(w.totalEarnings), weeklyChange: Number(w.weeklyChange) });
  } catch (err) {
    req.log.error({ err }, "Failed to top up wallet");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/withdraw", async (req, res) => {
  try {
    const { amount, bankId } = req.body;
    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEFAULT_USER_ID)).limit(1);
    if (!wallet.length) { res.status(404).json({ error: "Wallet not found" }); return; }
    if (Number(wallet[0].balance) < Number(amount)) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    const newBalance = Number(wallet[0].balance) - Number(amount);
    const updated = await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.userId, DEFAULT_USER_ID)).returning();
    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      type: "withdrawal",
      label: "Wallet Withdrawal",
      amount: String(-Math.abs(amount)),
      date: new Date().toISOString(),
      status: "completed",
    });
    const w = updated[0];
    res.json({ balance: Number(w.balance), activeInvestmentsValue: Number(w.activeInvestmentsValue), totalEarnings: Number(w.totalEarnings), weeklyChange: Number(w.weeklyChange) });
  } catch (err) {
    req.log.error({ err }, "Failed to withdraw");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, DEFAULT_USER_ID)).orderBy(transactionsTable.createdAt);
    res.json(txns.map(t => ({ ...t, amount: Number(t.amount) })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/banks", async (req, res) => {
  try {
    const banks = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.userId, DEFAULT_USER_ID));
    res.json(banks);
  } catch (err) {
    req.log.error({ err }, "Failed to get banks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/banks", async (req, res) => {
  try {
    const { bankName, accountName, accountNumber } = req.body;
    const logoMap: Record<string, { logo: string; color: string; bgColor: string }> = {
      "GTBank": { logo: "GT", color: "#f97316", bgColor: "#fff7ed" },
      "Access Bank": { logo: "AC", color: "#dc2626", bgColor: "#fef2f2" },
      "First Bank": { logo: "FB", color: "#1d4ed8", bgColor: "#eff6ff" },
      "Zenith Bank": { logo: "ZB", color: "#7c3aed", bgColor: "#f5f3ff" },
      "UBA": { logo: "UB", color: "#b45309", bgColor: "#fffbeb" },
    };
    const meta = logoMap[bankName] || { logo: bankName.slice(0, 2).toUpperCase(), color: "#6B7280", bgColor: "#F3F4F6" };
    const bank = await db.insert(bankAccountsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      bankName,
      accountName,
      accountNumber,
      ...meta,
    }).returning();
    res.status(201).json(bank[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to add bank");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/banks/:bankId", async (req, res) => {
  try {
    await db.delete(bankAccountsTable).where(eq(bankAccountsTable.id, req.params.bankId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to remove bank");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
