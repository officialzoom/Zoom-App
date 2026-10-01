import React from "react";
import NavBar from "@/components/NavBar";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <p>Zoom NG maintains a transparent refund policy regarding wallet deposits and active investments.</p>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">1. Wallet Deposits</h2>
            <p>Funds deposited into your wallet via SquadCo are refundable only if they have not been invested in any asset fleet.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">2. Active Investments</h2>
            <p>Once funds are locked into a vehicle asset, they cannot be refunded until the investment duration (days) has elapsed.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">3. Withdrawal Processing</h2>
            <p>All valid refund and withdrawal requests are processed within 12 hours of approval by the administration.</p>
          </section>
        </div>
      </main>
    </div>
  );
}