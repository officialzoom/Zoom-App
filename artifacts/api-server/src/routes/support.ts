import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, supportMessagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";

const router = Router();

async function getUser(firebaseUid: string) {
  const user = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
  return user[0] ?? null;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const { message } = req.body;
    const msg = await db.insert(supportMessagesTable).values({
      id: randomUUID(),
      userId: user.id,
      userEmail: user.email,
      userName: user.displayName,
      message,
      status: "open",
    }).returning();
    res.status(201).json(msg[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to submit support message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const messages = await db.select().from(supportMessagesTable).where(eq(supportMessagesTable.userId, user.id));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Failed to get support messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
