import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, adsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router = Router();
const DEFAULT_USER_ID = "user_default";

router.get("/", async (req, res) => {
  try {
    const ads = await db.select().from(adsTable).where(eq(adsTable.userId, DEFAULT_USER_ID)).orderBy(adsTable.createdAt);
    res.json(ads.map(a => ({ ...a, cost: Number(a.cost) })).reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get ads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, targetUrl, audience, duration, cost } = req.body;
    const ad = await db.insert(adsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      title,
      targetUrl,
      audience,
      duration,
      cost: String(cost),
      status: "pending",
      submittedAt: new Date().toISOString(),
    }).returning();
    res.status(201).json({ ...ad[0], cost: Number(ad[0].cost) });
  } catch (err) {
    req.log.error({ err }, "Failed to submit ad");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
