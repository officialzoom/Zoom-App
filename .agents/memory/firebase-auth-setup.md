---
name: Firebase Auth setup
description: How Firebase auth is wired between frontend and backend in this project.
---

**Rule:** Frontend uses Firebase SDK (`lib/firebase.ts`), backend uses `firebase-admin` with `applicationDefault()`.

**Why:** Firebase Auth tokens (JWTs) are issued client-side and verified server-side. The backend middleware in `artifacts/api-server/src/lib/auth.ts` calls `admin.auth().verifyIdToken(token)` and sets `req.userId` (= Firebase UID) and `req.userEmail`.

**How to apply:**
- Frontend: `useAuth()` from `contexts/AuthContext.tsx` exposes `getToken()` which calls `user.getIdToken()`
- All protected API calls pass `Authorization: Bearer <token>` header
- `initApiAuth()` in `lib/api.ts` registers the token getter with the generated API client via `setAuthTokenGetter()`
- In production, set `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service account JSON, or use GCP default credentials
- User DB rows use `firebase_uid` as the link; the row `id` is also set to `firebase_uid` for simplicity
