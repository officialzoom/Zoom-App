---
name: Referral + withdrawal unlock
description: Withdrawals are locked until the user has 5 referrals. Enforced server-side.
---

**Rule:** A user must have `referralCount >= 5` before the withdraw endpoint accepts their request.

**Why:** Business requirement to grow the user base — unlock withdrawals as incentive to refer friends.

**How to apply:**
- Backend: `artifacts/api-server/src/routes/wallet.ts` POST /wallet/withdraw checks `user.referralCount < 5`
- Frontend: `Profile.tsx` checks `profile.referralCount >= 5` to enable the withdrawal button; shows a lockout message with `referralsNeeded` count
- Referral code is in `UserProfile.referralCode` (added to OpenAPI spec); link format is `/signup?ref=<code>`
- When a referred user registers, the referrer's `referral_count` is incremented and a notification is inserted
