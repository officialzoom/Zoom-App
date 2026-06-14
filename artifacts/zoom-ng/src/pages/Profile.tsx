import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import { useGetUserProfile, useGetBanks, useAddBank, useRemoveBank, useGetWallet, useWithdrawFromWallet, getGetUserProfileQueryKey, getGetBanksQueryKey, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Plus, Trash2, LogOut, Settings, CreditCard, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatting";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile();
  const { data: banks, isLoading: banksLoading } = useGetBanks();
  const { data: wallet } = useGetWallet();
  
  const addBank = useAddBank();
  const removeBank = useRemoveBank();
  const withdraw = useWithdrawFromWallet();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [bankForm, setBankForm] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bankId: "" });
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    addBank.mutate({ data: bankForm }, {
      onSuccess: () => {
        toast({ title: "Bank account added successfully" });
        setIsBankOpen(false);
        setBankForm({ bankName: "", accountName: "", accountNumber: "" });
        queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() });
      }
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    withdraw.mutate({ data: { amount: Number(withdrawForm.amount), bankId: withdrawForm.bankId } }, {
      onSuccess: () => {
        toast({ title: "Withdrawal processing", description: "Funds will arrive in your account shortly" });
        setIsWithdrawOpen(false);
        setWithdrawForm({ amount: "", bankId: "" });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      },
      onError: () => toast({ title: "Withdrawal failed", variant: "destructive" })
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-3xl mx-auto grid md:grid-cols-12 gap-8">
          
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-primary/20 to-transparent"></div>
              
              {profileLoading ? (
                <div className="h-40 animate-pulse"></div>
              ) : profile && (
                <div className="relative z-10">
                  <Avatar className="w-24 h-24 mx-auto border-4 border-white shadow-lg mb-4">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{profile.avatarInitials}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
                    {profile.displayName} 
                    {profile.kycVerified && <ShieldCheck className="w-5 h-5 text-green-500" />}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">{profile.email}</p>
                  
                  <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-2 text-left">
                    <div>
                      <p className="text-xs text-muted-foreground">Investor Level</p>
                      <p className="font-semibold text-primary">{profile.investorLevel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Referrals</p>
                      <p className="font-semibold">{profile.referralCount} Users</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {[
                { icon: <Settings className="w-5 h-5" />, label: "Account Settings" },
                { icon: <CreditCard className="w-5 h-5" />, label: "Billing & Subscriptions" },
                { icon: <HelpCircle className="w-5 h-5" />, label: "Help & Support" },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-muted-foreground">
                    {item.icon}
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </button>
              ))}
              <button className="w-full flex items-center gap-4 p-5 hover:bg-red-50 text-red-600 transition-colors text-left mt-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Withdraw Funds</h3>
                <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
                  Bal: {wallet ? formatCurrency(wallet.balance) : '...'}
                </span>
              </div>
              
              <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={!banks?.length || !wallet?.balance}>
                    Request Withdrawal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Withdraw to Bank</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleWithdraw} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Bank Account</Label>
                      <div className="space-y-2">
                        {banks?.map(bank => (
                          <div 
                            key={bank.id} 
                            onClick={() => setWithdrawForm({...withdrawForm, bankId: bank.id})}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${withdrawForm.bankId === bank.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                          >
                            <p className="font-semibold text-sm">{bank.bankName}</p>
                            <p className="text-xs text-muted-foreground">{bank.accountNumber}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₦)</Label>
                      <Input 
                        type="number" 
                        value={withdrawForm.amount} 
                        onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                        className="h-14 rounded-xl text-lg font-bold bg-gray-50 border-gray-200"
                        max={wallet?.balance}
                      />
                    </div>
                    <Button type="submit" disabled={withdraw.isPending || !withdrawForm.amount || !withdrawForm.bankId} className="w-full h-14 rounded-xl font-bold text-lg mt-4">
                      {withdraw.isPending ? "Processing..." : "Withdraw"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Linked Banks</h3>
                <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-primary font-semibold hover:bg-primary/10 rounded-full">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Add Bank Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBank} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input value={bankForm.bankName} onChange={e => setBankForm({...bankForm, bankName: e.target.value})} required className="h-12 rounded-xl bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={bankForm.accountName} onChange={e => setBankForm({...bankForm, accountName: e.target.value})} required className="h-12 rounded-xl bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input value={bankForm.accountNumber} onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} required className="h-12 rounded-xl bg-gray-50" maxLength={10} />
                      </div>
                      <Button type="submit" disabled={addBank.isPending} className="w-full h-14 rounded-xl font-bold mt-4">
                        Add Account
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {banksLoading ? (
                  <div className="h-20 bg-gray-100 rounded-2xl animate-pulse"></div>
                ) : banks?.length ? (
                  banks.map(bank => (
                    <div key={bank.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-gray-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: bank.bgColor, color: bank.color }}>
                          {bank.bankName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{bank.bankName}</p>
                          <p className="text-xs text-muted-foreground tracking-widest mt-0.5">•••• {bank.accountNumber.slice(-4)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeBank.mutate({ bankId: bank.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() })})}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">No bank accounts linked yet.</p>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}