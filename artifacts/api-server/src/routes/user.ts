import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

const DEFAULT_USER_ID = "user_default";

router.get("/profile", async (req, res) => {
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID)).limit(1);
    if (!user.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to get user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile", async (req, res) => {
  try {
    const { displayName, phone, location } = req.body;
    const updated = await db
      .update(usersTable)
      .set({ displayName, phone, location })
      .where(eq(usersTable.id, DEFAULT_USER_ID))
      .returning();
    res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
