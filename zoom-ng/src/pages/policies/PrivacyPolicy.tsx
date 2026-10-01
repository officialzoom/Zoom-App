import React from "react";
import NavBar from "@/components/NavBar";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-muted-foreground">
          <p>Welcome to Zoom NG. Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.</p>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">1. Information Collection</h2>
            <p>We collect information you provide during registration, including your name, email, and phone number, to manage your investments and account security.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">2. Use of Data</h2>
            <p>Your data is used to verify your identity, process payments via SquadCo, and provide updates on your vehicle investments.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">3. Data Protection</h2>
            <p>We use industry-standard encryption and Firebase's secure infrastructure to ensure your data is protected against unauthorized access.</p>
          </section>
        </div>
      </main>
    </div>
  );
}