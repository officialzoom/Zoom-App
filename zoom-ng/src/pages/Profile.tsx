import React, { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";
import { useGetUserProfile, useGetBanks, useAddBank, useRemoveBank, useGetWallet, useWithdrawFromWallet, getGetUserProfileQueryKey, getGetBanksQueryKey, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Plus, Trash2, LogOut, Copy, Users, MessageSquare, Clock, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatting";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile();
  const { data: banks, isLoading: banksLoading } = useGetBanks();
  const { data: wallet } = useGetWallet();
  const availableBanks = Array.isArray(banks) ? banks : [];
  
  const addBank = useAddBank();
  const removeBank = useRemoveBank();
  const withdraw = useWithdrawFromWallet();

  const { toast } = useToast();
  const { logout, getToken } = useAuth();
  const queryClient = useQueryClient();

  const [bankForm, setBankForm] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bankId: "" });
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [supportMsg, setSupportMsg] = useState("");
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  
  const [withdrawalTime, setWithdrawalTime] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (withdrawalTime) {
        const target = new Date(withdrawalTime).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) {
          setWithdrawalTime(null);
          toast({ title: "Withdrawal Processed", description: "Your funds should be in your account now." });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [withdrawalTime, toast]);

  const formatCountdown = (targetIso: string) => {
    const diff = new Date(targetIso).getTime() - new Date().getTime();
    if (diff <= 0) return "00:00:00";
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const referralLink = profile?.referralCode
    ? `${window.location.origin}/signup?ref=${profile.referralCode}`
    : null;

  const copyReferral = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: "Referral link copied!" });
    }
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    addBank.mutate({ data: bankForm }, {
      onSuccess: () => {
        toast({ title: "Bank account added successfully" });
        setIsBankOpen(false);
        setBankForm({ bankName: "", accountName: "", accountNumber: "" });
        queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    withdraw.mutate({ data: { amount: Number(withdrawForm.amount), bankId: withdrawForm.bankId } }, {
      onSuccess: (data: any) => {
        const msg = data?.message || "Withdrawal request submitted. Please wait 12 hours for approval.";
        toast({ title: "Withdrawal Submitted", description: msg });
        const twelveHoursLater = new Date();
        twelveHoursLater.setHours(twelveHoursLater.getHours() + 12);
        setWithdrawalTime(twelveHoursLater.toISOString());
        setIsWithdrawOpen(false);
        setWithdrawForm({ amount: "", bankId: "" });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      },
      onError: (err: any) => toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" }),
    });
  };

  const handleSupport = async () => {
    if (!supportMsg.trim()) return;
    const token = await getToken();
    if (!token) return;
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: supportMsg }),
      });
      toast({ title: "Message sent!", description: "Admin will reply shortly." });
      setSupportMsg("");
      setIsSupportOpen(false);
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-3xl mx-auto grid md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-br from-primary/10 to-transparent"></div>
              {profileLoading ? (
                <div className="h-64 animate-pulse bg-gray-50 rounded-2xl"></div>
              ) : profile ? (
                <div className="relative z-10">
                  <Avatar className="w-28 h-28 mx-auto border-4 border-white shadow-xl mb-6">
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">{profile.avatarInitials}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold flex items-center justify-center gap-2 mb-1">
                    {profile.displayName}
                    {profile.kycVerified && <ShieldCheck className="w-6 h-6 text-green-500" />}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">{profile.email}</p>
                  <div className="bg-gray-50/80 rounded-2xl p-5 grid grid-cols-2 gap-4 text-left border border-gray-100">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Investor Level</p>
                      <p className="font-bold text-primary">{profile.investorLevel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Referrals</p>
                      <p className="font-bold">{profile.referralCount} Users</p>
                    </div>
                    <div className="col-span-2 border-t border-gray-100 pt-3">
                      <p className="text-xs text-muted-foreground mb-1">Membership Date</p>
                      <p className="font-semibold">{profile.memberSince}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {profile && (
              <div className="bg-primary text-primary-foreground rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-primary/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5" />
                    <span className="font-bold text-lg">Refer & Earn</span>
                  </div>
                  <p className="text-primary-foreground/80 text-sm mb-5">
                    Share your link and earn ₦5,000 for every friend who starts investing.
                  </p>
                  <div className="bg-white/20 rounded-2xl p-4 mb-4 backdrop-blur-sm border border-white/10">
                    <p className="text-xs text-primary-foreground/70 mb-1 font-medium">Your Unique Code</p>
                    <p className="font-mono font-bold text-xl tracking-widest text-center">{profile.referralCode}</p>
                  </div>
                  {referralLink && (
                    <Button onClick={copyReferral} variant="secondary" className="w-full rounded-2xl font-bold bg-white text-primary hover:bg-gray-100 border-none h-12 flex items-center justify-center gap-2 transition-all active:scale-95">
                      <Copy className="w-4 h-4" /> Copy Link
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                <DialogTrigger asChild>
                  <button className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-muted-foreground"><MessageSquare className="w-5 h-5" /></div>
                    <span className="font-medium">Contact Support</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader><DialogTitle className="text-xl font-bold">Contact Support</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Textarea placeholder="How can we help you today?" value={supportMsg} onChange={e => setSupportMsg(e.target.value)} className="rounded-2xl border-gray-200" rows={5} />
                    <Button onClick={handleSupport} className="w-full rounded-2xl font-bold h-12">Send Message</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <button onClick={logout} className="w-full flex items-center gap-4 p-5 hover:bg-red-50 text-red-600 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><LogOut className="w-5 h-5" /></div>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Withdraw Funds</h3>
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-xs text-gray-500 font-medium">Balance:</span>
                  <span className="text-sm font-bold text-gray-900">{wallet ? formatCurrency(wallet.balance) : "..."}</span>
                </div>
              </div>

              {withdrawalTime && (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-6 flex items-center gap-4">
                  <div className="bg-primary text-white p-3 rounded-full animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-primary">Withdrawal in Progress</p>
                    <p className="text-sm text-primary-foreground/70">Your funds will be released in: <span className="font-mono font-bold text-primary">{formatCountdown(withdrawalTime)}</span></p>
                  </div>
                </div>
              )}

              <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 rounded-2xl font-bold shadow-lg shadow-primary/20 text-lg transition-all active:scale-[0.98]" disabled={!availableBanks.length}>
                    {withdrawalTime ? "Processing Withdrawal..." : "Request Withdrawal"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl">
                  <DialogHeader><DialogTitle className="text-2xl font-bold">Transfer to Bank</DialogTitle></DialogHeader>
                  <form onSubmit={handleWithdraw} className="space-y-6 mt-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Select Bank Account</Label>
                      <div className="grid gap-2">
                        {availableBanks.map(bank => (
                          <div key={bank.id} onClick={() => setWithdrawForm({ ...withdrawForm, bankId: bank.id })}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${withdrawForm.bankId === bank.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: bank.bgColor, color: bank.color }}>{bank.logo}</div>
                                <div>
                                  <p className="font-bold text-sm">{bank.bankName}</p>
                                  <p className="text-xs text-muted-foreground">{bank.accountNumber} • {bank.accountName}</p>
                                </div>
                              </div>
                              {withdrawForm.bankId === bank.id && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Amount to Withdraw (₦)</Label>
                      <Input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                        className="h-14 rounded-2xl text-xl font-bold bg-gray-50 border-gray-200 text-center" max={wallet?.balance} />
                    </div>
                    <Button type="submit" disabled={withdraw.isPending || !withdrawForm.bankId || !withdrawForm.amount} className="w-full h-14 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20">
                      {withdraw.isPending ? "Processing..." : "Submit Request"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">My Bank Accounts</h3>
                <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl font-semibold h-9 px-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Bank
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader><DialogTitle className="text-2xl font-bold">Add Bank Account</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddBank} className="space-y-5 mt-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Bank Name</Label>
                        <select value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                          className="w-full h-12 rounded-2xl bg-gray-50 border border-gray-200 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" required>
                          <option value="">Select a bank</option>
                          {["GTBank","Access Bank","First Bank","Zenith Bank","UBA","Kuda Bank","Opay","Moniepoint","Stanbic IBTC","Polaris Bank"].map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Account Name</Label>
                        <Input value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                          placeholder="Enter full name" className="h-12 rounded-2xl bg-gray-50 border-gray-200" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Account Number</Label>
                        <Input value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                          placeholder="Enter 10 digits" maxLength={10} className="h-12 rounded-2xl bg-gray-50 border-gray-200" required />
                      </div>
                      <Button type="submit" disabled={addBank.isPending} className="w-full h-12 rounded-2xl font-bold text-lg">
                        {addBank.isPending ? "Adding..." : "Save Account"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {banksLoading ? (
                <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse"></div>)}</div>
              ) : availableBanks.length ? (
                <div className="space-y-3">
                  {availableBanks.map(bank => (
                    <div key={bank.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 transition-all hover:bg-gray-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ backgroundColor: bank.bgColor, color: bank.color }}>
                          {bank.logo}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{bank.bankName}</p>
                          <p className="text-xs text-muted-foreground">{bank.accountNumber} • {bank.accountName}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        onClick={() => removeBank.mutate({ bankId: bank.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() }) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <p className="text-sm">No bank accounts linked yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
