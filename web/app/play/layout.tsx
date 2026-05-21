'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInGame = pathname.startsWith('/play/game') || pathname.startsWith('/play/multiplayer');

  return (
    <>
      <main className={
        isInGame
          ? 'min-h-dvh bg-background font-sans text-foreground'
          : 'min-h-dvh bg-background font-sans text-foreground pb-[env(safe-area-inset-bottom)]'
      }>
        <div className={isInGame ? '' : 'max-w-lg mx-auto pb-16'}>
          {children}
        </div>
      </main>
      {!isInGame && <BottomNav />}
    </>
  );
}
