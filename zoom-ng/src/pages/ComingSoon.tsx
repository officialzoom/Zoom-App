import React from "react";
import NavBar from "@/components/NavBar";

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
      <NavBar />
      <main className="text-center px-4">
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-xl max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-4">Coming Soon</h1>
          <p className="text-muted-foreground mb-8">We are working hard to bring this feature to you. Stay tuned for updates!</p>
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
            <span className="text-2xl">🚀</span>
          </div>
        </div>
      </main>
    </div>
  );
}