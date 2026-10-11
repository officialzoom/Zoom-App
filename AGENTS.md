# Development and Deployment

## Architecture

The Vercel frontend is `artifacts/zoom-ng`. It is a Vite app that talks directly to Firebase Auth and Firestore from the browser. Data operations are in `artifacts/zoom-ng/src/lib/firebase-api.ts`. The root `zoom-ng` directory is an older frontend that still calls `/api/...` endpoints; those endpoints are not deployed by the current Firebase-backed app.

## Vercel Setup

Set the Vercel project's Root Directory to the repository root so that the root `vercel.json` is used. That config publishes `artifacts/zoom-ng/dist/public`; do not set the root to the legacy `zoom-ng` directory.

Set these values in Vercel Project Settings > Environment Variables for the environments you deploy (Production and Preview as needed):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

These are browser Firebase configuration values, not server secrets. Vite embeds `VITE_*` values into the built JavaScript, so redeploy after changing them. Do not add Firebase Admin credentials or the SquadCo secret key to frontend variables.

The current wallet funding UI does not perform a live SquadCo payment. A trusted server-side Firebase Cloud Function is required to create and verify SquadCo transactions. Never credit wallet balances from browser-provided payment results. Configure Firestore Security Rules to restrict each user's data to `users/{uid}/...`.
