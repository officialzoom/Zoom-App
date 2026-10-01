import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";
import admin from "firebase-admin";

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

/**
 * POST /api/wallet/fund — initiate a SquadCo payment for wallet top-up.
 */
router.post("/fund", requireAuth, async (req, res) => {
  try {
    const userId = req.userId; 
    if (!userId) {
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
      res.status(503).json({ error: "Payment gateway not configured. Contact admin." });
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
        amount: Math.round(naira * 100), 
        email: req.userEmail || "customer@example.com",
        currency: "NGN",
        initiate_type: "inline",
        transaction_ref: transactionRef,
        callback_url: callbackUrl,
        customer_name: "User",
        payment_channels: ["card", "transfer", "ussd", "bank"],
        metadata: { userId, type: "wallet_fund" },
      }),
    });

    const squadData = (await squadRes.json()) as any;

    if (!squadRes.ok || !squadData.data?.checkout_url) {
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
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/wallet/fund/verify/:transactionRef — verify a SquadCo payment.
 */
router.get("/fund/verify/:transactionRef", requireAuth, async (req, res) => {
  try {
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

    const amountNaira = Number(squadData.data.transaction_amount) / 100;
    const userId = req.userId;

    if (userId) {
      const walletRef = admin.firestore().collection("wallets").doc(userId);
      await admin.firestore().runTransaction(async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const currentBalance = walletDoc.data()?.balance || 0;
        transaction.set(walletRef, { 
          balance: currentBalance + amountNaira 
        }, { merge: true });
      });
    }

    res.json({
      verified: true,
      amount: amountNaira,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/wallet/banks — get user's linked bank accounts
 */
router.get("/banks", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(404).json({ error: "User not found" });

    const snapshot = await admin.firestore().collection("banks")
      .where("userId", "==", userId)
      .get();
    
    const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(banks);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/wallet/banks — add a new bank account
 */
router.post("/banks", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(404).json({ error: "User not found" });

    const bankData = {
      ...req.body,
      userId,
      createdAt: new Date().toISOString(),
    };

    const docRef = await admin.firestore().collection("banks").add(bankData);
    res.status(201).json({ id: docRef.id, ...bankData });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/wallet/banks/:bankId — remove a bank account
 */
router.delete("/banks/:bankId", requireAuth, async (req, res) => {
  try {
    const { bankId } = req.params;
    const userId = req.userId;

    const docRef = admin.firestore().collection("banks").doc(bankId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized to remove this account" });
    }

    await docRef.delete();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
