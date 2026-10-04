import React, { useState } from "react";
import { AssetTier, useCreateInvestment, getGetInvestmentsQueryKey, getGetWalletQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Info, Clock, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AssetTierCardProps {
  asset: AssetTier;
}

export default function AssetTierCard({ asset }: AssetTierCardProps) {
  const [amount, setAmount] = useState<string>(asset.entryAmount.toString());
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvestment = useCreateInvestment();

  const progress = (asset.slotsUsed / asset.totalSlots) * 100;
  const isSoldOut = asset.slotsUsed >= asset.totalSlots;
  
  const expectedReturn = Number(amount) * (asset.returnRate / 100);

  const handleInvest = () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < asset.entryAmount) {
      toast({ title: "Invalid amount", description: `Minimum investment is ${formatCurrency(asset.entryAmount)}`, variant: "destructive" });
      return;
    }
    if (numAmount > 30000) {
      toast({ title: "Amount too high", description: `Maximum investment is ${formatCurrency(30000)} to keep the platform accessible.`, variant: "destructive" });
      return;
    }

    createInvestment.mutate({
      data: { assetId: asset.id, amount: numAmount, lockDays: asset.durationDays }
    }, {
      onSuccess: () => {
        toast({ title: "Investment Successful", description: `You have invested in ${asset.label}` });
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetInvestmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: () => {
        toast({ title: "Investment Failed", description: "Please check your balance and try again.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-white rounded-3xl p-5 border border-gray-100 hover:border-primary/30 transition-colors flex flex-col h-full" style={{ boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)" }}>
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: asset.bgColor, color: asset.color }}>
            {asset.category === 'car' ? '🚗' : asset.category === 'bus' ? '🚌' : '🚛'}
          </div>
          <div className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
            {asset.tag}
          </div>
        </div>

        <h3 className="text-xl font-bold text-foreground mb-1">{asset.label}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{asset.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Entry</p>
            <p className="font-semibold text-foreground">{formatCurrency(asset.entryAmount)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Return</p>
            <p className="font-semibold text-green-600">+{asset.returnRate}%</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 col-span-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{asset.durationDays} Days Lock</span>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-xs font-medium mb-2">
            <span className="text-muted-foreground">Availability</span>
            <span className="text-foreground">{asset.slotsUsed}/{asset.totalSlots} Slots</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <DialogTrigger asChild>
          <Button className="w-full rounded-xl font-semibold shadow-sm" disabled={isSoldOut}>
            {isSoldOut ? "Sold Out" : "Invest Now"}
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">Invest in {asset.label}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white shadow-sm" style={{ color: asset.color }}>
                {asset.category === 'car' ? '🚗' : asset.category === 'bus' ? '🚌' : '🚛'}
              </div>
              <div>
                <p className="font-semibold text-sm">{asset.label}</p>
                <p className="text-xs text-muted-foreground">{asset.durationDays} Days Duration</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Return Rate</p>
              <p className="font-bold text-green-600">+{asset.returnRate}%</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount" className="text-sm font-semibold">Investment Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={30000}
              className="h-14 rounded-xl text-lg font-semibold bg-gray-50 border-gray-200 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Min: {formatCurrency(asset.entryAmount)} • Max: {formatCurrency(30000)}
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">Expected Return</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(expectedReturn)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-primary/10">
              <span className="text-sm font-medium text-foreground">Total Payout</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(Number(amount) + expectedReturn)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 sm:justify-start">
          <Button 
            type="button" 
            className="w-full rounded-xl h-14 text-base font-bold shadow-lg shadow-primary/20"
            onClick={handleInvest}
            disabled={createInvestment.isPending || Number(amount) < asset.entryAmount}
          >
            {createInvestment.isPending ? "Processing..." : "Confirm Investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}