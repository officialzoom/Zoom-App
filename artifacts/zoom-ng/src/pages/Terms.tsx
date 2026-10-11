import React from "react";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function Terms() {
  return (
    <LegalPageLayout title="Terms & Conditions">
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Using Zoom NG</h2>
        <p>You must be at least 18 years old and provide accurate account information. We may request identity verification before processing account actions.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Investment risks</h2>
        <p>Investing involves risk, including possible loss of capital. Any rates, returns, vehicle images, descriptions, or projections shown in the app are informational and are not a guarantee of future results or proof that a pictured vehicle is an available investment asset. Review the specific listing and ask questions before committing funds.</p>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="mb-2 text-lg font-bold text-gray-900">Important withdrawal eligibility condition</h2>
        <p>Before you add funds or invest, please note: an account needs at least five people to register using its referral code before it can request a withdrawal. You can see your referral count in your profile. Inviting friends is optional for joining, but reaching five registered referrals is currently a condition for withdrawal eligibility. Please consider this condition carefully before depositing or investing.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Wallets, payments, and withdrawals</h2>
        <p>Wallet deposits are recorded after payment is confirmed by the payment provider. Withdrawal requests are subject to the eligibility condition above, available wallet balance, account verification where applicable, and review through the platform. A displayed balance does not mean a withdrawal request has been approved or processed.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Referrals</h2>
        <p>Referral counts are based on accounts registered with your referral code. The app currently does not promise or automatically credit a cash referral bonus. Do not invite others using claims of guaranteed earnings or returns.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Account access and support</h2>
        <p>Keep your sign-in credentials secure and use the in-app support channel to report an account issue or ask about these terms. We may restrict access where needed to investigate suspected misuse or protect users and the platform.</p>
      </section>
    </LegalPageLayout>
  );
}
