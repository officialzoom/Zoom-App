import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatting";
import { Users, TrendingUp, Clock, MessageSquare, Shield, Trash2, CheckCircle, XCircle, Reply, Zap, LogOut, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ADMIN_EMAIL = "officialzoom200@gmail.com";

async function adminFetch(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Request failed");
  if (res.status === 204) return null;
  return res.json();
}

export default function Admin() {
  const { user, logout, loginWithGoogle, getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [support, setSupport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [replyText, setReplyText] = useState("");

  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadData = async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [s, u, w, sup] = await Promise.all([
        adminFetch("/api/admin/stats", token),
        adminFetch("/api/admin/users", token),
        adminFetch("/api/admin/withdrawals", token),
        adminFetch("/api/admin/support", token),
      ]);
      setStats(s);
      setUsers(u);
      setWithdrawals(w);
      setSupport(sup);
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const handleGoogleLogin = async () => {
    try {
      const u = await loginWithGoogle();
      if (u.email !== ADMIN_EMAIL) {
        await logout();
        toast({ title: "Access Denied", description: "Only the admin account can access this page.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    }
  };

  const banUser = async (userId: string, reason: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await adminFetch(`/api/admin/users/${userId}/ban`, token, { method: "POST", body: JSON.stringify({ reason }) });
      toast({ title: "User banned" });
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const unbanUser = async (userId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await adminFetch(`/api/admin/users/${userId}/unban`, token, { method: "POST" });
      toast({ title: "User unbanned" });
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user permanently?")) return;
    const token = await getToken();
    if (!token) return;
    try {
      await adminFetch(`/api/admin/users/${userId}`, token, { method: "DELETE" });
      toast({ title: "User deleted" });
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const approveWithdrawal = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await adminFetch(`/api/admin/withdrawals/${id}/approve`, token, { method: "POST" });
      toast({ title: "Withdrawal approved" });
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const rejectWithdrawal = async (id: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await adminFetch(`/api/admin/withdrawals/${id}/reject`, token, { method: "POST", body: JSON.stringify({ note: "Rejected by admin" }) });
      toast({ title: "Withdrawal rejected" });
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const replyToSupport = async (id: string, reply: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await adminFetch(`/api/admin/support/${id}/reply`, token, { method: "POST", body: JSON.stringify({ reply }) });
      toast({ title: "Reply sent" });
      setReplyText("");
      loadData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold mb-2">Admin Portal</h1>
          <p className="text-gray-500 mb-8">Sign in with the authorized admin Google account to continue.</p>
          <Button onClick={handleGoogleLogin} className="w-full h-12 rounded-xl font-bold flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-xl">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">You are not authorized to access this page.</p>
          <Button onClick={logout} variant="outline" className="w-full rounded-xl">Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="font-bold text-lg">Zoom NG Admin</span>
          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-semibold">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={loadData} className="text-gray-300 hover:text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={logout} className="text-gray-300 hover:text-white">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Users", value: stats.totalUsers, icon: Users, color: "#6366f1" },
              { label: "All-Time Earnings", value: formatCurrency(stats.allTimeEarnings), icon: TrendingUp, color: "#10b981" },
              { label: "Total Deposits", value: formatCurrency(stats.totalDeposits), icon: TrendingUp, color: "#f97316" },
              { label: "Pending Withdrawals", value: `${stats.pendingWithdrawalsCount} (${formatCurrency(stats.pendingWithdrawalsAmount)})`, icon: Clock, color: "#FBC02D" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}15` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="font-bold text-lg text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="users">
          <TabsList className="mb-6 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white px-6">
              <Users className="w-4 h-4 mr-2" /> Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white px-6">
              <Clock className="w-4 h-4 mr-2" /> Withdrawals
            </TabsTrigger>
            <TabsTrigger value="support" className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white px-6">
              <MessageSquare className="w-4 h-4 mr-2" /> Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary text-lg">
                      {u.avatarInitials || u.displayName?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{u.displayName}</p>
                        {u.banned && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">Banned</span>}
                        {u.kycVerified && <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full font-semibold">KYC</span>}
                      </div>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400">Referrals: {u.referralCount} • Level: {u.investorLevel} • Joined: {u.memberSince}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Balance</p>
                      <p className="font-bold text-gray-900">{formatCurrency(u.wallet?.balance ?? 0)}</p>
                    </div>
                    {u.banned ? (
                      <Button size="sm" variant="outline" onClick={() => unbanUser(u.id)} className="rounded-xl text-green-600 border-green-200 hover:bg-green-50">
                        <CheckCircle className="w-4 h-4 mr-1" /> Unban
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50">
                            <Shield className="w-4 h-4 mr-1" /> Ban
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl">
                          <DialogHeader><DialogTitle>Ban User: {u.displayName}</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-2">
                            <Textarea placeholder="Reason for ban..." value={banReason} onChange={e => setBanReason(e.target.value)} className="rounded-xl" />
                            <Button onClick={() => { banUser(u.id, banReason); setBanReason(""); }} className="w-full rounded-xl">Confirm Ban</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button size="sm" variant="outline" onClick={() => deleteUser(u.id)} className="rounded-xl text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="withdrawals">
            <div className="space-y-3">
              {withdrawals.map(w => (
                <div key={w.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{w.userName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{w.status}</span>
                      </div>
                      <p className="text-sm text-gray-500">{w.userEmail}</p>
                      <p className="text-xs text-gray-400">{w.bankName} • {w.accountNumber} • {w.accountName}</p>
                      <p className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-xl text-gray-900">{formatCurrency(w.amount)}</p>
                      {w.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approveWithdrawal(w.id)} className="rounded-xl bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectWithdrawal(w.id)} className="rounded-xl text-red-600 border-red-200">
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {withdrawals.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No withdrawal requests</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="support">
            <div className="space-y-3">
              {support.map(m => (
                <div key={m.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{m.userName} <span className="text-gray-400 font-normal text-sm">({m.userEmail})</span></p>
                      <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {m.status}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3 bg-gray-50 rounded-xl p-3">{m.message}</p>
                  {m.adminReply && (
                    <div className="bg-primary/5 rounded-xl p-3 mb-3">
                      <p className="text-xs text-primary font-semibold mb-1">Admin Reply:</p>
                      <p className="text-sm text-gray-700">{m.adminReply}</p>
                    </div>
                  )}
                  {m.status === "open" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="rounded-xl"><Reply className="w-4 h-4 mr-1" /> Reply</Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-3xl">
                        <DialogHeader><DialogTitle>Reply to {m.userName}</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                          <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">{m.message}</p>
                          <Textarea placeholder="Your reply..." value={replyText} onChange={e => setReplyText(e.target.value)} className="rounded-xl" rows={4} />
                          <Button onClick={() => replyToSupport(m.id, replyText)} className="w-full rounded-xl">Send Reply</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))}
              {support.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No support messages</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
