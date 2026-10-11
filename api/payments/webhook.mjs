import { endpoint, jsonResponse, HttpError } from "../../server/http.mjs";
import {
  handleSquadWebhook,
  verifySquadWebhookSignature,
} from "../../server/payment-service.mjs";

export default endpoint("POST", async (request) => {
  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "Webhook body must be valid JSON.");
  }
  const signature = request.headers.get("x-squad-encrypted-body");
  if (!verifySquadWebhookSignature(payload, signature)) {
    throw new HttpError(401, "Webhook signature is invalid.");
  }
  return jsonResponse(await handleSquadWebhook(payload));
});
