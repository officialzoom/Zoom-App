import { authenticate, endpoint, readJson, requireNairaAmount, jsonResponse } from "../../server/http.mjs";
import { initiateSquadPayment } from "../../server/payment-service.mjs";

export default endpoint("POST", async (request) => {
  const user = await authenticate(request);
  const input = await readJson(request);
  const amount = requireNairaAmount(input.amount);
  const payment = await initiateSquadPayment(request, user, amount);
  return jsonResponse(payment);
});
