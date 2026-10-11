import React from "react";
import LegalPageLayout from "@/components/LegalPageLayout";

export default function Privacy() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Information we handle</h2>
        <p>Depending on how you use Zoom NG, we handle account details such as your name and email, referral information, bank details you submit, wallet and investment records, payment references, and messages sent to support.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">How information is used</h2>
        <p>We use this information to create and secure accounts, display account activity, process payments and wallet operations, manage referral counts, respond to support requests, and protect the service from misuse.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Service providers</h2>
        <p>Zoom NG relies on service providers for hosting, authentication, database, and payment processing. Information needed for those services may be processed by providers such as Firebase, Vercel, and SquadCo under their applicable terms and privacy practices.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Security and retention</h2>
        <p>We use access controls and service-provider safeguards to protect account and transaction information. No online service can promise absolute security. We retain information while it is needed to operate the account, maintain transaction records, provide support, and meet applicable obligations.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Your choices and requests</h2>
        <p>You can contact support through the app to ask about your personal information or request account deletion. Some transaction or security records may need to be retained where required for legitimate operational or legal purposes. We will respond to requests in accordance with applicable requirements.</p>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-gray-900">Changes and questions</h2>
        <p>We may update this policy when our practices change. Please review this page for the latest version. For privacy questions, contact support through your account.</p>
      </section>
    </LegalPageLayout>
  );
}
