import { authenticate, endpoint, jsonResponse, readJson } from "../../server/http.mjs";
import { createInvestment } from "../../server/wallet-service.mjs";

export default endpoint("POST", async (request) => {
  const user = await authenticate(request);
  const investment = await createInvestment(user.uid, await readJson(request));
  return jsonResponse({ investment });
});
