import { setAuthTokenGetter } from "@workspace/api-client-react";
import { auth } from "./firebase";

export function initApiAuth() {
  setAuthTokenGetter(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  });
}
