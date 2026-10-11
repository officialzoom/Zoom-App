import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, Shield, Users, Car, Truck, ChevronRight, Star, Wallet } from "lucide-react";
import TelegramCta from "@/components/TelegramCta";

const FLEET_IMAGE =
  "https://media.base44.com/images/public/6abdad8b1f1e4a143ebf1cb7/a48a6aa1d_generated_f38c767c.png";

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
            <Star className="w-4 h-4 fill-current" /> Transport asset opportunities in Nigeria
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Explore Nigerian<br />
            <span className="text-primary">Transport Assets</span><br />
            with clarity
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Review vehicle asset listings, timelines, and risks before deciding whether an opportunity is right for you. Investing involves risk, and returns are not guaranteed.
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
          <div className="mt-5 flex justify-center">
            <TelegramCta
              label="Get official updates on Telegram"
              variant="ghost"
              className="text-gray-600 hover:text-primary"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 bg-gray-50">
        <div className="container mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <img
              src={FLEET_IMAGE}
              alt="Zoom NG transport fleet"
              className="h-56 w-full object-cover md:h-80"
              loading="lazy"
            />
            <div className="p-5 md:p-7">
              <h2 className="text-2xl font-bold">Explore transport asset examples</h2>
              <p className="mt-2 text-sm text-gray-500">
                Discover vehicle categories and explore the transport opportunities available on Zoom NG.
              </p>
            </div>
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
              { icon: TrendingUp, title: "Review projected returns", desc: "See the stated rate and duration for each listing. Projections are not guarantees; investment values can change and capital is at risk.", color: "#FBC02D" },
              { icon: Shield, title: "Make an informed choice", desc: "Review the available listing information and ask questions before committing funds. Do not invest money you cannot afford to lose.", color: "#10b981" },
              { icon: Users, title: "Invite your community", desc: "Share your referral code with friends. Five people must register with your code before your account can request a withdrawal.", color: "#6366f1" },
              { icon: Car, title: "Explore vehicle categories", desc: "Discover cars, buses, and trucks across a range of transport opportunities.", color: "#f97316" },
              { icon: Truck, title: "Explore asset categories", desc: "Review listings across cars, buses, vans, and heavy-duty vehicles, including their stated amounts and timelines.", color: "#ec4899" },
              { icon: Wallet, title: "Understand wallet access", desc: "Deposits are recorded after provider confirmation. Withdrawal requests are subject to the five-referral eligibility condition.", color: "#8b5cf6" },
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
          <p className="text-gray-500 mb-14">Review each step and the conditions before you commit funds.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", t: "Review the conditions", d: "Read the investment risks and withdrawal eligibility requirement before signing up or adding funds." },
              { n: "02", t: "Create and fund an account", d: "Create an account and use the available payment provider to fund your wallet." },
              { n: "03", t: "Review listings", d: "Compare the stated asset details, amounts, and timelines before deciding whether to invest." },
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
            <p className="text-sm text-center">© 2026 Zoom NG. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <a href="mailto:support@zoomng.com" className="hover:text-white transition-colors">Support</a>
              <TelegramCta
                label="Follow official Telegram updates"
                variant="ghost"
                className="h-auto min-h-0 p-0 text-gray-400 hover:bg-transparent hover:text-white"
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
