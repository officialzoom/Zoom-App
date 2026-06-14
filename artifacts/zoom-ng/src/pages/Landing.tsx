import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, Shield, Users, Car, Truck, ChevronRight, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 fill-current text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">zoom<span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1 text-sm">NG</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="font-semibold">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="font-bold rounded-xl shadow-md shadow-primary/20">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-primary/5 pt-20 pb-28 px-4">
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-8">
            <Star className="w-4 h-4 fill-current" /> #1 Vehicle Investment Platform in Nigeria
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Invest in Nigerian<br />
            <span className="text-primary">Transport Fleets</span><br />
            & Earn More
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of Nigerians earning passive income by investing in verified transport assets — cars, buses, and trucks — with returns up to 35% per cycle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto font-bold rounded-2xl h-14 px-10 text-lg shadow-lg shadow-primary/30">
                Start Investing <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-bold rounded-2xl h-14 px-10 text-lg border-2">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12 text-center">
            {[{ n: "12,000+", l: "Active Investors" }, { n: "₦2.4B+", l: "Total Invested" }, { n: "35%", l: "Max Returns" }].map(s => (
              <div key={s.l}>
                <div className="text-2xl font-extrabold text-gray-900">{s.n}</div>
                <div className="text-sm text-gray-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">Why Choose Zoom NG?</h2>
          <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">Built for Nigerians who want their money working harder for them.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: "High Yield Returns", desc: "Earn up to 35% returns per investment cycle on verified transport assets across Nigeria.", color: "#FBC02D" },
              { icon: Shield, title: "Secure & Verified", desc: "All vehicle assets are verified and insured. Your investment is protected at every step.", color: "#10b981" },
              { icon: Users, title: "Referral Rewards", desc: "Earn ₦5,000 bonus for every friend you refer who makes their first investment.", color: "#6366f1" },
              { icon: Car, title: "Browse Real Fleets", desc: "View actual photos of cars, buses, and trucks you're investing in before committing.", color: "#f97316" },
              { icon: Truck, title: "Multiple Asset Classes", desc: "Choose from economy cars, luxury vehicles, minibuses, vans, and heavy-duty trucks.", color: "#ec4899" },
              { icon: Zap, title: "Instant Wallet", desc: "Fund your wallet instantly and start earning from day one. Withdraw when you're ready.", color: "#8b5cf6" },
            ].map(f => (
              <div key={f.title} className="bg-gray-50 rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${f.color}20` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-500 mb-14">Start earning in 3 simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", t: "Create Account", d: "Sign up with your email and verify your identity in minutes." },
              { n: "02", t: "Fund Your Wallet", d: "Add money to your Zoom NG wallet via bank transfer or USSD." },
              { n: "03", t: "Choose & Invest", d: "Browse available fleets, pick your asset, and start earning returns." },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-extrabold mx-auto mb-4">{s.n}</div>
                <h3 className="font-bold text-xl mb-2">{s.t}</h3>
                <p className="text-gray-500">{s.d}</p>
              </div>
            ))}
          </div>
          <Link href="/signup">
            <Button size="lg" className="mt-12 font-bold rounded-2xl h-14 px-12 text-lg shadow-lg shadow-primary/30">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Terms & Privacy */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-4">Terms & Conditions</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>By using Zoom NG, you agree to invest with full understanding of the risks involved in vehicle asset investments.</p>
                <p>All investments are subject to market conditions. Past returns do not guarantee future performance.</p>
                <p>Users must be 18+ and provide valid identification for KYC verification before withdrawal.</p>
                <p>Zoom NG reserves the right to suspend accounts found to be in violation of our community guidelines.</p>
                <p>Withdrawals require 5 successful referrals to unlock. This ensures our community grows sustainably.</p>
                <p>Minimum investment amount is ₦5,000 per asset tier. Maximum is ₦10,000,000 per cycle.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-4">Privacy Policy</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>We collect only the data necessary to provide our investment services: name, email, phone, and bank details.</p>
                <p>Your financial data is encrypted using bank-grade 256-bit SSL encryption and never sold to third parties.</p>
                <p>We use Firebase Authentication for secure login. Your password is never stored in plain text.</p>
                <p>Transaction history and wallet data are stored securely on our servers in compliance with NDPR.</p>
                <p>You may request deletion of your account and all associated data at any time by contacting support.</p>
                <p>We may use anonymized, aggregated data to improve our platform and investment analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 fill-current text-white" />
              </div>
              <span className="font-bold text-white text-xl">Zoom NG</span>
            </div>
            <p className="text-sm text-center">© 2026 Zoom NG. All rights reserved. Regulated by the Nigerian Investment Authority.</p>
            <div className="flex gap-6 text-sm">
              <a href="mailto:support@zoomng.com" className="hover:text-white transition-colors">support@zoomng.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
