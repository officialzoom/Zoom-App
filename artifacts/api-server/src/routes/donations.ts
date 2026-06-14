import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, donationCampaignsTable, walletsTable, transactionsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router = Router();
const DEFAULT_USER_ID = "user_default";

router.get("/", async (req, res) => {
  try {
    const campaigns = await db.select().from(donationCampaignsTable).orderBy(donationCampaignsTable.createdAt);
    res.json(campaigns.map(c => ({ ...c, targetAmount: Number(c.targetAmount), raisedAmount: Number(c.raisedAmount) })));
  } catch (err) {
    req.log.error({ err }, "Failed to get campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:campaignId/donate", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { amount } = req.body;
    const campaign = await db.select().from(donationCampaignsTable).where(eq(donationCampaignsTable.id, campaignId)).limit(1);
    if (!campaign.length) { res.status(404).json({ error: "Campaign not found" }); return; }

    const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, DEFAULT_USER_ID)).limit(1);
    if (!wallet.length || Number(wallet[0].balance) < Number(amount)) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const newRaised = Number(campaign[0].raisedAmount) + Number(amount);
    const updated = await db.update(donationCampaignsTable)
      .set({ raisedAmount: String(newRaised) })
      .where(eq(donationCampaignsTable.id, campaignId))
      .returning();

    const newBalance = Number(wallet[0].balance) - Number(amount);
    await db.update(walletsTable).set({ balance: String(newBalance) }).where(eq(walletsTable.userId, DEFAULT_USER_ID));

    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      type: "withdrawal",
      label: `Donation — ${campaign[0].title}`,
      amount: String(-Math.abs(amount)),
      date: new Date().toISOString(),
      status: "completed",
    });

    const c = updated[0];
    res.json({ ...c, targetAmount: Number(c.targetAmount), raisedAmount: Number(c.raisedAmount) });
  } catch (err) {
    req.log.error({ err }, "Failed to process donation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
