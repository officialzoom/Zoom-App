import { authenticate, endpoint, jsonResponse, requireAdmin } from "../../../server/http.mjs";
import { listAdminUsers } from "../../../server/wallet-service.mjs";

export const POST = endpoint("POST", async (request) => {
  const admin = await authenticate(request);
  requireAdmin(admin);
  return jsonResponse(await listAdminUsers());
});
