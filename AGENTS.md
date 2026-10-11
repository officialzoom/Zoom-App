# Development and Deployment

## Architecture

The active Vercel frontend is `artifacts/zoom-ng`. It uses Firebase Authentication and Realtime Database. Sensitive wallet and payment operations are handled by authenticated Vercel serverless routes in `/api`, using the Firebase Admin SDK. Firestore is only used as the source for the optional one-time migration.

The root `zoom-ng` directory is a separate, older frontend. Make frontend changes in `artifacts/zoom-ng` unless explicitly asked to update the legacy copy.

## Vercel Setup

Set the Vercel project's Root Directory to the repository root so that the root `vercel.json` is used. It publishes `artifacts/zoom-ng/dist/public` and routes non-API paths to the app.

Set these browser Firebase configuration variables in Vercel Project Settings > Environment Variables for each environment you deploy:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Vite embeds `VITE_*` values into the built JavaScript, so redeploy after changing them. These are browser configuration values, not server secrets.

Authenticated server routes also require these Vercel environment variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`
- `SQUADCO_SECRET_KEY`

Keep Admin SDK credentials and the SquadCo secret out of source control and out of all `VITE_*` variables. Configure and deploy `database.rules.json` so wallet balances and financial records remain server-controlled.

## Local Development

Install dependencies with pnpm 10 and run `pnpm dev` from the repository root. Run `pnpm build` to typecheck and build the active frontend.

The Firestore-to-Realtime-Database migration command is a dry run by default. Review its output before explicitly passing `-- --apply`.
