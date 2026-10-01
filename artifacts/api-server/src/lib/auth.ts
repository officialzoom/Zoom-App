import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

/**
 * Firebase ID Token verification without the Admin SDK.
 *
 * The Admin SDK requires a service-account JSON (GOOGLE_APPLICATION_CREDENTIALS)
 * which is not available in this environment.  Token verification only needs
 * Google's *public* X.509 certificates though, so we fetch and cache them from
 * the well-known JWKS endpoint and verify the JWT ourselves.
 */

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiry = 0;

function getProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    ""
  );
}

async function fetchCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiry) return cachedCerts;

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Google certs: ${res.status}`);
  const certs = (await res.json()) as Record<string, string>;

  // Respect max-age from Cache-Control, default 1 hour.
  const cc = res.headers.get("cache-control") || "";
  const maxAgeMatch = cc.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600_000;
  cachedCerts = certs;
  cachedCertsExpiry = now + maxAge;
  return certs;
}

interface DecodedToken {
  uid: string;
  email?: string;
}

async function verifyFirebaseToken(token: string): Promise<DecodedToken> {
  const projectId = getProjectId();
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const headerB64 = parts[0];
  const payloadB64 = parts[1];
  const signatureB64 = parts[2];

  // Decode header and payload (base64url).
  const decode = (b: string) =>
    JSON.parse(
      Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    );

  const header = decode(headerB64) as { kid?: string; alg?: string };
  const payload = decode(payloadB64) as {
    iss?: string;
    aud?: string;
    exp?: number;
    iat?: number;
    sub?: string;
    email?: string;
    user_id?: string;
  };

  // Verify issuer.
  const expectedIss = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIss) throw new Error("Invalid token issuer");

  // Verify audience.
  if (payload.aud !== projectId) throw new Error("Invalid token audience");

  // Verify expiry.
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("Token expired");

  // Verify subject.
  const uid = payload.sub || payload.user_id;
  if (!uid) throw new Error("Token missing subject");

  // Verify signature.
  const certs = await fetchCerts();
  const certPem = certs[header.kid || ""];
  if (!certPem) throw new Error("Unknown signing key");

  const { createPublicKey, createVerify } = await import("crypto");
  const publicKey = createPublicKey(certPem);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);

  const signature = Buffer.from(signatureB64, "base64url");
  const valid = verifier.verify(publicKey, signature);
  if (!valid) throw new Error("Invalid token signature");

  return { uid, email: payload.email };
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await verifyFirebaseToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Invalid Firebase token");
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await verifyFirebaseToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
