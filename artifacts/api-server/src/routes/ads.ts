import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, adsTable, usersTable } from "@workspace/db";
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
    const ads = await db.select().from(adsTable).where(eq(adsTable.userId, userId)).orderBy(adsTable.createdAt);
    res.json(ads.map(a => ({ ...a, cost: Number(a.cost) })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get ads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }
    const { title, targetUrl, audience, duration, cost } = req.body;
    const ad = await db.insert(adsTable).values({
      id: randomUUID(), userId, title, targetUrl, audience, duration,
      cost: String(cost), status: "pending", submittedAt: new Date().toISOString(),
    }).returning();
    res.status(201).json({ ...ad[0], cost: Number(ad[0].cost) });
  } catch (err) {
    req.log.error({ err }, "Failed to submit ad");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
