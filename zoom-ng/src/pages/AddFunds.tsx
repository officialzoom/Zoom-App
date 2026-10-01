import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import { useGetWallet, useTopUpWallet } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const FUND_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export default function AddFunds() {
  const { data: wallet } = useGetWallet();
  const fundWallet = useTopUpWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const handleFund = async () => {
    if (!amount || Number(amount) < 100) {
      toast({ title: "Invalid amount", description: "Minimum deposit is ₦100", variant: "destructive" });
      return;
    }

    fundWallet.mutate({ data: { amount: Number(amount) } }, {
      onSuccess: (data: any) => {
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          toast({ title: "Error", description: "Payment gateway URL not received", variant: "destructive" });
        }
      },
      onError: (err: any) => toast({ title: "Funding failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <NavBar />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Add Funds to Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Select Amount (₦)</Label>
              <div className="grid grid-cols-3 gap-2">
                {FUND_AMOUNTS.map(val => (
                  <Button 
                    key={val} 
                    variant={amount === String(val) ? "default" : "outline"} 
                    className="rounded-xl h-12 font-bold"
                    onClick={() => setAmount(String(val))}
                  >
                    {val.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Or enter custom amount</Label>
              <Input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                placeholder="Enter amount in Naira" 
                className="h-14 rounded-2xl text-xl font-bold text-center bg-gray-50" 
              />
            </div>
            <Button 
              onClick={handleFund} 
              disabled={fundWallet.isPending} 
              className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20"
            >
              {fundWallet.isPending ? "Processing..." : "Proceed to Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
