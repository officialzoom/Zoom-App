import { createHash } from "node:crypto";
import { getFirebaseAdminApp, getFirebaseAdminAuth, getRealtimeDatabase } from "./firebase-admin.mjs";
import { HttpError, requireNairaAmount, requireSafeId } from "./http.mjs";
import { inspectWalletBalance } from "./wallet-balance.mjs";

const MAX_INVESTMENT = 30_000;
const ASSETS = {
  "car-suv-fleet": { label: "SUV & Jeep Executive Fleet", entryAmount: 10_000, returnRate: 16, durationDays: 180 },
  "car-luxury-fleet": { label: "Executive Luxury SUV Fleet", entryAmount: 20_000, returnRate: 19, durationDays: 270 },
  "bus-city-fleet": { label: "City Route Mini-Bus Fleet", entryAmount: 5_000, returnRate: 20, durationDays: 180 },
  "bus-interstate-fleet": { label: "Interstate Coach Fleet", entryAmount: 15_000, returnRate: 24, durationDays: 270 },
  "truck-pickup-fleet": { label: "Pickup & Delivery Fleet", entryAmount: 8_000, returnRate: 22, durationDays: 210 },
  "truck-heavy-fleet": { label: "Heavy Haulage & Tipper Fleet", entryAmount: 30_000, returnRate: 28, durationDays: 365 },
};

function recordId(database, path) {
  const key = database.ref(path).push().key;
  if (!key) throw new HttpError(500, "Could not create a record ID.");
  return key;
}

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
      await referrerRef.transaction((profile) => {
        if (!profile || profile.referrals?.[uid]) return profile;
        return {
          ...profile,
          referrals: { ...(profile.referrals ?? {}), [uid]: true },
          referralCount: Number(profile.referralCount ?? 0) + 1,
        };
      }, undefined, false);
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

  const database = getRealtimeDatabase();
  const userRef = database.ref(`users/${uid}`);
  const transactionId = `admin-credit-${requestId}`;
  const creditedAt = Date.now();
  let outcome = "missing";
  let balanceIssue = null;
  let balanceType = null;
  const result = await userRef.transaction((current) => {
    if (!current) {
      outcome = "missing";
      return;
    }

    const existing = current.transactions?.[transactionId];
    if (existing) {
      outcome = existing.type === "admin_credit"
        && Number(existing.amount) === amount
        && existing.adminUid === admin.uid
        && existing.reason === reason
        ? "already-credited"
        : "request-conflict";
      return outcome === "already-credited" ? current : undefined;
    }

    const walletBalance = inspectWalletBalance(current.walletBalance);
    const balance = walletBalance.balance;
    if (!walletBalance.valid || !Number.isSafeInteger(balance + amount)) {
      outcome = "invalid-balance";
      balanceIssue = walletBalance.issue ?? "credit-overflow";
      balanceType = walletBalance.valueType;
      return;
    }

    outcome = "credited";
    return {
      ...current,
      walletBalance: balance + amount,
      transactions: {
        ...(current.transactions ?? {}),
        [transactionId]: {
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
      },
    };
  }, undefined, false);

  if (outcome === "missing") {
    const current = await userRef.get();
    if (!current.exists()) {
      logUserProfileContext("admin-credit-missing", uid);
      throw new HttpError(404, "The selected user profile no longer exists. Refresh the Admin user list and try again.");
    }
    const walletBalance = inspectWalletBalance(current.val()?.walletBalance);
    logUserProfileContext("admin-credit-conflict", uid, {
      outcome: "transaction-saw-missing-but-profile-exists",
      walletBalanceIssue: walletBalance.issue,
      walletBalanceType: walletBalance.valueType,
    });
    throw new HttpError(409, "The user's wallet changed during this request. Refresh the Admin page and try again.");
  }
  if (outcome === "request-conflict") {
    throw new HttpError(409, "This credit request ID was already used for a different wallet credit.");
  }
  if (outcome === "invalid-balance") {
    logUserProfileContext("admin-credit-invalid-balance", uid, {
      walletBalanceIssue: balanceIssue,
      walletBalanceType: balanceType,
    });
    throw new HttpError(409, "The user's wallet balance cannot safely accept this credit.");
  }
  if (!result.committed && outcome !== "already-credited") {
    throw new HttpError(409, "The wallet credit could not be applied.");
  }

  return {
    credited: true,
    alreadyCredited: outcome === "already-credited",
    balance: Number(result.snapshot.val()?.walletBalance ?? 0),
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
  const userRef = database.ref(`users/${uid}`);
  const fallbackRefundTransactionId = action === "reject"
    ? recordId(database, `users/${uid}/transactions`)
    : null;
  const reviewedAt = Date.now();
  let outcome = "missing";
  const result = await userRef.transaction((current) => {
    const withdrawal = current?.withdrawals?.[withdrawalId];
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
    const balance = Number(current.walletBalance ?? 0);
    if (!Number.isSafeInteger(balance) || balance < 0 || (action === "reject" && !Number.isSafeInteger(balance + amount))) {
      outcome = "invalid-balance";
      return;
    }

    const next = {
      ...current,
      withdrawals: {
        ...(current.withdrawals ?? {}),
        [withdrawalId]: {
          ...withdrawal,
          status: action === "approve" ? "approved" : "rejected",
          reviewedAt,
          reviewedBy: admin.uid,
          reviewedByEmail: admin.email,
        },
      },
    };

    const transactions = { ...(current.transactions ?? {}) };
    if (withdrawal.transactionId && transactions[withdrawal.transactionId]) {
      transactions[withdrawal.transactionId] = {
        ...transactions[withdrawal.transactionId],
        status: action === "approve" ? "completed" : "rejected",
      };
    } else if (action === "reject") {
      transactions[fallbackRefundTransactionId] = {
        type: "withdrawal_refund",
        label: "Rejected withdrawal refund",
        amount,
        date: reviewedAt,
        status: "completed",
        withdrawalId,
      };
    }
    next.transactions = transactions;
    if (action === "reject") next.walletBalance = balance + amount;

    outcome = "reviewed";
    return next;
  }, undefined, false);

  if (outcome === "missing") throw new HttpError(404, "The withdrawal request was not found.");
  if (outcome === "already-reviewed-differently") {
    throw new HttpError(409, "This withdrawal request has already been reviewed.");
  }
  if (outcome === "invalid-amount") throw new HttpError(409, "The withdrawal request has an invalid amount.");
  if (outcome === "invalid-balance") throw new HttpError(409, "The wallet balance cannot safely accept this withdrawal review.");
  if (!result.committed && outcome !== "already-reviewed") {
    throw new HttpError(409, "The withdrawal request could not be reviewed.");
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
    database.ref(`banned/${uid}`).set(true),
  ]);
  return { deleted: true };
}

export async function listAdminUsers() {
  const snapshot = await getRealtimeDatabase().ref("users").get();
  const records = snapshot.val();
  if (!records || typeof records !== "object" || Array.isArray(records)) return [];

  return Object.entries(records).map(([id, data]) => {
    const profile = data && typeof data === "object" ? data : {};
    const displayName = profile.displayName || "User";
    const walletBalance = inspectWalletBalance(profile.walletBalance);
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
  const tier = ASSETS[assetId];
  if (!tier) throw new HttpError(400, "The selected asset is not available.");
  const amount = requireNairaAmount(input.amount, tier.entryAmount);
  const lockDays = Number(input.lockDays);
  if (!Number.isSafeInteger(lockDays) || lockDays < 1 || lockDays > tier.durationDays) {
    throw new HttpError(400, `Investment duration must be between 1 and ${tier.durationDays} days.`);
  }
  if (amount > MAX_INVESTMENT) throw new HttpError(400, `Maximum investment is ₦${MAX_INVESTMENT.toLocaleString("en-NG")}.`);

  const database = getRealtimeDatabase();
  const userRef = database.ref(`users/${uid}`);
  const investmentId = recordId(database, `users/${uid}/investments`);
  const transactionId = recordId(database, `users/${uid}/transactions`);
  const now = Date.now();
  const prorate = Math.min(lockDays / tier.durationDays, 1);
  const expectedPayout = Math.round(amount * (1 + (tier.returnRate / 100) * prorate));
  const startDate = new Date(now).toISOString();
  const endDate = new Date(now + lockDays * 24 * 60 * 60 * 1000).toISOString();
  let outcome = "missing";

  const result = await userRef.transaction((current) => {
    if (!current) {
      outcome = "missing";
      return;
    }
    const walletBalance = inspectWalletBalance(current.walletBalance);
    const balance = walletBalance.balance;
    if (!walletBalance.valid) {
      outcome = "invalid-balance";
      return;
    }
    if (amount > balance) {
      outcome = "insufficient";
      return;
    }
    outcome = "created";
    return {
      ...current,
      walletBalance: balance - amount,
      investments: {
        ...(current.investments ?? {}),
        [investmentId]: {
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
      },
      transactions: {
        ...(current.transactions ?? {}),
        [transactionId]: {
          type: "invest",
          label: `Investment in ${tier.label}`,
          amount,
          date: now,
          status: "active",
        },
      },
    };
  }, undefined, false);

  if (!result.committed) {
    if (outcome === "insufficient") throw new HttpError(400, "Insufficient wallet balance. Please add funds first.");
    if (outcome === "invalid-balance") {
      const current = await userRef.get();
      const walletBalance = inspectWalletBalance(current.val()?.walletBalance);
      logUserProfileContext("investment-invalid-balance", uid, {
        walletBalanceIssue: walletBalance.issue,
        walletBalanceType: walletBalance.valueType,
      });
      throw new HttpError(409, "Your wallet balance needs review before you can invest. Contact support.");
    }
    const current = await userRef.get();
    if (current.exists()) {
      const walletBalance = inspectWalletBalance(current.val()?.walletBalance);
      const balance = walletBalance.balance;
      if (!walletBalance.valid) {
        logUserProfileContext("investment-invalid-balance", uid, {
          walletBalanceIssue: walletBalance.issue,
          walletBalanceType: walletBalance.valueType,
        });
        throw new HttpError(409, "Your wallet balance needs review before you can invest. Contact support.");
      }
      if (amount > balance) throw new HttpError(400, "Insufficient wallet balance. Please add funds first.");
      logUserProfileContext("investment-conflict", uid, {
        outcome: "transaction-did-not-commit-with-valid-balance",
      });
      throw new HttpError(409, "Your wallet changed during this request. Refresh the page and try again.");
    }
    logUserProfileContext("investment-missing", uid);
    throw new HttpError(404, "Your account profile is missing. Sign out and sign in again to restore it, then retry.");
  }
  return {
    id: investmentId,
    assetId,
    assetLabel: tier.label,
    amount,
    expectedPayout,
    returnRate: tier.returnRate,
    status: "active",
    startDate,
    endDate,
  };
}

export async function createWithdrawal(uid, input) {
  const amount = requireNairaAmount(input.amount);
  const bankId = requireSafeId(input.bankId, "Bank account ID");
  const database = getRealtimeDatabase();
  const userRef = database.ref(`users/${uid}`);
  const bankSnapshot = await database.ref(`users/${uid}/banks/${bankId}`).get();
  if (!bankSnapshot.exists()) throw new HttpError(404, "Select a saved bank account.");

  const withdrawalId = recordId(database, `users/${uid}/withdrawals`);
  const transactionId = recordId(database, `users/${uid}/transactions`);
  const now = Date.now();
  let outcome = "missing";
  const result = await userRef.transaction((current) => {
    if (!current) {
      outcome = "missing";
      return;
    }
    const balance = Number(current.walletBalance ?? 0);
    if (amount > balance) {
      outcome = "insufficient";
      return;
    }
    if (Number(current.referralCount ?? 0) < 5) {
      outcome = "referrals";
      return;
    }
    outcome = "created";
    return {
      ...current,
      walletBalance: balance - amount,
      withdrawals: {
        ...(current.withdrawals ?? {}),
        [withdrawalId]: {
          amount,
          bankId,
          status: "pending",
          createdAt: now,
          approvalDeadline: now + 12 * 60 * 60 * 1000,
          transactionId,
        },
      },
      transactions: {
        ...(current.transactions ?? {}),
        [transactionId]: {
          type: "withdrawal",
          label: "Withdrawal Request",
          amount,
          date: now,
          status: "pending",
          withdrawalId,
        },
      },
    };
  }, undefined, false);

  if (!result.committed) {
    if (outcome === "insufficient") throw new HttpError(400, "Insufficient balance.");
    if (outcome === "referrals") throw new HttpError(400, "You need at least 5 referrals to withdraw.");
    throw new HttpError(404, "Your account could not be found.");
  }
  return { message: "Withdrawal request submitted. Admin has 12 hours to approve." };
}

export async function createDonation(uid, input) {
  const campaignId = requireSafeId(input.campaignId, "Campaign ID");
  const requestId = requireSafeId(input.requestId, "Donation request ID");
  const amount = requireNairaAmount(input.amount, 1);
  const database = getRealtimeDatabase();
  const campaignRef = database.ref(`donationCampaigns/${campaignId}`);
  const userRef = database.ref(`users/${uid}`);
  const requestHash = createHash("sha256").update(`${uid}:${requestId}`).digest("hex");
  const donationId = `don-${requestHash}`;
  const transactionId = `donation-${requestHash}`;
  const createdAt = Date.now();
  let userOutcome = "missing";
  const userResult = await userRef.transaction((current) => {
    if (!current) {
      userOutcome = "missing";
      return;
    }
    const existing = current.donations?.[donationId];
    if (existing) {
      if (existing.campaignId !== campaignId || Number(existing.amount) !== amount) {
        userOutcome = "request-conflict";
        return;
      }
      if (existing.status === "completed") {
        userOutcome = "already-completed";
        return current;
      }
      if (existing.status !== "failed") {
        userOutcome = "pending";
        return current;
      }
    }
    const balance = Number(current.walletBalance ?? 0);
    if (!Number.isSafeInteger(balance) || balance < 0) {
      userOutcome = "invalid-balance";
      return;
    }
    if (amount > balance) {
      userOutcome = "insufficient";
      return;
    }
    userOutcome = "reserved";
    return {
      ...current,
      walletBalance: balance - amount,
      donations: {
        ...(current.donations ?? {}),
        [donationId]: { campaignId, amount, createdAt, status: "pending" },
      },
      transactions: {
        ...(current.transactions ?? {}),
        [transactionId]: {
          type: "donation",
          label: "Cause donation",
          amount,
          date: createdAt,
          status: "pending",
          campaignId,
        },
      },
    };
  }, undefined, false);

  if (userOutcome === "missing") throw new HttpError(404, "Your account could not be found.");
  if (userOutcome === "request-conflict") throw new HttpError(409, "This donation request ID was already used.");
  if (userOutcome === "invalid-balance") throw new HttpError(409, "The wallet balance cannot safely be used for a donation.");
  if (userOutcome === "insufficient") throw new HttpError(400, "Insufficient wallet balance for this donation.");
  if (userOutcome === "already-completed") return { success: true, alreadyCompleted: true };
  if (!userResult.committed && userOutcome !== "pending") {
    throw new HttpError(409, "The donation could not be reserved from your wallet.");
  }

  const refundPendingDonation = async () => {
    let refundOutcome = "pending";
    const refundResult = await userRef.transaction((current) => {
      const donation = current?.donations?.[donationId];
      if (!donation || donation.status !== "pending") {
        refundOutcome = donation?.status === "failed" ? "refunded" : "not-pending";
        return current;
      }
      const balance = Number(current.walletBalance ?? 0);
      if (!Number.isSafeInteger(balance + amount)) {
        refundOutcome = "invalid-balance";
        return;
      }
      refundOutcome = "refunded";
      return {
        ...current,
        walletBalance: balance + amount,
        donations: { ...(current.donations ?? {}), [donationId]: { ...donation, status: "failed" } },
        transactions: {
          ...(current.transactions ?? {}),
          [transactionId]: { ...current.transactions?.[transactionId], status: "failed" },
        },
      };
    }, undefined, false);
    if (!refundResult.committed && refundOutcome !== "refunded") {
      throw new HttpError(500, "The donation could not be completed or safely refunded.");
    }
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
    [`donations/${donationId}`]: { campaignId, userId: uid, amount, createdAt, status: "completed" },
    [`users/${uid}/donations/${donationId}/status`]: "completed",
    [`users/${uid}/transactions/${transactionId}/status`]: "completed",
  });
  return { success: true };
}
