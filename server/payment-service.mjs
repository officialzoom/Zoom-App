import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getRealtimeDatabase } from "./firebase-admin.mjs";
import { HttpError } from "./http.mjs";

const SANDBOX_URL = "https://sandbox-api-d.squadco.com";
const PRODUCTION_URL = "https://api-d.squadco.com";

function squadSecret() {
  const secret = process.env.SQUADCO_SECRET_KEY;
  if (!secret) throw new HttpError(503, "Payments are not configured on the server.");
  return secret;
}

function squadBaseUrl(secret) {
  const selected = process.env.SQUADCO_API_BASE_URL
    || (secret.startsWith("sandbox_") ? SANDBOX_URL : PRODUCTION_URL);
  const url = new URL(selected);
  if (url.protocol !== "https:" || ![new URL(SANDBOX_URL).host, new URL(PRODUCTION_URL).host].includes(url.host)) {
    throw new HttpError(503, "SquadCo API host configuration is invalid.");
  }
  return url.origin;
}

async function squadRequest(path, init = {}) {
  const secret = squadSecret();
  let response;
  try {
    response = await fetch(`${squadBaseUrl(secret)}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "SquadCo could not be reached. Please try again.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new HttpError(502, "SquadCo returned an invalid response.");
  }
  if (!response.ok || payload?.success === false || !payload?.data) {
    throw new HttpError(502, "SquadCo could not complete the payment request.");
  }
  return payload.data;
}

export async function initiateSquadPayment(request, user, amount) {
  const secret = squadSecret();
  const database = getRealtimeDatabase();
  const uid = user.uid;
  const profileSnapshot = await database.ref(`users/${uid}`).get();
  const profile = profileSnapshot.val() ?? {};
  const email = user.email ?? profile.email;
  if (typeof email !== "string" || !email.includes("@")) {
    throw new HttpError(400, "Add a valid email address to your account before funding your wallet.");
  }

  const transactionRef = `ZMNG-${randomUUID().replaceAll("-", "")}`;
  const base = process.env.APP_BASE_URL
    ? new URL(process.env.APP_BASE_URL).origin
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const callbackUrl = new URL("/profile", base);
  callbackUrl.searchParams.set("fund", transactionRef);
  const now = Date.now();
  const payment = {
    amount,
    currency: "NGN",
    status: "initiating",
    type: "wallet_fund",
    provider: "squadco",
    transactionRef,
    email,
    createdAt: now,
  };

  await database.ref().update({
    [`users/${uid}/payments/${transactionRef}`]: payment,
    [`paymentRefs/${transactionRef}`]: { uid, amount, status: "initiating", createdAt: now },
  });

  try {
    const result = await squadRequest("/transaction/initiate", {
      method: "POST",
      body: JSON.stringify({
        amount: amount * 100,
        email,
        customer_name: profile.displayName || user.name || email.split("@")[0],
        currency: "NGN",
        initiate_type: "inline",
        transaction_ref: transactionRef,
        callback_url: callbackUrl.toString(),
        payment_channels: ["card", "bank", "ussd", "transfer"],
        metadata: { userId: uid, type: "wallet_fund" },
      }),
    });

    if (typeof result.checkout_url !== "string" || !result.checkout_url.startsWith("https://")) {
      throw new HttpError(502, "SquadCo did not return a secure checkout URL.");
    }
    await database.ref().update({
      [`users/${uid}/payments/${transactionRef}/status`]: "pending",
      [`users/${uid}/payments/${transactionRef}/checkoutUrl`]: result.checkout_url,
      [`paymentRefs/${transactionRef}/status`]: "pending",
    });
    return { checkoutUrl: result.checkout_url, transactionRef };
  } catch (error) {
    await database.ref().update({
      [`users/${uid}/payments/${transactionRef}/status`]: "failed",
      [`paymentRefs/${transactionRef}/status`]: "failed",
    });
    throw error;
  }
}

export async function verifySquadPayment(transactionRef) {
  return squadRequest(`/transaction/verify/${encodeURIComponent(transactionRef)}`, { method: "GET" });
}

function validateVerifiedPayment(reference, expectedAmount, details) {
  const status = String(details?.transaction_status ?? "").toLowerCase();
  const returnedReference = details?.transaction_ref;
  const returnedAmount = Number(details?.transaction_amount);
  const currency = String(details?.transaction_currency_id ?? details?.currency ?? "").toUpperCase();
  if (returnedReference !== reference || currency !== "NGN" || returnedAmount !== expectedAmount * 100) {
    throw new HttpError(409, "SquadCo payment details do not match this wallet request.");
  }
  return status === "success";
}

export async function creditVerifiedPayment(uid, transactionRef, details) {
  const database = getRealtimeDatabase();
  const referenceIndex = await database.ref(`paymentRefs/${transactionRef}`).get();
  const indexed = referenceIndex.val();
  if (!indexed || indexed.uid !== uid) throw new HttpError(404, "This payment request was not found.");

  const userRef = database.ref(`users/${uid}`);
  const transactionId = database.ref(`users/${uid}/transactions`).push().key;
  if (!transactionId) throw new HttpError(500, "A wallet transaction ID could not be created.");
  let outcome = "missing";
  const requestedAmount = Number(indexed.amount);
  if (!validateVerifiedPayment(transactionRef, requestedAmount, details)) {
    const status = String(details?.transaction_status ?? "").toLowerCase();
    if (["failed", "abandoned"].includes(status)) {
      await database.ref().update({
        [`users/${uid}/payments/${transactionRef}/status`]: status,
        [`paymentRefs/${transactionRef}/status`]: status,
      });
    }
    return { verified: false, amount: 0, status: status || "pending" };
  }

  const result = await userRef.transaction((current) => {
    const payment = current?.payments?.[transactionRef];
    if (!payment) {
      outcome = "missing";
      return;
    }
    if (["success", "completed"].includes(String(payment.status).toLowerCase())) {
      outcome = "already-credited";
      return current;
    }
    if (Number(payment.amount) !== requestedAmount) {
      outcome = "amount-mismatch";
      return;
    }

    const amount = Number(details.transaction_amount) / 100;
    const next = { ...current };
    next.walletBalance = Number(current.walletBalance ?? 0) + amount;
    next.payments = {
      ...(current.payments ?? {}),
      [transactionRef]: {
        ...payment,
        status: "success",
        paidAt: Date.now(),
        gatewayReference: details.gateway_transaction_ref ?? details.transaction_ref,
      },
    };
    next.transactions = {
      ...(current.transactions ?? {}),
      [transactionId]: {
        type: "deposit",
        label: "SquadCo Wallet Funding",
        amount,
        date: Date.now(),
        status: "completed",
        transactionRef,
      },
    };
    outcome = "credited";
    return next;
  }, undefined, false);

  if (!result.committed) {
    if (outcome === "amount-mismatch") throw new HttpError(409, "Payment amount does not match the pending request.");
    if (outcome === "missing") throw new HttpError(404, "This payment request was not found.");
    throw new HttpError(409, "Payment could not be applied to the wallet.");
  }

  await database.ref(`paymentRefs/${transactionRef}/status`).set("success");
  return {
    verified: true,
    amount: requestedAmount,
    alreadyCredited: outcome === "already-credited",
  };
}

export function verifySquadWebhookSignature(payload, suppliedSignature) {
  const secret = squadSecret();
  if (!suppliedSignature) return false;
  const expected = createHmac("sha512", secret).update(JSON.stringify(payload)).digest("hex").toUpperCase();
  const actual = String(suppliedSignature).toUpperCase();
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export async function handleSquadWebhook(payload) {
  if (String(payload?.Event ?? "").toLowerCase() !== "charge_successful") {
    return { received: true, ignored: true };
  }
  const transactionRef = payload?.Body?.transaction_ref ?? payload?.TransactionRef;
  if (typeof transactionRef !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(transactionRef)) {
    throw new HttpError(400, "Webhook transaction reference is invalid.");
  }
  const index = (await getRealtimeDatabase().ref(`paymentRefs/${transactionRef}`).get()).val();
  if (!index?.uid) return { received: true, ignored: true };
  const details = await verifySquadPayment(transactionRef);
  const result = await creditVerifiedPayment(index.uid, transactionRef, details);
  if (!result.verified) throw new HttpError(503, "The payment is not confirmed yet.");
  return { received: true, credited: !result.alreadyCredited };
}

export function paymentReferenceIsValid(value) {
  return typeof value === "string" && /^ZMNG-[a-f0-9]{32}$/i.test(value);
}
