import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetWalletQueryKey, getGetDashboardSummaryQueryKey, initiateWalletFund, verifyWalletFund } from "@/lib/firebase-api";
import { formatCurrency } from "@/lib/formatting";

interface AddFundsButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

const QUICK_AMOUNTS = [5000, 10000, 20000, 30000];

export default function AddFundsButton({ variant = "default", size = "default", className = "", label = "Add Funds" }: AddFundsButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const handledReference = useRef<string | null>(null);

  const handleFund = async () => {
    const numAmount = Number(amount);
    if (!Number.isSafeInteger(numAmount) || numAmount < 100) {
      toast({ title: "Invalid amount", description: "Minimum is ₦100", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (!user) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }
      const { checkoutUrl } = await initiateWalletFund(user.uid, numAmount);
      window.location.assign(checkoutUrl);
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fundRef = new URLSearchParams(window.location.search).get("fund");
    if (!fundRef || authLoading || !user || handledReference.current === fundRef) return;
    handledReference.current = fundRef;

    let cancelled = false;
    void verifyWalletFund(user.uid, fundRef)
      .then((result) => {
        if (cancelled) return;
        if (result.verified) {
          toast({ title: "Payment successful", description: `${formatCurrency(result.amount)} added to your wallet` });
          void queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        } else {
          toast({
            title: "Payment is still being confirmed",
            description: "Your wallet will only be credited after SquadCo confirms the transaction.",
          });
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("fund");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast({
          title: "Could not confirm payment yet",
          description: error instanceof Error ? error.message : "Please reload this page to retry verification.",
          variant: "destructive",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, toast, queryClient]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Plus className="w-4 h-4 mr-1" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Funds to Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="h-14 rounded-xl text-lg font-bold bg-gray-50 border-gray-200"
              min={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">Minimum: ₦100</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_AMOUNTS.map(amt => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                className="rounded-xl font-semibold"
                onClick={() => setAmount(String(amt))}
              >
                ₦{amt.toLocaleString("en-NG")}
              </Button>
            ))}
          </div>
          <Button
            onClick={handleFund}
            disabled={loading}
            className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20"
          >
            {loading ? "Connecting to SquadCo..." : `Continue to payment${amount ? ` · ${formatCurrency(Number(amount))}` : ""}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Your wallet is credited only after the server verifies the completed SquadCo payment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
