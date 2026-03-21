'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInGame = pathname.startsWith('/play/game');

  return (
    <>
      <main className={
        isInGame
          ? 'min-h-screen bg-retro-bg font-retro text-retro-text'
          : 'min-h-screen bg-retro-bg font-retro text-retro-text'
      }>
        <div className={isInGame ? '' : 'max-w-lg mx-auto pb-16'}>
          {children}
        </div>
        {/* Scanline overlay */}
        <div className="fixed inset-0 retro-scanline pointer-events-none z-50" />
      </main>
      {!isInGame && <BottomNav />}
    </>
  );
}
