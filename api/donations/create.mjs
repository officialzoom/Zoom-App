import { authenticate, endpoint, jsonResponse, readJson } from "../../server/http.mjs";
import { createDonation } from "../../server/wallet-service.mjs";

export const POST = endpoint("POST", async (request) => {
  const user = await authenticate(request);
  return jsonResponse(await createDonation(user.uid, await readJson(request)));
});
