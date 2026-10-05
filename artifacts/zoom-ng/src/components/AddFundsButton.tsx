import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { getGetWalletQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const handleFund = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      toast({ title: "Invalid amount", description: "Minimum is ₦100", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        toast({ title: "Please log in first", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: numAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

      // Redirect to SquadCo checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Check for payment callback on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fundRef = params.get("fund");
    if (fundRef) {
      (async () => {
        const token = await getToken();
        if (!token) return;
        try {
          const res = await fetch(`/api/wallet/fund/verify/${fundRef}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.verified) {
            toast({ title: "Payment Successful", description: `${formatCurrency(data.amount)} added to your wallet` });
            queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          }
        } catch {
          // ignore verification errors
        }
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      })();
    }
  }, []);

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
            {loading ? "Redirecting..." : `Add ${amount ? formatCurrency(Number(amount)) : "Funds"}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You will be redirected to SquadCo secure checkout
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
