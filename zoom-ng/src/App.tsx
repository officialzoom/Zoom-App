import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BanNotification from "@/components/BanNotification";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import ExploreAssets from "@/pages/ExploreAssets";
import AdPortal from "@/pages/AdPortal";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import ComingSoon from "@/pages/ComingSoon";
import AddFunds from "@/pages/AddFunds";
import PrivacyPolicy from "@/pages/policies/PrivacyPolicy";
import TermsOfService from "@/pages/policies/TermsOfService";
import RefundPolicy from "@/pages/policies/RefundPolicy";
import { initApiAuth } from "@/lib/api";

initApiAuth();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function Router() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Landing} />
      <Route path="/login" component={user ? Dashboard : Login} />
      <Route path="/signup" component={user ? Dashboard : Signup} />
      <Route path="/admin" component={Admin} />
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/explore">
        <ProtectedRoute><ExploreAssets /></ProtectedRoute>
      </Route>
      <Route path="/add-funds">
        <ProtectedRoute><AddFunds /></ProtectedRoute>
      </Route>
      <Route path="/ads">
        <ProtectedRoute><ComingSoon /></ProtectedRoute>
      </Route>
      <Route path="/donations">
        <ProtectedRoute><ComingSoon /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Profile /></ProtectedRoute>
      </Route>
      <Route path="/privacy">
        <PrivacyPolicy />
      </Route>
      <Route path="/terms">
        <TermsOfService />
      </Route>
      <Route path="/refunds">
        <RefundPolicy />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <BanNotification />
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
