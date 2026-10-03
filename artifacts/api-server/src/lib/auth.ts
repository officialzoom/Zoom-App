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
    return next();
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
