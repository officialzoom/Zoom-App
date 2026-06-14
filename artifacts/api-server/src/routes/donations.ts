import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, donationCampaignsTable, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";

const router = Router();

async function getUserId(firebaseUid: string): Promise<string | null> {
  const user = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
  return user[0]?.id ?? null;
}

router.get("/", async (req, res) => {
  try {
    const campaigns = await db.select().from(donationCampaignsTable).orderBy(donationCampaignsTable.createdAt);
    res.json(campaigns.map(c => ({ ...c, targetAmount: Number(c.targetAmount), raisedAmount: Number(c.raisedAmount) })));
  } catch (err) {
    req.log.error({ err }, "Failed to get campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:campaignId/donate", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const { campaignId } = req.params;
    const { amount } = req.body;
    const campaign = await db.select().from(donationCampaignsTable).where(eq(donationCampaignsTable.id, campaignId)).limit(1);
    if (!campaign.length) { res.status(404).json({ error: "Campaign not found" }); return; }

    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallet.length || Number(wallet[0].balance) < Number(amount)) {
      res.status(400).json({ error: "Insufficient balance" }); return;
    }

    const newRaised = Number(campaign[0].raisedAmount) + Number(amount);
    const updated = await db.update(donationCampaignsTable)
      .set({ raisedAmount: String(newRaised) }).where(eq(donationCampaignsTable.id, campaignId)).returning();

    await db.update(walletsTable).set({ balance: String(Number(wallet[0].balance) - Number(amount)) }).where(eq(walletsTable.userId, userId));
    await db.insert(transactionsTable).values({
      id: randomUUID(), userId, type: "withdrawal",
      label: `Donation — ${campaign[0].title}`,
      amount: String(-Math.abs(amount)), date: new Date().toISOString(), status: "completed",
    });

    const c = updated[0];
    res.json({ ...c, targetAmount: Number(c.targetAmount), raisedAmount: Number(c.raisedAmount) });
  } catch (err) {
    req.log.error({ err }, "Failed to process donation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
