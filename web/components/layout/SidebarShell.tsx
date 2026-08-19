"use client";

import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import BottomNav from "@/components/layout/BottomNav";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useBrowserValue } from "@/hooks/useBrowserValue";

function readSidebarCookie(): boolean | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
  return match ? match[1] === "true" : null;
}

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const isXl = useMediaQuery("(min-width: 1280px)");
  const storedPreference = useBrowserValue(readSidebarCookie, null);

  // Precedence, highest first: what the user just did, what they chose in a
  // previous session, and otherwise the viewport. Expressing it as one
  // fallback chain removes the pair of effects this used to need, along with
  // the frame where the sidebar rendered closed before either could correct it.
  const [toggledThisSession, setToggledThisSession] = useState<boolean | null>(null);
  const open = toggledThisSession ?? storedPreference ?? isXl;

  const handleOpenChange = (next: boolean) => {
    setToggledThisSession(next);
  };

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className="lg:hidden flex items-center gap-3 p-3 bg-elevated border-b border-border/20">
          <SidebarTrigger />
          <span className="font-display text-[10px] text-highlight ds-text-glow-strong">
            16 BIT MAHJONG
          </span>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 pb-20 lg:pb-8 pt-4 lg:pt-6">
          {children}
        </main>

        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
