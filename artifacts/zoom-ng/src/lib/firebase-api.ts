/**
 * Firebase Firestore data layer — replaces the Express API client.
 * All data operations go directly to Firestore, keyed by the current user's UID.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types (mirrors the old API schemas)
// ---------------------------------------------------------------------------
export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  location?: string;
  avatarInitials?: string;
  kycVerified: boolean;
  memberSince: string;
  investorLevel: string;
  referralCount: number;
  referralCode?: string;
}

export interface Wallet {
  balance: number;
  activeInvestmentsValue: number;
  totalEarnings: number;
  weeklyChange: number;
}

export interface Transaction {
  id: string;
  type: "return" | "deposit" | "invest" | "withdrawal";
  label: string;
  amount: number;
  date: string;
  status: "completed" | "active" | "pending";
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  logo: string;
  color: string;
  bgColor: string;
}

export interface AssetTier {
  id: string;
  label: string;
  category: string;
  entryAmount: number;
  maxAmount?: number;
  returnRate: number;
  durationDays: number;
  slotsUsed: number;
  totalSlots: number;
  tag: string;
  description: string;
  color: string;
  bgColor: string;
}

export interface Investment {
  id: string;
  assetId: string;
  assetLabel: string;
  amount: number;
  expectedPayout: number;
  returnRate: number;
  status: "active" | "completed" | "pending";
  startDate: string;
  endDate: string;
}

export interface DashboardSummary {
  walletBalance: number;
  activeInvestmentsValue: number;
  weeklyChange: number;
  totalEarnings: number;
  activeInvestmentsCount: number;
  completedInvestmentsCount: number;
  recentTransactions: Transaction[];
}

export interface Ad {
  id: string;
  title: string;
  audience: string;
  duration: string;
  cost: number;
  status: "pending" | "active" | "completed";
  submittedAt: string;
}

export interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Static asset tiers (same data the Express backend served)
// ---------------------------------------------------------------------------
const MAX_INVESTMENT = 30_000;

const ASSET_TIERS: AssetTier[] = [
  {
    id: "car-suv-fleet",
    label: "SUV & Jeep Executive Fleet",
    category: "car",
    entryAmount: 10000,
    returnRate: 16,
    durationDays: 180,
    slotsUsed: 2,
    totalSlots: 10,
    tag: "Executive",
    description: "Ride-hailing and corporate hire fleet of Highlander, Prado, Lexus RX and Pathfinder units for Lagos & Abuja.",
    color: "#10b981",
    bgColor: "#ecfdf5",
  },
  {
    id: "car-luxury-fleet",
    label: "Executive Luxury SUV Fleet",
    category: "car",
    entryAmount: 20000,
    returnRate: 19,
    durationDays: 270,
    slotsUsed: 4,
    totalSlots: 8,
    tag: "Premium",
    description: "Land Cruiser and Range Rover units for airport transfers and executive chauffeured mobility.",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  {
    id: "bus-city-fleet",
    label: "City Route Mini-Bus Fleet",
    category: "bus",
    entryAmount: 5000,
    returnRate: 20,
    durationDays: 180,
    slotsUsed: 3,
    totalSlots: 12,
    tag: "High Yield",
    description: "HiAce, Ford Transit and Hiace White units running busy intra-city routes and last-mile passenger transport.",
    color: "#f59e0b",
    bgColor: "#fffbeb",
  },
  {
    id: "bus-interstate-fleet",
    label: "Interstate Coach Fleet",
    category: "bus",
    entryAmount: 15000,
    returnRate: 24,
    durationDays: 270,
    slotsUsed: 2,
    totalSlots: 8,
    tag: "Enterprise",
    description: "Toyota Coaster, Marcopolo and luxury interstate coaches serving Lagos–Ibadan and Abuja–Kaduna corridors.",
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  {
    id: "truck-pickup-fleet",
    label: "Pickup & Delivery Fleet",
    category: "truck",
    entryAmount: 8000,
    returnRate: 22,
    durationDays: 210,
    slotsUsed: 2,
    totalSlots: 10,
    tag: "Logistics",
    description: "Hilux, Ford Ranger and Mitsubishi Canter units for delivery, distribution and construction-site movement.",
    color: "#ec4899",
    bgColor: "#fdf2f8",
  },
  {
    id: "truck-heavy-fleet",
    label: "Heavy Haulage & Tipper Fleet",
    category: "truck",
    entryAmount: 30000,
    returnRate: 28,
    durationDays: 365,
    slotsUsed: 3,
    totalSlots: 8,
    tag: "Heavy Duty",
    description: "Howo, Mack Granite, Mercedes Actros and DAF tippers and trailers for long-haul and construction haulage.",
    color: "#f43f5e",
    bgColor: "#fff1f2",
  },
].map(t => ({ ...t, maxAmount: MAX_INVESTMENT }));

const ASSET_TIER_MAP: Record<string, { label: string; returnRate: number; durationDays: number; entryAmount: number }> = Object.fromEntries(
  ASSET_TIERS.map(t => [t.id, { label: t.label, returnRate: t.returnRate, durationDays: t.durationDays, entryAmount: t.entryAmount }])
);

// ---------------------------------------------------------------------------
// Query keys (for cache invalidation — same names as the old API client)
// ---------------------------------------------------------------------------
export const getGetAssetsQueryKey = () => ["assets"] as const;
export const getGetWalletQueryKey = () => ["wallet", auth?.currentUser?.uid ?? null] as const;
export const getGetDashboardSummaryQueryKey = () => ["dashboard-summary", auth?.currentUser?.uid ?? null] as const;
export const getGetUserProfileQueryKey = () => ["user-profile", auth?.currentUser?.uid ?? null] as const;
export const getGetBanksQueryKey = () => ["banks", auth?.currentUser?.uid ?? null] as const;
export const getGetInvestmentsQueryKey = () => ["investments", auth?.currentUser?.uid ?? null] as const;
export const getGetAdsQueryKey = () => ["ads", auth?.currentUser?.uid ?? null] as const;
export const getGetDonationCampaignsQueryKey = () => ["donation-campaigns"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getUid(): string {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

function userDoc(uid: string) {
  return doc(db, "users", uid);
}

function userCollection(uid: string, name: string) {
  return collection(db, "users", uid, name);
}

// ---------------------------------------------------------------------------
// Hooks — Assets (static)
// ---------------------------------------------------------------------------
export function useGetAssets() {
  return useQuery({
    queryKey: getGetAssetsQueryKey(),
    queryFn: () => ASSET_TIERS,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Hooks — User Profile
// ---------------------------------------------------------------------------
export function useGetUserProfile() {
  return useQuery({
    queryKey: getGetUserProfileQueryKey(),
    queryFn: async () => {
      const uid = getUid();
      const snap = await getDoc(userDoc(uid));
      const stored = snap.data() ?? {};
      const email = auth?.currentUser?.email ?? stored.email ?? "";
      const displayName = stored.displayName || email.split("@")[0] || "Investor";
      const avatarInitials = displayName.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      return {
        id: uid,
        displayName,
        email,
        phone: stored.phone ?? "",
        location: stored.location ?? "",
        avatarInitials,
        kycVerified: Boolean(stored.kycVerified),
        memberSince: stored.memberSince ?? new Date().toISOString().slice(0, 10),
        investorLevel: stored.investorLevel ?? "Bronze",
        referralCount: stored.referralCount ?? 0,
        referralCode: stored.referralCode ?? uid.slice(0, 8).toUpperCase(),
      } as UserProfile;
    },
    enabled: !!auth?.currentUser,
  });
}

// ---------------------------------------------------------------------------
// Hooks — Wallet
// ---------------------------------------------------------------------------
export function useGetWallet() {
  return useQuery({
    queryKey: getGetWalletQueryKey(),
    queryFn: async () => {
      const uid = getUid();
      const [userSnap, invSnap, txSnap] = await Promise.all([
        getDoc(userDoc(uid)),
        getDocs(userCollection(uid, "investments")),
        getDocs(userCollection(uid, "transactions")),
      ]);
      const userData = userSnap.data() ?? {};
      const balance = Number(userData.walletBalance ?? 0);

      let activeInvestmentsValue = 0;
      let totalEarnings = 0;
      invSnap.forEach(doc => {
        const inv = doc.data();
        if (inv.status === "active") activeInvestmentsValue += Number(inv.amount ?? 0);
        if (inv.status === "completed") totalEarnings += Number(inv.expectedPayout ?? 0) - Number(inv.amount ?? 0);
      });

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      let weeklyChange = 0;
      txSnap.forEach(doc => {
        const tx = doc.data();
        const txDate = tx.date?.toDate ? tx.date.toDate().getTime() : Number(tx.date ?? 0);
        if (txDate >= weekAgo && (tx.type === "return" || tx.type === "deposit")) {
          weeklyChange += Number(tx.amount ?? 0);
        }
      });

      return { balance, activeInvestmentsValue, totalEarnings, weeklyChange } as Wallet;
    },
    enabled: !!auth?.currentUser,
  });
}

// ---------------------------------------------------------------------------
// Hooks — Dashboard Summary
// ---------------------------------------------------------------------------
export function useGetDashboardSummary() {
  return useQuery({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: async () => {
      const uid = getUid();
      const [userSnap, invSnap, txSnap] = await Promise.all([
        getDoc(userDoc(uid)),
        getDocs(userCollection(uid, "investments")),
        getDocs(query(userCollection(uid, "transactions"), orderBy("__name__"))),
      ]);
      const userData = userSnap.data() ?? {};
      const balance = Number(userData.walletBalance ?? 0);

      let activeInvestmentsValue = 0;
      let totalEarnings = 0;
      let activeCount = 0;
      let completedCount = 0;
      invSnap.forEach(doc => {
        const inv = doc.data();
        if (inv.status === "active") {
          activeInvestmentsValue += Number(inv.amount ?? 0);
          activeCount++;
        }
        if (inv.status === "completed") {
          totalEarnings += Number(inv.expectedPayout ?? 0) - Number(inv.amount ?? 0);
          completedCount++;
        }
      });

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      let weeklyChange = 0;
      const recentTransactions: Transaction[] = [];
      txSnap.forEach(doc => {
        const tx = doc.data();
        const txDate = tx.date?.toDate ? tx.date.toDate().getTime() : Number(tx.date ?? 0);
        const item: Transaction = {
          id: doc.id,
          type: tx.type ?? "deposit",
          label: tx.label ?? "",
          amount: Number(tx.amount ?? 0),
          date: new Date(txDate).toISOString(),
          status: tx.status ?? "completed",
        };
        recentTransactions.push(item);
        if (txDate >= weekAgo && (tx.type === "return" || tx.type === "deposit")) {
          weeklyChange += Number(tx.amount ?? 0);
        }
      });
      recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        walletBalance: balance,
        activeInvestmentsValue,
        weeklyChange,
        totalEarnings,
        activeInvestmentsCount: activeCount,
        completedInvestmentsCount: completedCount,
        recentTransactions: recentTransactions.slice(0, 8),
      } as DashboardSummary;
    },
    enabled: !!auth?.currentUser,
  });
}

// ---------------------------------------------------------------------------
// Hooks — Banks
// ---------------------------------------------------------------------------
const BANK_COLORS: Record<string, { logo: string; color: string; bgColor: string }> = {
  GTBank: { logo: "GT", color: "#f97316", bgColor: "#fff7ed" },
  "Access Bank": { logo: "AB", color: "#3b82f6", bgColor: "#eff6ff" },
  "First Bank": { logo: "FB", color: "#f59e0b", bgColor: "#fffbeb" },
  "Zenith Bank": { logo: "ZB", color: "#8b5cf6", bgColor: "#f5f3ff" },
  UBA: { logo: "UB", color: "#ef4444", bgColor: "#fef2f2" },
  "Kuda Bank": { logo: "KD", color: "#6366f1", bgColor: "#eef2ff" },
  Opay: { logo: "OP", color: "#10b981", bgColor: "#ecfdf5" },
  Moniepoint: { logo: "MP", color: "#06b6d4", bgColor: "#ecfeff" },
  "Stanbic IBTC": { logo: "SI", color: "#64748b", bgColor: "#f8fafc" },
  "Polaris Bank": { logo: "PB", color: "#ec4899", bgColor: "#fdf2f8" },
};

export function useGetBanks() {
  return useQuery({
    queryKey: getGetBanksQueryKey(),
    queryFn: async () => {
      const uid = getUid();
      const snap = await getDocs(userCollection(uid, "banks"));
      const banks: BankAccount[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        const colors = BANK_COLORS[data.bankName] ?? { logo: "BK", color: "#64748b", bgColor: "#f8fafc" };
        banks.push({
          id: doc.id,
          bankName: data.bankName ?? "",
          accountName: data.accountName ?? "",
          accountNumber: data.accountNumber ?? "",
          logo: colors.logo,
          color: colors.color,
          bgColor: colors.bgColor,
        });
      });
      return banks;
    },
    enabled: !!auth?.currentUser,
  });
}

export function useAddBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { data: { bankName: string; accountName: string; accountNumber: string } }) => {
      const uid = getUid();
      const ref = await addDoc(userCollection(uid, "banks"), {
        ...input.data,
        createdAt: Date.now(),
      });
      return { id: ref.id, ...input.data };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() }),
  });
}

export function useRemoveBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bankId }: { bankId: string }) => {
      const uid = getUid();
      await deleteDoc(doc(db, "users", uid, "banks", bankId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() }),
  });
}

// ---------------------------------------------------------------------------
// Hooks — Investments
// ---------------------------------------------------------------------------
export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { data: { assetId: string; amount: number; lockDays: number } }) => {
      const uid = getUid();
      const { assetId, amount, lockDays } = input.data;
      const tier = ASSET_TIER_MAP[assetId];
      if (!tier) throw new Error("Invalid asset selected");
      if (!Number.isInteger(lockDays) || lockDays < 1 || lockDays > tier.durationDays) {
        throw new Error(`Investment duration must be between 1 and ${tier.durationDays} days`);
      }
      if (amount < tier.entryAmount) throw new Error(`Minimum investment for this asset is ₦${tier.entryAmount.toLocaleString("en-NG")}`);
      if (amount > MAX_INVESTMENT) throw new Error(`Maximum investment is ₦${MAX_INVESTMENT.toLocaleString("en-NG")}`);

      // Check wallet balance
      const userSnap = await getDoc(userDoc(uid));
      const balance = Number(userSnap.data()?.walletBalance ?? 0);
      if (amount > balance) throw new Error("Insufficient wallet balance. Please add funds first.");

      const prorate = Math.min(lockDays / tier.durationDays, 1);
      const expectedPayout = Math.round(amount * (1 + (tier.returnRate / 100) * prorate));
      const now = Date.now();
      const startDate = new Date(now).toISOString();
      const endDate = new Date(now + lockDays * 24 * 60 * 60 * 1000).toISOString();

      // Deduct from wallet
      await updateDoc(userDoc(uid), { walletBalance: increment(-amount) });

      // Create investment record
      const invRef = await addDoc(userCollection(uid, "investments"), {
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
      });

      // Log transaction
      await addDoc(userCollection(uid, "transactions"), {
        type: "invest",
        label: `Investment in ${tier.label}`,
        amount,
        date: now,
        status: "active",
      });

      return {
        id: invRef.id,
        assetId,
        assetLabel: tier.label,
        amount,
        expectedPayout,
        returnRate: tier.returnRate,
        status: "active" as const,
        startDate,
        endDate,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetInvestmentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    },
  });
}

// ---------------------------------------------------------------------------
// Hooks — Withdraw
// ---------------------------------------------------------------------------
export function useWithdrawFromWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { data: { amount: number; bankId: string } }) => {
      const uid = getUid();
      const { amount, bankId } = input.data;
      if (amount < 100) throw new Error("Minimum withdrawal is ₦100");

      const userSnap = await getDoc(userDoc(uid));
      const userData = userSnap.data() ?? {};
      const balance = Number(userData.walletBalance ?? 0);
      if (amount > balance) throw new Error("Insufficient balance");

      const referralCount = Number(userData.referralCount ?? 0);
      if (referralCount < 5) throw new Error("You need at least 5 referrals to withdraw");

      const now = Date.now();
      const approvalDeadline = now + 12 * 60 * 60 * 1000;

      // Create withdrawal request
      await addDoc(userCollection(uid, "withdrawals"), {
        amount,
        bankId,
        status: "pending",
        createdAt: now,
        approvalDeadline,
      });

      // Deduct from balance
      await updateDoc(userDoc(uid), { walletBalance: increment(-amount) });

      // Log transaction
      await addDoc(userCollection(uid, "transactions"), {
        type: "withdrawal",
        label: "Withdrawal Request",
        amount,
        date: now,
        status: "pending",
      });

      return { message: "Withdrawal request submitted. Admin has 12 hours to approve." };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    },
  });
}

// ---------------------------------------------------------------------------
// Hooks — Ads (Firestore collection)
// ---------------------------------------------------------------------------
export function useGetAds() {
  return useQuery({
    queryKey: getGetAdsQueryKey(),
    queryFn: async () => {
      const uid = getUid();
      const snap = await getDocs(userCollection(uid, "ads"));
      const ads: Ad[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        ads.push({
          id: doc.id,
          title: d.title ?? "",
          audience: d.audience ?? "all",
          duration: d.duration ?? "1week",
          cost: Number(d.cost ?? 0),
          status: d.status ?? "pending",
          submittedAt: d.submittedAt ? new Date(d.submittedAt).toISOString() : new Date().toISOString(),
        });
      });
      return ads;
    },
    enabled: !!auth?.currentUser,
  });
}

export function useSubmitAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { data: { title: string; audience: string; duration: string; targetUrl?: string; cost: number } }) => {
      const uid = getUid();
      const ref = await addDoc(userCollection(uid, "ads"), {
        ...input.data,
        status: "pending",
        submittedAt: Date.now(),
      });
      return { id: ref.id };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAdsQueryKey() }),
  });
}

// ---------------------------------------------------------------------------
// Hooks — Donation Campaigns (Firestore public collection)
// ---------------------------------------------------------------------------
export function useGetDonationCampaigns() {
  return useQuery({
    queryKey: getGetDonationCampaignsQueryKey(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, "donationCampaigns"));
      const campaigns: DonationCampaign[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        campaigns.push({
          id: doc.id,
          title: d.title ?? "",
          description: d.description ?? "",
          targetAmount: Number(d.targetAmount ?? 0),
          raisedAmount: Number(d.raisedAmount ?? 0),
          color: d.color ?? "#f43f5e",
        });
      });
      return campaigns;
    },
  });
}

export function useMakeDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { campaignId: string; data: { amount: number } }) => {
      const uid = getUid();
      const { campaignId, data } = input;
      const campaignRef = doc(db, "donationCampaigns", campaignId);
      await updateDoc(campaignRef, { raisedAmount: increment(data.amount) });
      await addDoc(collection(db, "donations"), {
        campaignId,
        userId: uid,
        amount: data.amount,
        createdAt: Date.now(),
      });
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDonationCampaignsQueryKey() }),
  });
}

// ---------------------------------------------------------------------------
// User registration — creates user document in Firestore
// ---------------------------------------------------------------------------
export async function registerUser(uid: string, displayName: string, email: string, referralCode?: string) {
  const userRef = userDoc(uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return; // Already registered

  const newReferralCode = uid.slice(0, 8).toUpperCase();
  const userData: Record<string, unknown> = {
    displayName,
    email,
    walletBalance: 0,
    kycVerified: false,
    memberSince: new Date().toISOString().slice(0, 10),
    investorLevel: "Bronze",
    referralCount: 0,
    referralCode: newReferralCode,
    banned: false,
    createdAt: Date.now(),
  };

  // Handle referral — increment referrer's count
  if (referralCode) {
    const usersSnap = await getDocs(collection(db, "users"));
    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data();
      if (data.referralCode === referralCode) {
        await updateDoc(doc(db, "users", docSnap.id), { referralCount: increment(1) });
        break;
      }
    }
  }

  await setDoc(userRef, userData, { merge: true });
}

// ---------------------------------------------------------------------------
// Support message
// ---------------------------------------------------------------------------
export async function sendSupportMessage(uid: string, message: string) {
  await addDoc(userCollection(uid, "support"), {
    message,
    status: "open",
    createdAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Wallet funding — creates a pending payment record.
// NOTE: The actual SquadCo checkout requires a server-side secret key.
// To complete this flow, deploy a Firebase Cloud Function that calls the
// SquadCo API and returns the checkout URL. For now this records the intent.
// ---------------------------------------------------------------------------
export async function initiateWalletFund(uid: string, amount: number): Promise<{ checkoutUrl: string; transactionRef: string }> {
  const transactionRef = `ZMNG-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await addDoc(userCollection(uid, "payments"), {
    amount,
    status: "pending",
    type: "wallet_fund",
    transactionRef,
    createdAt: Date.now(),
  });
  // Return a placeholder — replace with real SquadCo checkout URL from Cloud Functions
  return { checkoutUrl: "", transactionRef };
}

export async function verifyWalletFund(uid: string, _transactionRef: string): Promise<{ verified: boolean; amount: number }> {
  // Payment verification requires the SquadCo secret key (server-side).
  // Deploy a Firebase Cloud Function to handle verification and credit the wallet.
  return { verified: false, amount: 0 };
}

// ---------------------------------------------------------------------------
// Admin functions
// ---------------------------------------------------------------------------
export async function getAdminStats() {
  const usersSnap = await getDocs(collection(db, "users"));
  let totalUsers = 0;
  let allTimeEarnings = 0;
  let totalDeposits = 0;
  let pendingWithdrawalsCount = 0;
  let pendingWithdrawalsAmount = 0;

  for (const userDoc of usersSnap.docs) {
    totalUsers++;
    const uid = userDoc.id;
    const data = userDoc.data();
    allTimeEarnings += Number(data.totalEarnings ?? 0);

    // Sum deposits
    const txSnap = await getDocs(userCollection(uid, "transactions"));
    txSnap.forEach(tx => {
      const txData = tx.data();
      if (txData.type === "deposit") totalDeposits += Number(txData.amount ?? 0);
    });

    // Pending withdrawals
    const wSnap = await getDocs(userCollection(uid, "withdrawals"));
    wSnap.forEach(w => {
      const wData = w.data();
      if (wData.status === "pending") {
        pendingWithdrawalsCount++;
        pendingWithdrawalsAmount += Number(wData.amount ?? 0);
      }
    });
  }

  return { totalUsers, allTimeEarnings, totalDeposits, pendingWithdrawalsCount, pendingWithdrawalsAmount };
}

export async function getAdminUsers() {
  const usersSnap = await getDocs(collection(db, "users"));
  const users: any[] = [];
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const displayName = data.displayName || "User";
    users.push({
      id: docSnap.id,
      displayName,
      email: data.email ?? "",
      banned: Boolean(data.banned),
      kycVerified: Boolean(data.kycVerified),
      referralCount: Number(data.referralCount ?? 0),
      investorLevel: data.investorLevel ?? "Bronze",
      memberSince: data.memberSince ?? "—",
      avatarInitials: displayName.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      wallet: { balance: Number(data.walletBalance ?? 0) },
    });
  }
  return users;
}

export async function getAdminWithdrawals() {
  const usersSnap = await getDocs(collection(db, "users"));
  const withdrawals: any[] = [];
  for (const userDocSnap of usersSnap.docs) {
    const uid = userDocSnap.id;
    const userData = userDocSnap.data();
    const wSnap = await getDocs(userCollection(uid, "withdrawals"));
    const banksSnap = await getDocs(userCollection(uid, "banks"));
    const bankMap: Record<string, any> = {};
    banksSnap.forEach(b => { bankMap[b.id] = b.data(); });

    wSnap.forEach(w => {
      const wData = w.data();
      const bank = bankMap[wData.bankId] ?? {};
      withdrawals.push({
        id: w.id,
        userId: uid,
        userName: userData.displayName ?? "User",
        userEmail: userData.email ?? "",
        amount: Number(wData.amount ?? 0),
        status: wData.status ?? "pending",
        bankName: bank.bankName ?? "",
        accountNumber: bank.accountNumber ?? "",
        accountName: bank.accountName ?? "",
        createdAt: wData.createdAt ?? Date.now(),
      });
    });
  }
  withdrawals.sort((a, b) => b.createdAt - a.createdAt);
  return withdrawals;
}

export async function getAdminSupport() {
  const usersSnap = await getDocs(collection(db, "users"));
  const messages: any[] = [];
  for (const userDocSnap of usersSnap.docs) {
    const uid = userDocSnap.id;
    const userData = userDocSnap.data();
    const sSnap = await getDocs(userCollection(uid, "support"));
    sSnap.forEach(s => {
      const sData = s.data();
      messages.push({
        id: s.id,
        userId: uid,
        userName: userData.displayName ?? "User",
        userEmail: userData.email ?? "",
        message: sData.message ?? "",
        status: sData.status ?? "open",
        adminReply: sData.adminReply ?? "",
        createdAt: sData.createdAt ?? Date.now(),
      });
    });
  }
  messages.sort((a, b) => b.createdAt - a.createdAt);
  return messages;
}

export async function adminBanUser(userId: string, reason: string) {
  await updateDoc(userDoc(userId), { banned: true, bannedReason: reason });
}

export async function adminUnbanUser(userId: string) {
  await updateDoc(userDoc(userId), { banned: false, bannedReason: "" });
}

export async function adminDeleteUser(userId: string) {
  await deleteDoc(userDoc(userId));
}

export async function adminApproveWithdrawal(userId: string, withdrawalId: string) {
  await updateDoc(doc(db, "users", userId, "withdrawals", withdrawalId), { status: "approved" });
}

export async function adminRejectWithdrawal(userId: string, withdrawalId: string) {
  await updateDoc(doc(db, "users", userId, "withdrawals", withdrawalId), { status: "rejected" });
}

export async function adminReplySupport(userId: string, supportId: string, reply: string) {
  await updateDoc(doc(db, "users", userId, "support", supportId), { adminReply: reply, status: "resolved" });
}
