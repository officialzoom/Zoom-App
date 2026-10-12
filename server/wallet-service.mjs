import { createHash } from "node:crypto";
import { getFirebaseAdminApp, getFirebaseAdminAuth, getRealtimeDatabase } from "./firebase-admin.mjs";
import { HttpError, requireNairaAmount, requireSafeId } from "./http.mjs";
import { inspectWalletBalance } from "./wallet-balance.mjs";
import { transactUserRootWithNullRetry } from "./user-root-transaction.mjs";
import { applyWalletMutation } from "./wallet-state.mjs";

const MAX_INVESTMENT = 30_000;
const ASSETS = {
  "car-suv-fleet": { label: "SUV & Jeep Executive Fleet", entryAmount: 10_000, returnRate: 16, durationDays: 180 },
  "car-luxury-fleet": { label: "Executive Luxury SUV Fleet", entryAmount: 20_000, returnRate: 19, durationDays: 270 },
  "bus-city-fleet": { label: "City Route Mini-Bus Fleet", entryAmount: 5_000, returnRate: 20, durationDays: 180 },
  "bus-interstate-fleet": { label: "Interstate Coach Fleet", entryAmount: 15_000, returnRate: 24, durationDays: 270 },
  "truck-pickup-fleet": { label: "Pickup & Delivery Fleet", entryAmount: 8_000, returnRate: 22, durationDays: 210 },
  "truck-heavy-fleet": { label: "Heavy Haulage & Tipper Fleet", entryAmount: 30_000, returnRate: 28, durationDays: 365 },
};

function logUserProfileContext(operation, uid, details = {}) {
  const uidFingerprint = createHash("sha256").update(uid).digest("hex").slice(0, 12);
  const databaseFingerprint = createHash("sha256")
    .update(getFirebaseAdminApp().options.databaseURL ?? "")
    .digest("hex")
    .slice(0, 12);
  console.warn("Firebase user profile diagnostic:", {
    operation,
    uidFingerprint,
    databaseFingerprint,
    ...details,
  });
}

export async function registerUser(user, input) {
  const database = getRealtimeDatabase();
  const uid = user.uid;
  const userRef = database.ref(`users/${uid}`);
  const displayName = String(input.displayName ?? user.name ?? "").trim().slice(0, 100);
  const email = user.email;
  if (!email) throw new HttpError(400, "A verified email address is required.");
  const requestedCode = String(input.referralCode ?? "").trim().toUpperCase();

  const defaults = {
    displayName: displayName || email.split("@")[0],
    email,
    walletBalance: 0,
    kycVerified: false,
    memberSince: new Date().toISOString().slice(0, 10),
    investorLevel: "Bronze",
    referralCount: 0,
    referralCode: uid.slice(0, 8).toUpperCase(),
    referredBy: requestedCode || null,
    banned: false,
    createdAt: Date.now(),
  };
  let created = false;
  const result = await userRef.transaction((current) => {
    if (current) {
      created = false;
      return;
    }
    created = true;
    return defaults;
  }, undefined, false);
  logUserProfileContext("register", uid, {
    created: Boolean(result.committed && created),
    profileExists: Boolean(result.snapshot.val()),
  });
  if (result.committed && created) {
    await database.ref(`wallets/${uid}`).set({ schemaVersion: 1, balance: 0, operations: {} });
  }
  const savedProfile = result.snapshot.val() ?? defaults;
  const savedReferralCode = String(savedProfile.referredBy ?? "").trim().toUpperCase();
  if (savedReferralCode && savedReferralCode !== defaults.referralCode) {
    const referrerSnapshot = await database.ref("users")
      .orderByChild("referralCode")
      .equalTo(savedReferralCode)
      .limitToFirst(1)
      .get();
    const referrerEntry = Object.entries(referrerSnapshot.val() ?? {})[0];
    if (referrerEntry) {
      const [referrerUid] = referrerEntry;
      const referrerRef = database.ref(`users/${referrerUid}`);
      await transactUserRootWithNullRetry(referrerRef, (profile) => {
        if (!profile || profile.referrals?.[uid]) return profile;
        return {
          ...profile,
          referrals: { ...(profile.referrals ?? {}), [uid]: true },
          referralCount: Number(profile.referralCount ?? 0) + 1,
        };
      });
    }
  }
  return { created: Boolean(result.committed && created) };
}

export async function creditUserWallet(admin, input) {
  const uid = requireSafeId(input.userId, "User ID");
  const requestId = requireSafeId(input.requestId, "Credit request ID");
  const amount = requireNairaAmount(input.amount, 1);
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) {
    throw new HttpError(400, "Enter a credit reason between 3 and 500 characters.");
  }

  const transactionId = `admin-credit-${requestId}`;
  const result = await applyWalletMutation(
    uid,
    transactionId,
    amount,
    JSON.stringify({ type: "admin_credit", amount, adminUid: admin.uid, reason }),
    (creditedAt) => ({
      [`users/${uid}/transactions/${transactionId}`]: {
        type: "admin_credit",
        label: "Admin wallet credit",
        amount,
        date: creditedAt,
        status: "completed",
        reason,
        adminUid: admin.uid,
        adminEmail: admin.email,
        requestId,
      },
    }),
  );

  return {
    credited: true,
    alreadyCredited: result.alreadyApplied,
    balance: result.balance,
  };
}

export async function reviewWithdrawal(admin, input) {
  const uid = requireSafeId(input.userId, "User ID");
  const withdrawalId = requireSafeId(input.withdrawalId, "Withdrawal ID");
  const action = input.action;
  if (action !== "approve" && action !== "reject") {
    throw new HttpError(400, "Withdrawal action must be approve or reject.");
  }

  const database = getRealtimeDatabase();
  const withdrawalRef = database.ref(`users/${uid}/withdrawals/${withdrawalId}`);
  const reviewedAt = Date.now();
  let outcome = "missing";
  let withdrawal;
  const result = await transactUserRootWithNullRetry(withdrawalRef, (current) => {
    withdrawal = current;
    if (!withdrawal) {
      outcome = "missing";
      return;
    }

    if (withdrawal.status === (action === "approve" ? "approved" : "rejected")) {
      outcome = "already-reviewed";
      return current;
    }
    if (withdrawal.status !== "pending") {
      outcome = "already-reviewed-differently";
      return;
    }

    const amount = Number(withdrawal.amount);
    if (!Number.isSafeInteger(amount) || amount < 1) {
      outcome = "invalid-amount";
      return;
    }
    outcome = "reviewed";
    return {
      ...withdrawal,
      status: action === "approve" ? "approved" : "rejected",
      reviewedAt,
      reviewedBy: admin.uid,
      reviewedByEmail: admin.email,
    };
  });

  if (outcome === "missing") throw new HttpError(404, "The withdrawal request was not found.");
  if (outcome === "already-reviewed-differently") {
    throw new HttpError(409, "This withdrawal request has already been reviewed.");
  }
  if (outcome === "invalid-amount") throw new HttpError(409, "The withdrawal request has an invalid amount.");
  if (!result.committed && outcome !== "already-reviewed") {
    throw new HttpError(409, "The withdrawal request could not be reviewed.");
  }

  const amount = Number(withdrawal.amount);
  const transactionId = withdrawal.transactionId;
  const transactionRef = transactionId
    ? database.ref(`users/${uid}/transactions/${transactionId}`)
    : null;
  const transactionSnapshot = transactionRef ? await transactionRef.get() : null;
  if (action === "reject") {
    const refundTransactionId = transactionId || `refund-${withdrawalId}`;
    await applyWalletMutation(
      uid,
      `withdrawal-refund-${withdrawalId}`,
      amount,
      JSON.stringify({ type: "withdrawal-refund", withdrawalId, amount }),
      (refundAt) => ({
        [`users/${uid}/transactions/${refundTransactionId}`]: transactionSnapshot?.exists()
          ? { ...transactionSnapshot.val(), status: "rejected" }
          : {
              type: "withdrawal_refund",
              label: "Rejected withdrawal refund",
              amount,
              date: refundAt,
              status: "completed",
              withdrawalId,
            },
      }),
    );
  } else if (transactionSnapshot?.exists()) {
    await transactionRef.update({ status: "completed" });
  }
  return { status: action === "approve" ? "approved" : "rejected", alreadyReviewed: outcome === "already-reviewed" };
}

export async function deleteUserAccount(admin, input) {
  const uid = requireSafeId(input.userId, "User ID");
  if (uid === admin.uid) throw new HttpError(400, "You cannot delete the administrator account.");

  try {
    await getFirebaseAdminAuth().deleteUser(uid);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
  }

  const database = getRealtimeDatabase();
  await Promise.all([
    database.ref(`users/${uid}`).remove(),
    database.ref(`wallets/${uid}`).remove(),
    database.ref(`banned/${uid}`).set(true),
  ]);
  return { deleted: true };
}

export async function listAdminUsers() {
  const database = getRealtimeDatabase();
  const snapshot = await database.ref("users").get();
  const records = snapshot.val();
  if (!records || typeof records !== "object" || Array.isArray(records)) return [];

  const entries = Object.entries(records);
  const walletBalances = new Map();
  for (let index = 0; index < entries.length; index += 100) {
    const batch = entries.slice(index, index + 100);
    const balances = await Promise.all(batch.map(async ([id]) => {
      const walletRef = database.ref(`wallets/${id}`);
      const [balanceSnapshot, schemaSnapshot] = await Promise.all([
        walletRef.child("balance").get(),
        walletRef.child("schemaVersion").get(),
      ]);
      return [id, schemaSnapshot.val() === 1 ? balanceSnapshot.val() : undefined];
    }));
    balances.forEach(([id, balance]) => walletBalances.set(id, balance));
  }

  return entries.map(([id, data]) => {
    const profile = data && typeof data === "object" ? data : {};
    const displayName = profile.displayName || "User";
    const balance = walletBalances.get(id);
    const walletBalance = typeof balance === "number"
      ? inspectWalletBalance(balance)
      : { balance: 0, valid: false };
    return {
      id,
      displayName,
      email: profile.email ?? "",
      banned: Boolean(profile.banned),
      kycVerified: Boolean(profile.kycVerified),
      referralCount: Number(profile.referralCount ?? 0),
      investorLevel: profile.investorLevel ?? "Bronze",
      memberSince: profile.memberSince ?? "—",
      avatarInitials: displayName.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
      wallet: { balance: walletBalance.balance, balanceValid: walletBalance.valid },
    };
  });
}

export async function createInvestment(uid, input) {
  const assetId = requireSafeId(input.assetId, "Asset ID");
  const requestId = requireSafeId(input.requestId, "Investment request ID");
  const tier = ASSETS[assetId];
  if (!tier) throw new HttpError(400, "The selected asset is not available.");
  const amount = requireNairaAmount(input.amount, tier.entryAmount);
  const lockDays = Number(input.lockDays);
  if (!Number.isSafeInteger(lockDays) || lockDays < 1 || lockDays > tier.durationDays) {
    throw new HttpError(400, `Investment duration must be between 1 and ${tier.durationDays} days.`);
  }
  if (amount > MAX_INVESTMENT) throw new HttpError(400, `Maximum investment is ₦${MAX_INVESTMENT.toLocaleString("en-NG")}.`);

  const investmentId = `investment-${createHash("sha256").update(`${uid}:${requestId}`).digest("hex").slice(0, 32)}`;
  const transactionId = `invest-${createHash("sha256").update(`${uid}:${requestId}`).digest("hex").slice(0, 32)}`;
  const prorate = Math.min(lockDays / tier.durationDays, 1);
  const expectedPayout = Math.round(amount * (1 + (tier.returnRate / 100) * prorate));
  await applyWalletMutation(
    uid,
    `investment-${requestId}`,
    -amount,
    JSON.stringify({ type: "investment", assetId, amount, lockDays }),
    (now) => {
      const startDate = new Date(now).toISOString();
      const endDate = new Date(now + lockDays * 24 * 60 * 60 * 1000).toISOString();
      return {
        [`users/${uid}/investments/${investmentId}`]: {
          assetId,
          assetLabel: tier.label,
          amount,
          expectedPayout,
          returnRate: tier.returnRate,
          status: "active",
          startDate,
          endDate,
          lockDays,
          createdAt: now,
        },
        [`users/${uid}/transactions/${transactionId}`]: {
          type: "invest",
          label: `Investment in ${tier.label}`,
          amount,
          date: now,
          status: "active",
        },
      };
    },
  );
  const investment = (await getRealtimeDatabase().ref(`users/${uid}/investments/${investmentId}`).get()).val();
  if (!investment) throw new HttpError(500, "The investment was charged, but its record could not be confirmed.");
  return { id: investmentId, ...investment };
}

export async function createWithdrawal(uid, input) {
  const amount = requireNairaAmount(input.amount);
  const bankId = requireSafeId(input.bankId, "Bank account ID");
  const requestId = requireSafeId(input.requestId, "Withdrawal request ID");
  const database = getRealtimeDatabase();
  const bankSnapshot = await database.ref(`users/${uid}/banks/${bankId}`).get();
  if (!bankSnapshot.exists()) throw new HttpError(404, "Select a saved bank account.");

  const withdrawalId = `withdrawal-${createHash("sha256").update(`${uid}:${requestId}`).digest("hex").slice(0, 32)}`;
  const transactionId = `withdraw-${createHash("sha256").update(`${uid}:${requestId}`).digest("hex").slice(0, 32)}`;
  const profile = await database.ref(`users/${uid}`).get();
  if (!profile.exists()) throw new HttpError(404, "Your account could not be found.");
  if (Number(profile.val()?.referralCount ?? 0) < 5) {
    throw new HttpError(400, "You need at least 5 referrals to withdraw.");
  }
  await applyWalletMutation(
    uid,
    `withdrawal-${requestId}`,
    -amount,
    JSON.stringify({ type: "withdrawal", amount, bankId }),
    (now) => ({
      [`users/${uid}/withdrawals/${withdrawalId}`]: {
        amount,
        bankId,
        status: "pending",
        createdAt: now,
        approvalDeadline: now + 12 * 60 * 60 * 1000,
        transactionId,
      },
      [`users/${uid}/transactions/${transactionId}`]: {
        type: "withdrawal",
        label: "Withdrawal Request",
        amount,
        date: now,
        status: "pending",
        withdrawalId,
      },
    }),
  );
  return { message: "Withdrawal request submitted. Admin has 12 hours to approve." };
}

export async function createDonation(uid, input) {
  const campaignId = requireSafeId(input.campaignId, "Campaign ID");
  const requestId = requireSafeId(input.requestId, "Donation request ID");
  const amount = requireNairaAmount(input.amount, 1);
  const database = getRealtimeDatabase();
  const campaignRef = database.ref(`donationCampaigns/${campaignId}`);
  const requestHash = createHash("sha256").update(`${uid}:${requestId}`).digest("hex");
  const donationId = `don-${requestHash}`;
  const transactionId = `donation-${requestHash}`;
  const userDonationRef = database.ref(`users/${uid}/donations/${donationId}`);
  const previousDonation = await userDonationRef.get();
  if (previousDonation.val()?.campaignId === campaignId
    && Number(previousDonation.val()?.amount) === amount
    && previousDonation.val()?.status === "completed") {
    return { success: true, alreadyCompleted: true };
  }
  const reservation = await applyWalletMutation(
    uid,
    `donation-${requestHash}`,
    -amount,
    JSON.stringify({ type: "donation", campaignId, amount }),
    (createdAt) => ({
      [`users/${uid}/donations/${donationId}`]: { campaignId, amount, createdAt, status: "pending" },
      [`users/${uid}/transactions/${transactionId}`]: {
        type: "donation",
        label: "Cause donation",
        amount,
        date: createdAt,
        status: "pending",
        campaignId,
      },
    }),
  );

  const refundPendingDonation = async () => {
    const [donationSnapshot, transactionSnapshot] = await Promise.all([
      userDonationRef.get(),
      database.ref(`users/${uid}/transactions/${transactionId}`).get(),
    ]);
    const donation = donationSnapshot.val();
    if (donation?.status === "failed") return;
    if (donation?.status !== "pending") {
      throw new HttpError(409, "The donation is no longer eligible for an automatic refund.");
    }
    await applyWalletMutation(
      uid,
      `donation-refund-${requestHash}`,
      amount,
      JSON.stringify({ type: "donation-refund", campaignId, amount }),
      () => ({
        [`users/${uid}/donations/${donationId}`]: { ...donation, status: "failed" },
        [`users/${uid}/transactions/${transactionId}`]: {
          ...(transactionSnapshot.val() ?? {}),
          status: "failed",
        },
      }),
    );
  };

  let campaignOutcome = "missing";
  const campaignResult = await campaignRef.transaction((campaign) => {
    if (!campaign) {
      campaignOutcome = "missing";
      return;
    }
    const existing = campaign.donationRefs?.[donationId];
    if (existing) {
      campaignOutcome = Number(existing.amount) === amount ? "already-counted" : "request-conflict";
      return campaignOutcome === "already-counted" ? campaign : undefined;
    }
    const raisedAmount = Number(campaign.raisedAmount ?? 0);
    if (!Number.isSafeInteger(raisedAmount) || raisedAmount < 0 || !Number.isSafeInteger(raisedAmount + amount)) {
      campaignOutcome = "invalid-total";
      return;
    }
    campaignOutcome = "counted";
    return {
      ...campaign,
      raisedAmount: raisedAmount + amount,
      donationRefs: { ...(campaign.donationRefs ?? {}), [donationId]: { amount } },
    };
  }, undefined, false);

  if (campaignOutcome === "missing") {
    await refundPendingDonation();
    throw new HttpError(404, "This donation campaign is not available; the reserved wallet amount was refunded.");
  }
  if (campaignOutcome === "request-conflict") {
    await refundPendingDonation();
    throw new HttpError(409, "This donation request ID conflicts with another donation; the reserved wallet amount was refunded.");
  }
  if (campaignOutcome === "invalid-total") {
    await refundPendingDonation();
    throw new HttpError(409, "The campaign total cannot safely accept this donation; the reserved wallet amount was refunded.");
  }
  if (!campaignResult.committed && campaignOutcome !== "already-counted") {
    throw new HttpError(409, "The campaign changed before the donation could be recorded.");
  }

  await database.ref().update({
    [`donations/${donationId}`]: {
      campaignId,
      userId: uid,
      amount,
      createdAt: reservation.createdAt,
      status: "completed",
    },
    [`users/${uid}/donations/${donationId}/status`]: "completed",
    [`users/${uid}/transactions/${transactionId}/status`]: "completed",
  });
  return { success: true };
}
