import React from "react";
import NavBar from "@/components/NavBar";
import WalletCard from "@/components/WalletCard";
import AssetTierCard from "@/components/AssetTierCard";
import TransactionItem from "@/components/TransactionItem";
import { useGetDashboardSummary, useGetAssets } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: assets, isLoading: isAssetsLoading } = useGetAssets();

  const featuredAssets = Array.isArray(assets) ? assets.slice(0, 3) : [];
  const recentTransactions = Array.isArray(summary?.recentTransactions)
    ? summary.recentTransactions.filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      
      <main className="container mx-auto px-4 pt-8">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <section>
              <h1 className="text-3xl font-bold text-foreground mb-6">Overview</h1>
              {isSummaryLoading || !summary ? (
                <Skeleton className="w-full h-64 rounded-3xl" />
              ) : (
                <WalletCard wallet={{
                  balance: summary.walletBalance,
                  activeInvestmentsValue: summary.activeInvestmentsValue,
                  totalEarnings: summary.totalEarnings,
                  weeklyChange: summary.weeklyChange
                }} />
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Featured Assets</h2>
                <Button variant="ghost" className="text-primary font-semibold hover:text-primary/80 hover:bg-primary/10" asChild>
                  <Link href="/explore">View All <ChevronRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </div>
              
              {isAssetsLoading ? (
                <div className="grid md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-3xl" />)}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {featuredAssets.map(asset => (
                    <AssetTierCard key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <section className="bg-white rounded-3xl p-6 border border-gray-100" style={{ boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
                <Button variant="link" className="text-sm text-muted-foreground hover:text-foreground px-0">See All</Button>
              </div>

              {isSummaryLoading || !summary ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-full h-16 rounded-2xl" />)}
                </div>
              ) : recentTransactions.length > 0 ? (
                <div className="space-y-2">
                  {recentTransactions.map(tx => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              )}
            </section>

            <section className="bg-primary text-primary-foreground rounded-3xl p-8 relative overflow-hidden" style={{ boxShadow: "0 10px 40px -10px rgba(251,192,45,0.4)" }}>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h2 className="text-2xl font-bold mb-3 relative z-10">Refer & Earn ₦5,000</h2>
              <p className="text-primary-foreground/80 mb-6 relative z-10 text-sm">Invite friends to invest on Zoom NG and earn rewards for every successful referral.</p>
              <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl h-12 font-bold shadow-lg">
                Get Referral Link
              </Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
