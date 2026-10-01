import React from "react";
import NavBar from "@/components/NavBar";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <p>By using Zoom NG, you agree to the following terms and conditions regarding our vehicle investment platform.</p>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">1. Investment Nature</h2>
            <p>Investments in vehicle fleets are subject to market risks. While we strive for consistent returns, guaranteed returns are based on the specific asset tier selected.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">2. User Eligibility</h2>
            <p>You must be at least 18 years old and have a valid method of payment through SquadCo to invest on this platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">3. Account Security</h2>
            <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
          </section>
        </div>
      </main>
    </div>
  );
}