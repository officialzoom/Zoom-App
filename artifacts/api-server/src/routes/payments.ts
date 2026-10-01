import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";

const router = Router();

function getSquadConfig() {
  const secretKey = process.env.SQUADCO_SECRET_KEY || "";
  const baseUrl =
    process.env.SQUADCO_BASE_URL ||
    (secretKey.startsWith("sandbox_")
      ? "https://sandbox-api-d.squadco.com"
      : "https://api-d.squadco.com");
  return { secretKey, baseUrl };
}

async function getUserId(firebaseUid: string): Promise<string | null> {
  const user = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.firebaseUid, firebaseUid))
    .limit(1);
  return user[0]?.id ?? null;
}

/**
 * POST /api/wallet/fund — initiate a SquadCo payment for wallet top-up.
 * Returns a checkout_url the frontend redirects to.
 */
router.post("/fund", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { amount } = req.body;
    const naira = Number(amount);
    if (!naira || naira < 100) {
      res.status(400).json({ error: "Minimum top-up is ₦100" });
      return;
    }

    const { secretKey, baseUrl } = getSquadConfig();
    if (!secretKey) {
      res
        .status(503)
        .json({ error: "Payment gateway not configured. Contact admin." });
      return;
    }

    const transactionRef = `ZMNG-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const callbackUrl = `${req.headers.origin || ""}/profile?fund=${transactionRef}`;

    const squadRes = await fetch(`${baseUrl}/transaction/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(naira * 100), // SquadCo expects kobo
        email: user[0].email,
        currency: "NGN",
        initiate_type: "inline",
        transaction_ref: transactionRef,
        callback_url: callbackUrl,
        customer_name: user[0].displayName,
        payment_channels: ["card", "transfer", "ussd", "bank"],
        metadata: { userId, type: "wallet_fund" },
      }),
    });

    const squadData = (await squadRes.json()) as any;

    if (!squadRes.ok || !squadData.data?.checkout_url) {
      req.log.error(
        { squadStatus: squadRes.status, squadData },
        "SquadCo initiate failed",
      );
      res.status(502).json({
        error: squadData.message || "Failed to initiate payment",
      });
      return;
    }

    res.json({
      checkoutUrl: squadData.data.checkout_url,
      transactionRef,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to initiate wallet funding");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/wallet/fund/verify/:transactionRef — verify a SquadCo payment
 * and credit the user's wallet if successful.
 */
router.get("/fund/verify/:transactionRef", requireAuth, async (req, res) => {
  try {
    const userId = await getUserId(req.userId!);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { transactionRef } = req.params;
    const { secretKey, baseUrl } = getSquadConfig();
    if (!secretKey) {
      res.status(503).json({ error: "Payment gateway not configured" });
      return;
    }

    const squadRes = await fetch(
      `${baseUrl}/transaction/verify/${transactionRef}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );

    const squadData = (await squadRes.json()) as any;

    if (!squadRes.ok || !squadData.success) {
      res.status(402).json({
        verified: false,
        error: squadData.message || "Payment verification failed",
      });
      return;
    }

    const txStatus = squadData.data?.transaction_status;
    if (txStatus !== "Success") {
      res.json({
        verified: false,
        status: txStatus || "pending",
        message: "Payment not yet completed",
      });
      return;
    }

    // Amount from SquadCo is in kobo; convert to naira.
    const amountNaira = Number(squadData.data.transaction_amount) / 100;

    // Check for duplicate crediting.
    const existing = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.label, `Wallet Top-up — ${transactionRef}`))
      .limit(1);
    if (existing.length) {
      res.json({ verified: true, alreadyCredited: true, balance: null });
      return;
    }

    const wallet = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .limit(1);
    if (!wallet.length) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    const newBalance = Number(wallet[0].balance) + amountNaira;
    const updated = await db
      .update(walletsTable)
      .set({ balance: String(newBalance) })
      .where(eq(walletsTable.userId, userId))
      .returning();

    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId,
      type: "deposit",
      label: `Wallet Top-up — ${transactionRef}`,
      amount: String(amountNaira),
      date: new Date().toISOString(),
      status: "completed",
    });

    res.json({
      verified: true,
      balance: Number(updated[0].balance),
      amount: amountNaira,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to verify payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
