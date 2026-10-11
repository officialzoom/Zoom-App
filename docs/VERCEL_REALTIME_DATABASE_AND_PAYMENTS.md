# Vercel, Realtime Database, and SquadCo

The active Zoom NG app uses Firebase Authentication and Firebase Realtime Database. Wallet funding, investment debits, withdrawals, registration, and donations are handled by Vercel serverless routes under `/api`. The browser never receives the SquadCo secret. No Firebase Cloud Function is required.

## Vercel environment

Configure these variables in the Vercel project:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_DATABASE_URL` — the Firebase Realtime Database URL for the project
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_DATABASE_URL`
- `SQUADCO_SECRET_KEY`

`SQUADCO_API_BASE_URL` is optional. The API defaults to SquadCo production; a key beginning with `sandbox_` selects the documented sandbox host. The secret must be added separately to Vercel; Replit Secrets do not automatically populate Vercel.

Set `ADMIN_EMAIL` only if the administrator email should differ from the existing `officialzoom200@gmail.com` account. `APP_BASE_URL` is optional and can override the payment return URL origin.

## One-time Firestore copy

The migration copies user documents and subcollections, donation campaigns, donations, notifications, and banned records into paths with the same names in Realtime Database. Firestore timestamps become Unix milliseconds. It does not delete or modify Firestore.

Run in an environment that has the Firebase Admin variables above:

```sh
pnpm migrate:firestore-to-rtdb
```

The default is a dry run. It reports conflicting paths and writes nothing if an existing Realtime Database value differs. Review the report and resolve conflicts before applying:

```sh
pnpm migrate:firestore-to-rtdb -- --apply
```

The copy is safe to rerun: identical values are left as they are, and any conflicting value stops the entire write pass. For local use, load the Vercel environment into your shell without committing the file:

```sh
vercel env pull .env.local
set -a
source .env.local
set +a
pnpm migrate:firestore-to-rtdb
```

After a clean dry run, use `-- --apply`. Keep Firestore intact as a backup until the migrated app data is verified.
If the preflight finds zero documents, do not treat that as a successful migration; first confirm the Admin credentials target the same Firebase project as the active app.

## Firebase Realtime Database rules

Deploy `database.rules.json` with the Firebase CLI:

```sh
firebase deploy --only database
```

These rules reserve wallet balances, payment records, investments, transactions, and withdrawals for the Admin SDK routes. Users can read their own records and manage only their bank accounts, ad records, and new support tickets.

## SquadCo webhook

In the SquadCo dashboard, configure the payment webhook URL as:

```text
https://YOUR_VERCEL_DOMAIN/api/payments/webhook
```

The route checks `x-squad-encrypted-body` using HMAC-SHA512, then verifies the transaction with SquadCo before crediting the wallet. The transaction reference is applied atomically so callback retries and duplicate webhooks cannot credit the same payment twice. Do not send test or production payments until the correct environment key and Vercel variables are configured.
