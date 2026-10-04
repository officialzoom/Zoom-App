import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import { useGetUserProfile, useGetBanks, useAddBank, useRemoveBank, useGetWallet, useGetDashboardSummary, useWithdrawFromWallet, getGetUserProfileQueryKey, getGetBanksQueryKey, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Plus, Trash2, LogOut, Settings, CreditCard, HelpCircle, Copy, Users, Share2, MessageSquare, Phone, MapPin, Mail, Calendar, TrendingUp, Wallet, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatting";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import AddFundsButton from "@/components/AddFundsButton";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile();
  const { data: banks, isLoading: banksLoading } = useGetBanks();
  const { data: wallet } = useGetWallet();
  const { data: summary } = useGetDashboardSummary();
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
        const msg = data?.message || "Withdrawal request submitted for admin approval";
        toast({ title: "Withdrawal Submitted", description: msg });
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

  const referralsNeeded = Math.max(0, 5 - (profile?.referralCount || 0));
  const canWithdraw = (profile?.referralCount || 0) >= 5;

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar />
      <main className="container mx-auto px-4 pt-8">
        <div className="max-w-3xl mx-auto grid md:grid-cols-12 gap-8">

          {/* Left column */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-primary/20 to-transparent"></div>
              {profileLoading ? (
                <div className="h-40 animate-pulse"></div>
              ) : profile && (
                <div className="relative z-10">
                  <Avatar className="w-24 h-24 mx-auto border-4 border-white shadow-lg mb-4">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{profile.avatarInitials}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                    {profile.displayName}
                    {profile.kycVerified && <ShieldCheck className="w-5 h-5 text-green-500" />}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-1">{profile.email}</p>
                  {profile.kycVerified && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold mb-4">
                      <ShieldCheck className="w-3 h-3" /> KYC Verified
                    </span>
                  )}

                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium truncate">{profile.email}</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{profile.phone}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{profile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Member Since:</span>
                      <span className="font-medium">{profile.memberSince}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-primary/10 rounded-2xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Investor Level</p>
                      <p className="font-bold text-primary">{profile.investorLevel}</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Referrals</p>
                      <p className="font-bold text-blue-600">{profile.referralCount} users</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Investment stats */}
            {profile && summary && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Account Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Wallet Balance</span>
                    </div>
                    <span className="font-bold">{formatCurrency(summary.walletBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Active Investments</span>
                    </div>
                    <span className="font-bold">{formatCurrency(summary.activeInvestmentsValue)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Returns</span>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(summary.totalEarnings)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Active / Completed</span>
                    </div>
                    <span className="font-bold">{summary.activeInvestmentsCount} / {summary.completedInvestmentsCount}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <AddFundsButton className="w-full h-12 rounded-xl font-semibold" label="Add Funds to Wallet" />
                </div>
              </div>
            )}

            {/* Referral card */}
            {profile && (
              <div className="bg-primary text-primary-foreground rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="font-bold text-lg">Referral Program</span>
                  </div>
                  <p className="text-primary-foreground/80 text-sm mb-4">
                    {canWithdraw ? "Withdrawal unlocked! You have enough referrals." : `Invite ${referralsNeeded} more friend${referralsNeeded !== 1 ? "s" : ""} to unlock withdrawals.`}
                  </p>
                  <div className="bg-white/20 rounded-xl p-3 mb-3">
                    <p className="text-xs text-primary-foreground/70 mb-1">Your referral code</p>
                    <p className="font-mono font-bold text-lg tracking-wider">{profile.referralCode}</p>
                  </div>
                  {referralLink && (
                    <Button onClick={copyReferral} variant="secondary" className="w-full rounded-xl font-bold bg-white/20 hover:bg-white/30 text-white border-none flex items-center gap-2">
                      <Copy className="w-4 h-4" /> Copy Referral Link
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
                  <DialogHeader><DialogTitle>Contact Support</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <Textarea placeholder="Describe your issue..." value={supportMsg} onChange={e => setSupportMsg(e.target.value)} className="rounded-xl" rows={5} />
                    <Button onClick={handleSupport} className="w-full rounded-xl font-bold">Send Message</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <button onClick={logout} className="w-full flex items-center gap-4 p-5 hover:bg-red-50 text-red-600 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><LogOut className="w-5 h-5" /></div>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-7 space-y-6">
            {/* Withdraw */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Withdraw Funds</h3>
                <span className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
                  Bal: {wallet ? formatCurrency(wallet.balance) : "..."}
                </span>
              </div>
              {!canWithdraw && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-700 mb-1">🔒 Withdrawal Locked</p>
                  <p className="text-sm text-amber-600">You need {referralsNeeded} more referral{referralsNeeded !== 1 ? "s" : ""} to unlock withdrawals. Share your referral link to invite friends!</p>
                </div>
              )}
              <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={!availableBanks.length || !canWithdraw}>
                    {canWithdraw ? "Request Withdrawal" : `Need ${referralsNeeded} More Referral${referralsNeeded !== 1 ? "s" : ""}`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl">
                  <DialogHeader><DialogTitle className="text-xl font-bold">Withdraw to Bank</DialogTitle></DialogHeader>
                  <form onSubmit={handleWithdraw} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Bank Account</Label>
                      {availableBanks.map(bank => (
                        <div key={bank.id} onClick={() => setWithdrawForm({ ...withdrawForm, bankId: bank.id })}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${withdrawForm.bankId === bank.id ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                          <p className="font-semibold text-sm">{bank.bankName}</p>
                          <p className="text-xs text-muted-foreground">{bank.accountNumber} • {bank.accountName}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₦)</Label>
                      <Input type="number" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                        className="h-14 rounded-xl text-lg font-bold bg-gray-50 border-gray-200" max={wallet?.balance} />
                    </div>
                    <Button type="submit" disabled={withdraw.isPending || !withdrawForm.bankId || !withdrawForm.amount} className="w-full h-14 rounded-xl font-bold shadow-lg shadow-primary/20">
                      {withdraw.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Banks */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold">Bank Accounts</h3>
                <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl font-semibold h-9"><Plus className="w-4 h-4 mr-1" /> Add Bank</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader><DialogTitle className="text-xl font-bold">Add Bank Account</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddBank} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <select value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                          className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 px-3 text-sm font-medium" required>
                          <option value="">Select a bank</option>
                          {["GTBank","Access Bank","First Bank","Zenith Bank","UBA","Kuda Bank","Opay","Moniepoint","Stanbic IBTC","Polaris Bank"].map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name</Label>
                        <Input value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                          placeholder="Adaobi Johnson" className="h-12 rounded-xl bg-gray-50 border-gray-200" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                          placeholder="0123456789" maxLength={10} className="h-12 rounded-xl bg-gray-50 border-gray-200" required />
                      </div>
                      <Button type="submit" disabled={addBank.isPending} className="w-full h-12 rounded-xl font-bold">
                        {addBank.isPending ? "Adding..." : "Add Account"}
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
                    <div key={bank.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ backgroundColor: bank.bgColor, color: bank.color }}>
                          {bank.logo}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{bank.bankName}</p>
                          <p className="text-xs text-muted-foreground">{bank.accountNumber} • {bank.accountName}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        onClick={() => removeBank.mutate({ bankId: bank.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBanksQueryKey() }) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No bank accounts yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
