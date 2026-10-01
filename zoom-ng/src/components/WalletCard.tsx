import React from "react";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { Wallet } from "@workspace/api-client-react";
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface WalletCardProps {
  wallet: Wallet;
}

export default function WalletCard({ wallet }: WalletCardProps) {
  const isPositive = wallet.weeklyChange > 0;

  return (
    <div className="bg-white rounded-3xl p-6 relative overflow-hidden" style={{ boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08), 0 0 10px rgba(0,0,0,0.02)" }}>
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Balance</p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">{formatCurrency(wallet.balance)}</h2>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
          {formatPercentage(wallet.weeklyChange)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">Active Assets</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(wallet.activeInvestmentsValue)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Total Returns</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(wallet.totalEarnings)}</p>
        </div>
      </div>

      <div className="flex gap-3 relative z-10">
        <Button className="flex-1 rounded-xl h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all group" asChild>
          <Link href="/profile">
            <ArrowUpRight className="w-5 h-5 mr-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            Top Up
          </Link>
        </Button>
        <Button variant="outline" className="flex-1 rounded-xl h-12 text-base font-semibold border-gray-200 hover:bg-gray-50" asChild>
          <Link href="/profile">
            <ArrowDownLeft className="w-5 h-5 mr-2" />
            Withdraw
          </Link>
        </Button>
      </div>
    </div>
  );
}