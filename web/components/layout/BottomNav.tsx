'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/constants/navItems';

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-retro-bgLight border-t border-retro-border/30 z-50 lg:hidden">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center px-2 py-1 min-w-[48px] transition-colors ${
                isActive ? 'text-retro-cyan retro-glow' : 'text-retro-textDim hover:text-retro-text'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`font-retro text-[11px] mt-0.5 ${isActive ? 'font-bold' : ''}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
