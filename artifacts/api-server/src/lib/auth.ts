import type { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { logger } from "./logger";

let initialized = false;

function getApp() {
  if (!initialized) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    initialized = true;
  }
  return admin.app();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const app = getApp();
    const decoded = await admin.auth(app).verifyIdToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    logger.warn({ err }, "Invalid Firebase token");
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const app = getApp();
    const decoded = await admin.auth(app).verifyIdToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
