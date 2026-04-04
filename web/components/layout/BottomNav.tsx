'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  bottomNavPrimaryItems,
  bottomNavMoreItems,
  bottomNavMoreTrigger,
} from '@/constants/navItems';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function navLinkClass(active: boolean) {
  return `flex flex-col items-center justify-center px-1.5 py-1 min-w-[44px] min-h-[44px] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/60 ${
    active ? 'text-retro-cyan retro-glow' : 'text-retro-textDim hover:text-retro-text'
  }`;
}

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const MoreIcon = bottomNavMoreTrigger.icon;

  const isRouteActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const moreActive = bottomNavMoreItems.some((item) => isRouteActive(item.href));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 bg-retro-bgLight border-t border-retro-border/30 z-50 lg:hidden"
        aria-label="Main navigation"
      >
        <div className="flex justify-around items-center h-[4.25rem] max-w-lg mx-auto px-1 safe-area-pb">
          {bottomNavPrimaryItems.map(({ href, label, icon: Icon }) => {
            const isActive = isRouteActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={navLinkClass(isActive)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} aria-hidden />
                <span
                  className={`font-retro bottom-nav-label mt-0.5 leading-tight text-center max-w-[4.5rem] truncate ${
                    isActive ? 'font-bold' : ''
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={navLinkClass(moreActive)}
            aria-expanded={moreOpen}
            aria-controls="bottom-nav-more-sheet"
          >
            <MoreIcon
              size={22}
              strokeWidth={moreActive ? 2.5 : 1.5}
              aria-hidden
            />
            <span
              className={`font-retro bottom-nav-label mt-0.5 leading-tight ${
                moreActive ? 'font-bold' : ''
              }`}
            >
              {bottomNavMoreTrigger.label}
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          id="bottom-nav-more-sheet"
          className="bg-retro-bgLight border-retro-border/30 text-retro-text max-h-[85dvh]"
          aria-describedby={undefined}
        >
          <SheetHeader>
            <SheetTitle className="font-pixel text-retro-cyan text-sm text-left">
              More
            </SheetTitle>
          </SheetHeader>
          <ul className="flex flex-col gap-1 pb-6" role="list">
            {bottomNavMoreItems.map(({ href, label, icon: Icon }) => {
              const isActive = isRouteActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-3 font-retro text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/60 ${
                      isActive
                        ? 'bg-retro-cyan/15 text-retro-cyan'
                        : 'text-retro-text hover:bg-retro-bg/80'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={22} className="shrink-0" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
