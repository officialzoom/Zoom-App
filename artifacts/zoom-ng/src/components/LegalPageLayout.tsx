import React, { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import TelegramCta from "@/components/TelegramCta";

interface LegalPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Zoom NG`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-5 w-5 fill-current" />
            </span>
            <span className="font-bold tracking-tight">Zoom NG</span>
          </Link>
          <div className="flex items-center gap-2">
            <TelegramCta label="Updates" className="rounded-xl" />
            <Link href="/signup">
              <Button size="sm" className="rounded-xl">Create account</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
        <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-10">
          <p className="mb-2 text-sm font-semibold text-primary">Zoom NG</p>
          <h1 className="mb-2 text-3xl font-extrabold text-gray-900">{title}</h1>
          <p className="mb-8 text-sm text-gray-500">Last updated: 11 October 2026</p>
          <div className="space-y-7 text-sm leading-7 text-gray-600">{children}</div>
        </article>
        <nav aria-label="Legal pages" className="mt-6 flex justify-center gap-6 text-sm">
          <Link href="/terms" className="font-semibold text-primary hover:underline">Terms & Conditions</Link>
          <Link href="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>
        </nav>
      </main>
    </div>
  );
}
