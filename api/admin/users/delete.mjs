import { authenticate, endpoint, jsonResponse, readJson, requireAdmin } from "../../../server/http.mjs";
import { deleteUserAccount } from "../../../server/wallet-service.mjs";

export const POST = endpoint("POST", async (request) => {
  const admin = await authenticate(request);
  requireAdmin(admin);
  return jsonResponse(await deleteUserAccount(admin, await readJson(request)));
});
