import { authenticate, endpoint, jsonResponse, readJson } from "../../server/http.mjs";
import { registerUser } from "../../server/wallet-service.mjs";

export const POST = endpoint("POST", async (request) => {
  const user = await authenticate(request);
  return jsonResponse(await registerUser(user, await readJson(request)));
});
