import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Bell, Menu, User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { useGetWallet } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function NavBar() {
  const [location] = useLocation();
  const { data: wallet, isLoading: isWalletLoading } = useGetWallet();
  const { user, logout } = useAuth();

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/explore", label: "Explore" },
    { href: "/ads", label: "Ads & Donations" },
    { href: "/profile", label: "Profile" },
  ];

  const displayName = user?.displayName || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">zoom<span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-1 text-sm">NG</span></span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${location === link.href ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5 items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Balance</span>
            {isWalletLoading ? (
              <Skeleton className="w-16 h-4" />
            ) : (
              <span className="text-sm font-bold text-gray-900">{formatCurrency(wallet?.balance || 0)}</span>
            )}
          </div>

          <Button variant="ghost" size="icon" className="rounded-full text-gray-600">
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="w-9 h-9 border-2 border-primary/20 cursor-pointer hover:border-primary transition-colors">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[180px]">
              <div className="px-3 py-2 mb-1 border-b border-gray-100">
                <p className="font-semibold text-sm text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                <Link href="/profile" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="rounded-xl cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 mt-1">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden rounded-full">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-12">
              <div className="flex flex-col gap-2">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${location === link.href ? "bg-primary text-primary-foreground" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                    {link.label}
                  </Link>
                ))}
                <button onClick={logout} className="px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 mt-4">
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
