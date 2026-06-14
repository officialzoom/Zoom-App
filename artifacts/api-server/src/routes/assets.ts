import { Router } from "express";
import { db, assetTiersTable } from "@workspace/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const assets = await db.select().from(assetTiersTable).orderBy(assetTiersTable.entryAmount);
    res.json(assets.map(a => ({
      ...a,
      entryAmount: Number(a.entryAmount),
      returnRate: Number(a.returnRate),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get assets");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
