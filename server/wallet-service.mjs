import { getRealtimeDatabase } from "./firebase-admin.mjs";
import { HttpError, requireNairaAmount, requireSafeId } from "./http.mjs";

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
  const savedProfile = result.snapshot.val() ?? defaults;
  const savedReferralCode = String(savedProfile.referredBy ?? "").trim().toUpperCase();
  if (savedReferralCode && savedReferralCode !== defaults.referralCode) {
    const users = (await database.ref("users").get()).val() ?? {};
    const referrerEntry = Object.entries(users).find(([, profile]) => profile?.referralCode === savedReferralCode);
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
    const balance = Number(current.walletBalance ?? 0);
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
    throw new HttpError(404, "Your account could not be found.");
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
  const amount = requireNairaAmount(input.amount, 1);
  const database = getRealtimeDatabase();
  const campaignRef = database.ref(`donationCampaigns/${campaignId}`);
  const campaignSnapshot = await campaignRef.get();
  if (!campaignSnapshot.exists()) throw new HttpError(404, "This donation campaign is not available.");

  const donationRef = database.ref("donations").push();
  if (!donationRef.key) throw new HttpError(500, "Could not create the donation record.");
  const donation = { campaignId, userId: uid, amount, createdAt: Date.now(), status: "pending" };
  await donationRef.set(donation);
  const result = await campaignRef.transaction((campaign) => {
    if (!campaign) return;
    return { ...campaign, raisedAmount: Number(campaign.raisedAmount ?? 0) + amount };
  }, undefined, false);
  if (!result.committed) {
    await donationRef.update({ status: "failed" });
    throw new HttpError(409, "The campaign changed before the donation could be recorded.");
  }
  await donationRef.update({ status: "completed" });
  return { success: true };
}
