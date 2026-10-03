# Base44 Dev Environment

## Architecture

pnpm monorepo with two runtime services in `docker-compose.base44.yml`:
- **api** — Express 5 (`artifacts/api-server`), internal port 3001
- **web** — Vite dev server (`zoom-ng`), host port 3000

No database service — the backend uses Firebase Realtime Database (cloud). The Vite dev server proxies `/api` requests to the API service (`API_PROXY_TARGET=http://api:3001`). Single-origin wiring — no separate API port exposed to the host.

## Setup Quirks

- **pnpm 10 required** — `pnpm-workspace.yaml` uses pnpm 10 features (`minimumReleaseAge`, `catalog`, `onlyBuiltDependencies`). The compose services install pnpm 10 via `npm install -g pnpm@10` on startup.
- **Health check path is `/api/healthz`** — all routes are mounted under the `/api` prefix in `app.ts`, so the health endpoint is at `/api/healthz`, not `/healthz`.
- **API server has no watch mode** — the dev script (`artifacts/api-server/package.json`) does `build && start` (esbuild bundle then run). API code changes require restarting the `api` service: `docker compose -f docker-compose.base44.yml restart api`.
- **Firebase admin is lazy-initialized** — `firebase.ts` only calls `initializeApp()` when `getFirebaseDatabase()` is first invoked (via `requireAuth`/`optionalAuth`). The API boots fine without backend Firebase credentials; auth-protected endpoints return 401 until real credentials are provided.
- **Frontend Firebase config is hardcoded** — `zoom-ng/src/lib/firebase.ts` has the Firebase web config inline, not from env vars. The `VITE_FIREBASE_*` env vars in `.env.base44-defaults` are unused by the current frontend code.

## Firebase Credentials

Backend needs `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_DATABASE_URL` for `firebase-admin` token verification and Realtime Database access. Without them, the API serves public endpoints (health) but returns 401 on auth-protected routes. These are delivered via `/run/base44/app.env` (set via the Base44 secrets dashboard).

`SQUADCO_SECRET_KEY` is needed for the payment/wallet endpoints (SquadCo gateway). Without it, payment endpoints return 503.

## Verifying the App

```sh
docker compose -f docker-compose.base44.yml ps          # all services healthy
curl http://localhost:3000/api/healthz                   # → {"status":"ok"}
curl http://localhost:3000/ | grep "vite/client"         # confirms live dev server
```
