import { authenticate, endpoint, readJson, requireSafeId, jsonResponse } from "../../server/http.mjs";
import {
  creditVerifiedPayment,
  paymentReferenceIsValid,
  verifySquadPayment,
} from "../../server/payment-service.mjs";
import { HttpError } from "../../server/http.mjs";

export default endpoint("POST", async (request) => {
  const user = await authenticate(request);
  const input = await readJson(request);
  const transactionRef = requireSafeId(input.transactionRef, "Transaction reference");
  if (!paymentReferenceIsValid(transactionRef)) throw new HttpError(400, "Transaction reference is invalid.");
  const details = await verifySquadPayment(transactionRef);
  return jsonResponse(await creditVerifiedPayment(user.uid, transactionRef, details));
});
