import { randomUUID } from "crypto";
import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getFirebaseDatabase, userPath } from "../lib/firebase";

const router = Router();
const config = () => ({ secretKey: process.env.SQUADCO_SECRET_KEY ?? "", baseUrl: process.env.SQUADCO_BASE_URL ?? "https://sandbox-api-d.squadco.com" });

router.post("/fund", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: "Minimum top-up is ₦100" });
  const { secretKey, baseUrl } = config();
  if (!secretKey) return res.status(503).json({ error: "Payment gateway not configured" });
  const transactionRef = `ZMNG-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const response = await fetch(`${baseUrl}/transaction/initiate`, { method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(amount * 100), email: req.userEmail ?? "", currency: "NGN", initiate_type: "inline", transaction_ref: transactionRef, callback_url: `${req.headers.origin ?? ""}/profile?fund=${transactionRef}`, metadata: { userId: req.userId, type: "wallet_fund" } }) });
  const data = await response.json() as { data?: { checkout_url?: string }; message?: string };
  if (!response.ok || !data.data?.checkout_url) return res.status(502).json({ error: data.message ?? "Failed to initiate payment" });
  await getFirebaseDatabase().ref(userPath(req.userId!, `payments/${transactionRef}`)).set({ amount, status: "pending", createdAt: Date.now() });
  return res.json({ checkoutUrl: data.data.checkout_url, transactionRef });
});

router.get("/fund/verify/:transactionRef", requireAuth, async (req, res) => {
  const { secretKey, baseUrl } = config();
  if (!secretKey) return res.status(503).json({ error: "Payment gateway not configured" });
  const response = await fetch(`${baseUrl}/transaction/verify/${req.params.transactionRef}`, { headers: { Authorization: `Bearer ${secretKey}` } });
  const data = await response.json() as { success?: boolean; message?: string; data?: { transaction_status?: string; transaction_amount?: number } };
  if (!response.ok || !data.success) return res.status(402).json({ verified: false, error: data.message ?? "Payment verification failed" });
  if (data.data?.transaction_status !== "Success") return res.json({ verified: false, status: data.data?.transaction_status ?? "pending" });
  const paymentRef = getFirebaseDatabase().ref(userPath(req.userId!, `payments/${req.params.transactionRef}`));
  const amount = Number(data.data.transaction_amount ?? 0) / 100;
  const result = await paymentRef.transaction((payment) => payment?.credited ? payment : { ...(payment ?? {}), amount, status: "verified", credited: true, verifiedAt: Date.now() });
  if (result.committed) await getFirebaseDatabase().ref(userPath(req.userId!, "wallet/balance")).transaction((balance) => Number(balance ?? 0) + amount);
  return res.json({ verified: true, amount });
});

router.get("/banks", requireAuth, async (req, res) => {
  const snapshot = await getFirebaseDatabase().ref(userPath(req.userId!, "banks")).get();
  return res.json(Object.entries(snapshot.val() ?? {}).map(([id, bank]) => ({ id, ...(bank as object) })));
});

router.post("/banks", requireAuth, async (req, res) => {
  const ref = getFirebaseDatabase().ref(userPath(req.userId!, "banks")).push();
  const bank = { ...req.body, createdAt: Date.now() };
  await ref.set(bank);
  return res.status(201).json({ id: ref.key, ...bank });
});

router.delete("/banks/:bankId", requireAuth, async (req, res) => {
  const ref = getFirebaseDatabase().ref(userPath(req.userId!, `banks/${req.params.bankId}`));
  if (!(await ref.get()).exists()) return res.status(404).json({ error: "Bank account not found" });
  await ref.remove();
  return res.status(204).send();
});

export default router;
