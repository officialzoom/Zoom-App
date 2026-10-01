# Base44 Dev Environment

## Architecture

pnpm monorepo with three runtime services in `docker-compose.base44.yml`:
- **db** — PostgreSQL 16
- **api** — Express 5 (`artifacts/api-server`), internal port 3001
- **web** — Vite dev server (`artifacts/zoom-ng`), host port 3000 → container 5173

The Vite dev server proxies `/api` requests to the API service (`API_PROXY_TARGET=http://api:3001`). Single-origin wiring — no separate API port exposed to the host.

## Setup Quirks

- **pnpm 10 required** — `pnpm-workspace.yaml` uses pnpm 10 features (`minimumReleaseAge`, `catalog`, `onlyBuiltDependencies`). The `Dockerfile.base44` installs pnpm 10 via `npm install -g pnpm@10`.
- **Health check path is `/api/healthz`** — all routes are mounted under the `/api` prefix in `app.ts`, so the health endpoint is at `/api/healthz`, not `/healthz`.
- **API server has no watch mode** — the dev script (`artifacts/api-server/package.json`) does `build && start` (esbuild bundle then run). API code changes require restarting the `api` service: `docker compose -f docker-compose.base44.yml restart api`.
- **DB migration uses `drizzle-kit push --force`** — the `migrate` one-shot service runs `pnpm --filter @workspace/db run push-force` after the DB is healthy and deps are installed.
- **Firebase admin is lazy-initialized** — `auth.ts` only calls `admin.initializeApp()` when `requireAuth`/`optionalAuth` runs. The API boots fine without `GOOGLE_APPLICATION_CREDENTIALS`; auth-protected endpoints return 401 until real Firebase credentials are provided.

## Firebase Credentials

Frontend needs `VITE_FIREBASE_*` env vars (from Firebase Console → Project Settings → General → Web app config). Placeholder values in `.env.base44-defaults` let the app boot and render the landing page, but auth/login won't work without real values. Real values are delivered via `/run/base44/app.env` (set via the Base44 secrets dashboard) and override the placeholders.

Backend needs a Firebase service account JSON for `firebase-admin` token verification. Without it, the API serves public endpoints but returns 401 on auth-protected routes.

## Verifying the App

```sh
docker compose -f docker-compose.base44.yml ps          # all services healthy
curl http://localhost:3000/api/healthz                   # → {"status":"ok"}
curl http://localhost:3000/ | grep "vite/client"         # confirms live dev server
```
