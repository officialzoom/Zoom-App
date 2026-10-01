import React from "react";
import NavBar from "@/components/NavBar";
import WalletCard from "@/components/WalletCard";
import AssetTierCard from "@/components/AssetTierCard";
import TransactionItem from "@/components/TransactionItem";
import { useGetAssets, useGetWallet, useGetTransactions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight, PlusCircle } from "lucide-react";

export default function Dashboard() {
  const { data: wallet, isLoading: walletLoading } = useGetWallet();
  const { data: assets } = useGetAssets();
  const { data: transactions, isLoading: txLoading } = useGetTransactions();
  
  const featuredAssets = Array.isArray(assets) ? assets.slice(0, 3) : [];
  const recentTransactions = Array.isArray(transactions) ? transactions.slice(0, 3) : [];

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="container mx-auto px-4 pt-8">
          <div className="animate-pulse space-y-8">
            <div className="h-40 bg-gray-100 rounded-3xl"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-40 bg-gray-100 rounded-3xl"></div>
              <div className="h-40 bg-gray-100 rounded-3xl"></div>
              <div className="h-40 bg-gray-100 rounded-3xl"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      
      <main className="container mx-auto px-4 pt-8">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-foreground">Overview</h1>
                <Button className="rounded-xl h-12 px-6 font-bold shadow-lg shadow-primary/20 flex items-center gap-2" asChild>
                  <Link href="/add-funds">
                    <PlusCircle className="w-5 h-5" /> Add Funds
                  </Link>
                </Button>
              </div>
              <WalletCard wallet={{
                balance: wallet?.balance?.toString() || "0",
                activeInvestmentsValue: wallet?.activeInvestmentsValue?.toString() || "0",
                totalEarnings: wallet?.totalEarnings?.toString() || "0",
                weeklyChange: wallet?.weeklyChange || "0%"
              }} />
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Featured Assets</h2>
                <Button variant="ghost" className="text-primary font-semibold hover:text-primary/80 hover:bg-primary/10" asChild>
                  <Link href="/explore">View All <ChevronRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {featuredAssets.length > 0 ? (
                  featuredAssets.map(asset => (
                    <AssetTierCard key={asset.id} asset={asset} />
                  ))
                ) : (
                  <div className="col-span-3 text-center py-12 text-muted-foreground bg-white rounded-3xl border border-dashed">
                    No active assets to show. Visit Explore page.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white rounded-3xl p-6 border border-gray-100" style={{ boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
                <Button variant="link" className="text-sm text-muted-foreground hover:text-foreground px-0">See All</Button>
              </div>

              <div className="space-y-2">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map(tx => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))
                ) : (
                  <p className="text-center py-8 text-sm text-muted-foreground">No recent transactions</p>
                )}
              </div>
            </section>

            <section className="bg-primary text-primary-foreground rounded-3xl p-8 relative overflow-hidden" style={{ boxShadow: "0 10px 40px -10px rgba(251,192,45,0.4)" }}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h2 className="text-2xl font-bold mb-3 relative z-10">Refer & Earn ₦5,000</h2>
              <p className="text-primary-foreground/80 mb-6 relative z-10 text-sm">Invite friends to invest on Zoom NG and earn rewards for every successful referral.</p>
              <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl h-12 font-bold shadow-lg" asChild>
                <Link href="/profile">Get Referral Link</Link>
              </Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
