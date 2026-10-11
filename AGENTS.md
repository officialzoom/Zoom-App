# Base44 Dev Environment

## Architecture

pnpm monorepo with a single runtime service in `docker-compose.base44.yml`:
- **web** — Vite dev server (`artifacts/zoom-ng`), host port 3000

The active frontend is `artifacts/zoom-ng`. It uses Firebase Authentication and Realtime Database. Sensitive wallet changes are performed by authenticated Vercel serverless routes in `/api`, using the Admin SDK. Firestore is not used by the active browser data layer; the one-time migration script reads it as a source and does not alter it.

## Setup Quirks

- **pnpm 10 required** — `pnpm-workspace.yaml` uses pnpm 10 features (`minimumReleaseAge`, `catalog`, `onlyBuiltDependencies`). The compose service installs pnpm 10 via `npm install -g pnpm@10` on startup.
- **Frontend Firebase config from env** — `artifacts/zoom-ng/src/lib/firebase.ts` reads `VITE_FIREBASE_*` env vars for the web config. These are delivered via `/run/base44/app.env`.
- **Duplicate `zoom-ng` copies** — the repo has TWO tracked copies of the frontend: `/zoom-ng` and `/artifacts/zoom-ng`. The pnpm workspace is `artifacts/*`, so the Vite dev server serves **`/artifacts/zoom-ng`**, not `/zoom-ng`. When editing the frontend, edit `/artifacts/zoom-ng` (and keep `/zoom-ng` in sync if you want git to stay consistent). File-tool paths `zoom-ng/...` resolve to `/zoom-ng`, so prefer `artifacts/zoom-ng/...` paths for changes that must appear in the live preview.
- **Assets are static** — the fleet investment tiers are defined in `firebase-api.ts` (same data the old Express backend served). The Explore page renders its investment cards from this.
- **Vercel API secrets** — configure Firebase Admin credentials and `SQUADCO_SECRET_KEY` in the Vercel project; Replit Secrets are not copied to Vercel.
- **Realtime Database rules** — deploy `database.rules.json` so wallet balances and financial records remain server-controlled.
- **Firestore migration** — `pnpm migrate:firestore-to-rtdb` is a dry run; apply only after reviewing it with `pnpm migrate:firestore-to-rtdb -- --apply`.

## Firebase Credentials

The frontend needs `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` for the Firebase web SDK. These are delivered via `/run/base44/app.env` (set via the Base44 secrets dashboard).

Vercel server routes need `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`, and `SQUADCO_SECRET_KEY`. Keep those secrets out of source control and `VITE_*` variables.

## Verifying the App

```sh
docker compose -f docker-compose.base44.yml ps          # web service healthy
curl http://localhost:3000/ | grep "vite/client"         # confirms live dev server
```
