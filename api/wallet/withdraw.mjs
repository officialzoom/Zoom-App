import { authenticate, endpoint, jsonResponse, readJson } from "../../server/http.mjs";
import { createWithdrawal } from "../../server/wallet-service.mjs";

export default endpoint("POST", async (request) => {
  const user = await authenticate(request);
  return jsonResponse(await createWithdrawal(user.uid, await readJson(request)));
});
