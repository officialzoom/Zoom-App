import { getFirebaseAdminAuth } from "./firebase-admin.mjs";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function endpoint(method, handler) {
  return async function handleRequest(request) {
    if (request.method !== method) {
      return jsonResponse({ error: "Method not allowed." }, 405, { Allow: method });
    }
    try {
      return await handler(request);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error("Vercel API request failed:", error?.message ?? "Unknown error");
      return jsonResponse(
        { error: status >= 500 ? (error?.status ? error.message : "The request could not be completed.") : error.message },
        status,
      );
    }
  };
}

export async function readJson(request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_384) throw new HttpError(413, "Request body is too large.");
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Invalid JSON object.");
    }
    return body;
  } catch {
    throw new HttpError(400, "A valid JSON request body is required.");
  }
}

export async function authenticate(request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Sign in to continue.");
  try {
    return await getFirebaseAdminAuth().verifyIdToken(match[1]);
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in and try again.");
  }
}

export function requireAdmin(user) {
  const allowedEmail = (process.env.ADMIN_EMAIL || "officialzoom200@gmail.com").toLowerCase();
  if (!user?.email || user.email.toLowerCase() !== allowedEmail) {
    throw new HttpError(403, "Administrator access is required.");
  }
}

export function requireSafeId(value, label = "ID") {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(value)) {
    throw new HttpError(400, `${label} is invalid.`);
  }
  return value;
}

export function requireNairaAmount(value, minimum = 100) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < minimum) {
    throw new HttpError(400, `Enter a whole naira amount of at least ₦${minimum.toLocaleString("en-NG")}.`);
  }
  return amount;
}
