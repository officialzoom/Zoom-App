---
name: Admin access
description: Admin panel restricted to officialzoom200@gmail.com hardcoded in both frontend and backend.
---

**Rule:** Admin access is checked by comparing `req.userEmail` (from Firebase JWT) or `user.email` to `"officialzoom200@gmail.com"`.

**Why:** Single-admin app; no role system needed.

**How to apply:**
- Backend: `requireAdmin` middleware in `artifacts/api-server/src/routes/admin.ts` checks `req.userEmail !== ADMIN_EMAIL`
- Frontend: `artifacts/zoom-ng/src/pages/Admin.tsx` checks `user?.email === ADMIN_EMAIL` before showing the panel
- Admin route: `/admin` — not in the main NavBar, accessed directly
- Admin can: ban/unban/delete users, approve/reject withdrawals, reply to support messages
- Ban/unban actions insert a `notifications` row so the user gets notified in-app
