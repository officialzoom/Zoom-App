import { authenticate, endpoint, jsonResponse } from "../../server/http.mjs";
import { getWalletState } from "../../server/wallet-state.mjs";

export const POST = endpoint("POST", async (request) => {
  const user = await authenticate(request);
  const wallet = await getWalletState(user.uid);
  return jsonResponse(wallet);
});
