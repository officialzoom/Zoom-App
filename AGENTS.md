# Base44 Dev Environment

## Architecture

pnpm monorepo with a single runtime service in `docker-compose.base44.yml`:
- **web** — Vite dev server (`artifacts/zoom-ng`), host port 3000

No Docker backend — the frontend talks directly to Firebase (Auth + Firestore) from the browser. All data operations go through `artifacts/zoom-ng/src/lib/firebase-api.ts`, which provides React Query hooks backed by Firestore queries. The old Express API (`artifacts/api-server`) is no longer used at runtime but remains in the repo for reference.

## Setup Quirks

- **pnpm 10 required** — `pnpm-workspace.yaml` uses pnpm 10 features (`minimumReleaseAge`, `catalog`, `onlyBuiltDependencies`). The compose service installs pnpm 10 via `npm install -g pnpm@10` on startup.
- **Frontend Firebase config from env** — `artifacts/zoom-ng/src/lib/firebase.ts` reads `VITE_FIREBASE_*` env vars for the web config. These are delivered via `/run/base44/app.env`.
- **Duplicate `zoom-ng` copies** — the repo has TWO tracked copies of the frontend: `/zoom-ng` and `/artifacts/zoom-ng`. The pnpm workspace is `artifacts/*`, so the Vite dev server serves **`/artifacts/zoom-ng`**, not `/zoom-ng`. When editing the frontend, edit `/artifacts/zoom-ng` (and keep `/zoom-ng` in sync if you want git to stay consistent). File-tool paths `zoom-ng/...` resolve to `/zoom-ng`, so prefer `artifacts/zoom-ng/...` paths for changes that must appear in the live preview.
- **Assets are static** — the fleet investment tiers are defined in `firebase-api.ts` (same data the old Express backend served). The Explore page renders its investment cards from this.
- **SquadCo payments need Cloud Functions** — wallet funding via SquadCo requires a server-side secret key. The frontend records the payment intent in Firestore, but the actual SquadCo checkout URL and verification need a Firebase Cloud Function (not yet deployed). `AddFundsButton` shows a placeholder message until Cloud Functions are set up.
- **Firestore Security Rules** — since the frontend reads/writes Firestore directly, the Firebase project must have security rules configured to restrict each user to their own data (`users/{uid}/...`). Without rules, data is either locked (default deny) or open (insecure). Configure rules in the Firebase Console > Firestore > Rules.

## Firebase Credentials

The frontend needs `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` for the Firebase web SDK. These are delivered via `/run/base44/app.env` (set via the Base44 secrets dashboard).

The backend admin SDK secrets (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`) are no longer needed at runtime since there's no Express backend. They would only be needed if you deploy Firebase Cloud Functions for SquadCo payment integration.

`SQUADCO_SECRET_KEY` is needed only for Cloud Functions (SquadCo payment gateway).

## Verifying the App

```sh
docker compose -f docker-compose.base44.yml ps          # web service healthy
curl http://localhost:3000/ | grep "vite/client"         # confirms live dev server
```
