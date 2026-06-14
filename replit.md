# Zoom NG

Nigerian vehicle investment platform — users invest in verified transport fleets (cars, buses, trucks) and earn passive income.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, requires TTY — use direct psql for CI)
- Required env: `DATABASE_URL`, `VITE_FIREBASE_*`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + shadcn/ui + Tailwind v4 (`artifacts/zoom-ng`)
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM
- Auth: Firebase Auth (frontend) + firebase-admin (backend JWT verification)
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)

## Where things live

- `lib/db/src/schema/` — source of truth for DB schema
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `artifacts/zoom-ng/src/` — React frontend
- `artifacts/api-server/src/routes/` — Express API routes
- `artifacts/zoom-ng/src/contexts/AuthContext.tsx` — Firebase auth context
- `artifacts/zoom-ng/src/lib/firebase.ts` — Firebase SDK init
- `artifacts/zoom-ng/src/pages/Admin.tsx` — Admin panel (officialzoom200@gmail.com only)

## Architecture decisions

- Firebase Auth is used for login (email + Google) — backend verifies JWT via firebase-admin
- Users are stored in Postgres with `firebase_uid` as the link to Firebase identity
- Withdrawals require 5 referrals (enforced server-side in wallet route)
- Ban notifications use Firestore real-time listener on `users/{uid}` doc
- Admin email is hardcoded as `officialzoom200@gmail.com` in both frontend and backend
- `drizzle-kit push` requires TTY — use raw `psql` commands for non-interactive migrations

## Product

- **Landing page** — public marketing page with Terms & Privacy, CTA to sign up
- **Firebase Auth** — email/password + Google sign-in, signup with referral code
- **Dashboard** — wallet balance, active investments, earnings overview
- **Explore Fleets** — browse cars, buses, trucks with real Unsplash vehicle images
- **Invest** — pick asset tier, invest amount, earn returns over lock period
- **Profile** — bank accounts, withdrawal request (unlocked after 5 referrals), referral link
- **Referral Program** — unique code per user, referrer earns 5 referrals to unlock withdrawal
- **Admin Panel** — ban/unban/delete users, approve/reject withdrawals, reply to support
- **Support** — users can message admin; admin replies trigger in-app notifications
- **Ban Notifications** — real-time Firestore listener shows modal if user is banned

## User preferences

- Admin email: officialzoom200@gmail.com
- Nigerian naira (₦) currency throughout
- Real car/bus/truck images from Unsplash

## Gotchas

- `drizzle-kit push` fails non-interactively if existing data conflicts — use psql directly
- Firebase admin uses `applicationDefault()` — requires `GOOGLE_APPLICATION_CREDENTIALS` env var in production
- Vite HMR needs both workflows running; restart zoom-ng after adding new npm deps
- After schema changes, always run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks
- DB tables `notifications`, `withdrawal_requests`, `support_messages` were added via direct psql (not drizzle push)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
