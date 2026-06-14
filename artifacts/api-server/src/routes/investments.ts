import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, investmentsTable, assetTiersTable, walletsTable, transactionsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router = Router();
const DEFAULT_USER_ID = "user_default";

router.get("/", async (req, res) => {
  try {
    const invs = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, DEFAULT_USER_ID)).orderBy(investmentsTable.createdAt);
    res.json(invs.map(i => ({
      ...i,
      amount: Number(i.amount),
      expectedPayout: Number(i.expectedPayout),
      returnRate: Number(i.returnRate),
    })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get investments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { assetId, amount, lockDays } = req.body;
    const asset = await db.select().from(assetTiersTable).where(eq(assetTiersTable.id, assetId)).limit(1);
    if (!asset.length) { res.status(404).json({ error: "Asset not found" }); return; }

    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEFAULT_USER_ID)).limit(1);
    if (!wallet.length || Number(wallet[0].balance) < Number(amount)) {
      res.status(400).json({ error: "Insufficient wallet balance" });
      return;
    }

    const returnRate = Number(asset[0].returnRate) / 100;
    const expectedPayout = Number(amount) * (1 + returnRate);
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + lockDays * 86400000).toISOString().split("T")[0];

    const inv = await db.insert(investmentsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      assetId,
      assetLabel: asset[0].label,
      amount: String(amount),
      expectedPayout: String(expectedPayout),
      returnRate: String(asset[0].returnRate),
      lockDays,
      status: "active",
      startDate,
      endDate,
    }).returning();

    // Deduct from wallet and update active investments value
    const newBalance = Number(wallet[0].balance) - Number(amount);
    const newActiveValue = Number(wallet[0].activeInvestmentsValue) + Number(amount);
    await db.update(walletsTable).set({
      balance: String(newBalance),
      activeInvestmentsValue: String(newActiveValue),
    }).where(eq(walletsTable.userId, DEFAULT_USER_ID));

    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      type: "invest",
      label: `Invested — ${asset[0].label}`,
      amount: String(-Math.abs(amount)),
      date: new Date().toISOString(),
      status: "active",
    });

    // Update asset slots used
    await db.update(assetTiersTable).set({ slotsUsed: asset[0].slotsUsed + 1 }).where(eq(assetTiersTable.id, assetId));

    const i = inv[0];
    res.status(201).json({
      ...i,
      amount: Number(i.amount),
      expectedPayout: Number(i.expectedPayout),
      returnRate: Number(i.returnRate),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create investment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:investmentId", async (req, res) => {
  try {
    const inv = await db.select().from(investmentsTable).where(eq(investmentsTable.id, req.params.investmentId)).limit(1);
    if (!inv.length) { res.status(404).json({ error: "Investment not found" }); return; }
    const i = inv[0];
    res.json({ ...i, amount: Number(i.amount), expectedPayout: Number(i.expectedPayout), returnRate: Number(i.returnRate) });
  } catch (err) {
    req.log.error({ err }, "Failed to get investment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
