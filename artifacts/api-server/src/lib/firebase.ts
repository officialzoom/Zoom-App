import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let database: Database | undefined;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function getFirebaseDatabase() {
  if (database) return database;
  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
    databaseURL: required("FIREBASE_DATABASE_URL"),
  });
  database = getDatabase(app);
  return database;
}

export function userPath(uid: string, child?: string) {
  return `users/${uid}${child ? `/${child}` : ""}`;
}

export function publicPath(path: string) {
  return path.replace(/^\/+/, "");
}
EOF

cat > /vercel/share/v0-project/artifacts/api-server/src/lib/auth.ts <<'EOF'
import type { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";
import { getFirebaseDatabase } from "./firebase";
import { logger } from "./logger";

declare global {
  namespace Express {
    interface Request { userId?: string; userEmail?: string; }
  }
}

async function verify(token: string) {
  if (!getApps().length) getFirebaseDatabase();
  return getAuth().verifyIdToken(token);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = await verify(header.slice(7));
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : error }, "Invalid Firebase token");
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const decoded = await verify(header.slice(7));
      req.userId = decoded.uid;
      req.userEmail = decoded.email;
    } catch { /* Anonymous request */ }
  }
  next();
}
EOF

cat > /vercel/share/v0-project/artifacts/api-server/src/routes/payments.ts <<'EOF'
import { Router } from "express";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";
import { getFirebaseDatabase, userPath } from "../lib/firebase";

const router = Router();
function paymentConfig() {
  const secretKey = process.env.SQUADCO_SECRET_KEY ?? "";
  const baseUrl = process.env.SQUADCO_BASE_URL ?? (secretKey.startsWith("sandbox_") ? "https://sandbox-api-d.squadco.com" : "https://api-d.squadco.com");
  return { secretKey, baseUrl };
}

router.post("/fund", requireAuth, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ error: "Minimum top-up is ₦100" });
  const { secretKey, baseUrl } = paymentConfig();
  if (!secretKey) return res.status(503).json({ error: "Payment gateway not configured" });
  const transactionRef = `ZMNG-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const callbackUrl = `${req.headers.origin ?? ""}/profile?fund=${transactionRef}`;
  const response = await fetch(`${baseUrl}/transaction/initiate`, { method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(amount * 100), email: req.userEmail ?? "", currency: "NGN", initiate_type: "inline", transaction_ref: transactionRef, callback_url: callbackUrl, metadata: { userId: req.userId, type: "wallet_fund" } }) });
  const data = await response.json() as { data?: { checkout_url?: string }; message?: string };
  if (!response.ok || !data.data?.checkout_url) return res.status(502).json({ error: data.message ?? "Failed to initiate payment" });
  await getFirebaseDatabase().ref(userPath(req.userId!, `payments/${transactionRef}`)).set({ amount, status: "pending", createdAt: Date.now() });
  res.json({ checkoutUrl: data.data.checkout_url, transactionRef });
});

router.get("/fund/verify/:transactionRef", requireAuth, async (req, res) => {
  const { secretKey, baseUrl } = paymentConfig();
  if (!secretKey) return res.status(503).json({ error: "Payment gateway not configured" });
  const response = await fetch(`${baseUrl}/transaction/verify/${req.params.transactionRef}`, { headers: { Authorization: `Bearer ${secretKey}` } });
  const data = await response.json() as { success?: boolean; message?: string; data?: { transaction_status?: string; transaction_amount?: number } };
  if (!response.ok || !data.success) return res.status(402).json({ verified: false, error: data.message ?? "Payment verification failed" });
  if (data.data?.transaction_status !== "Success") return res.json({ verified: false, status: data.data?.transaction_status ?? "pending" });
  const amount = Number(data.data.transaction_amount ?? 0) / 100;
  const ref = getFirebaseDatabase().ref(userPath(req.userId!, `payments/${req.params.transactionRef}`));
  const result = await ref.transaction((payment) => payment?.credited ? payment : { ...(payment ?? {}), amount, status: "verified", credited: true, verifiedAt: Date.now() });
  if (result.committed && result.snapshot.val()?.credited === true) {
    await getFirebaseDatabase().ref(userPath(req.userId!, "wallet/balance")).transaction((balance) => Number(balance ?? 0) + amount);
  }
  res.json({ verified: true, amount });
});

export default router;
EOF

cat > /vercel/share/v0-project/artifacts/api-server/src/routes/index.ts <<'EOF'
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";

const router: IRouter = Router();
router.use(healthRouter);
router.use("/wallet", paymentsRouter);
export default router;
EOF

cat > /vercel/share/v0-project/artifacts/api-server/package.json <<'EOF'
{
  "name": "@workspace/api-server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "pnpm run build && pnpm run start", "build": "node ./build.mjs", "start": "node --enable-source-maps ./dist/index.mjs", "typecheck": "tsc -p tsconfig.json --noEmit" },
  "dependencies": { "@workspace/api-zod": "workspace:*", "cookie-parser": "^1.4.7", "cors": "^2.8.6", "express": "^5.2.1", "firebase-admin": "^14.0.0", "pino": "^9.14.0", "pino-http": "^10.5.0" },
  "devDependencies": { "@types/cookie-parser": "^1.4.10", "@types/cors": "^2.8.19", "@types/express": "^5.0.6", "@types/node": "catalog:", "esbuild": "0.27.3", "esbuild-plugin-pino": "^2.3.3", "pino-pretty": "^13.1.3", "thread-stream": "3.1.0" }
}
EOF

cat > /vercel/share/v0-project/firebase.database.rules.json <<'EOF'
{
  "rules": {
    ".read": "auth != null",
    ".write": false,
    "users": { "$uid": { ".read": "auth != null && auth.uid === $uid", ".write": false } }
  }
}
EOF

cat > /vercel/share/v0-project/.env.example <<'EOF'
PORT=3001
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_DATABASE_URL=
SQUADCO_SECRET_KEY=
SQUADCO_BASE_URL=https://sandbox-api-d.squadco.com
EOF

rm -f /vercel/share/v0-project/docker-compose.base44.yml /vercel/share/v0-project/Dockerfile.base44
perl -0pi -e 's/"@workspace\/db": "workspace:\*",\n    //g' /vercel/share/v0-project/pnpm-workspace.yaml 2>/dev/null || true
