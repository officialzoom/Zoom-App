# Zoom NG

Nigerian vehicle-investment platform for exploring transport fleets, managing a wallet, and tracking investments.

## Run & Operate

- `pnpm install` — install workspace dependencies.
- `pnpm dev` — run the Zoom NG Vite frontend.
- `pnpm run build` — typecheck workspace code and build only the active Zoom NG frontend.
- `pnpm --filter @workspace/zoom-ng run typecheck` — focused frontend typecheck.
- Frontend Firebase configuration uses `VITE_FIREBASE_*`, including `VITE_FIREBASE_DATABASE_URL`.
- Vercel API routes require `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, and `SQUADCO_SECRET_KEY`.

## Stack

- pnpm 10 workspace, Node.js 24, TypeScript 5.9.
- Frontend: React, Vite, Tailwind, Firebase Auth, and Firebase Realtime Database.
- Vercel API routes in `/api` use Firebase Admin and SquadCo; no Firebase Cloud Function is needed.
- The current Replit/Vercel frontend is `artifacts/zoom-ng`; `zoom-ng/` is an older duplicate.

## Where things live

- `artifacts/zoom-ng/src/` — active frontend.
- `artifacts/zoom-ng/src/components/AddFundsButton.tsx` — wallet funding and payment-return UI.
- `artifacts/zoom-ng/src/lib/firebase-api.ts` — active data access and secure API calls.
- `api/` and `server/` — Vercel serverless endpoints and shared server-side services.
- `scripts/migrate-firestore-to-rtdb.mjs` — explicit dry-run-first, non-destructive data copy.
- `database.rules.json` — Realtime Database access rules.
- `zoom-ng/` — inactive duplicate; do not treat it as the production frontend.

## Payment and data rules

- Wallet checkout initiation, verification, and webhook processing are server-side Vercel routes.
- Keep the SquadCo secret server-side; never put it in frontend code or `VITE_*` variables.
- Only a transaction verified through the SquadCo API is credited to a wallet.
- Financial writes use Firebase Admin on the server; Realtime Database rules deny client writes to protected balances and transactions.
- Firestore is retained only as the source for the explicit migration copy. Do not add Firestore imports to the active browser data layer.
- Review and deploy `database.rules.json` to Firebase separately from deploying the Vercel app.

## Project conventions

- Keep setup and payment debugging lightweight unless the user expands the scope.
- Admin email: `officialzoom200@gmail.com`.
- Currency: Nigerian naira (₦).
