import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, walletsTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const router = Router();

function generateReferralCode(name: string): string {
  const prefix = name.replace(/\s+/g, "").slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

router.post("/register", requireAuth, async (req, res) => {
  try {
    const { displayName, email, referralCode } = req.body;
    const firebaseUid = req.userId!;

    const existing = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
    if (existing.length) {
      res.json(existing[0]);
      return;
    }

    const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const userReferralCode = generateReferralCode(displayName);

    let referredByUser: typeof usersTable.$inferSelect | null = null;
    if (referralCode) {
      const referrer = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
      if (referrer.length) referredByUser = referrer[0];
    }

    const user = await db.insert(usersTable).values({
      id: firebaseUid,
      firebaseUid,
      displayName,
      email,
      avatarInitials: initials,
      memberSince: new Date().toISOString().split("T")[0],
      referralCode: userReferralCode,
      referredBy: referredByUser?.id ?? null,
    }).returning();

    await db.insert(walletsTable).values({
      id: randomUUID(),
      userId: firebaseUid,
      balance: "0",
      activeInvestmentsValue: "0",
      totalEarnings: "0",
      weeklyChange: "0",
    });

    if (referredByUser) {
      await db.update(usersTable)
        .set({ referralCount: sql`${usersTable.referralCount} + 1` })
        .where(eq(usersTable.id, referredByUser.id));
      await db.insert(notificationsTable).values({
        id: randomUUID(),
        userId: referredByUser.id,
        type: "referral",
        title: "New Referral!",
        message: `${displayName} joined Zoom NG using your referral link!`,
        read: false,
      });
    }

    res.status(201).json(user[0]);
  } catch (err) {
    logger.error({ err }, "Failed to register user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, req.userId!)).limit(1);
    if (!user.length) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to get user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { displayName, phone, location } = req.body;
    const user = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, req.userId!)).limit(1);
    if (!user.length) { res.status(404).json({ error: "User not found" }); return; }
    const updated = await db.update(usersTable)
      .set({ displayName, phone, location })
      .where(eq(usersTable.id, user[0].id))
      .returning();
    res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, req.userId!)).limit(1);
    if (!user.length) { res.status(404).json({ error: "User not found" }); return; }
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, user[0].id))
      .orderBy(notificationsTable.createdAt);
    res.json(notifs.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
