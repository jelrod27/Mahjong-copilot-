'use client';

import { usePathname } from 'next/navigation';
import { SidebarShell } from '@/components/layout/SidebarShell';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInGame = pathname.startsWith('/play/game') || pathname.startsWith('/play/multiplayer');

  if (isInGame) {
    return (
      <main className="min-h-dvh bg-background font-sans text-foreground">
        {children}
      </main>
    );
  }

  return (
    <SidebarShell>
      <div className="max-w-lg mx-auto">
        {children}
      </div>
    </SidebarShell>
  );
}
