'use client';

import { useState, useEffect } from 'react';

const BOOT_SESSION_KEY = 'mj_boot_shown';
const BOOT_DURATION_MS = 1600;

/**
 * Cartridge boot: a CRT power-on sweep with the logo glowing in, shown once
 * per browser session when entering the game table. Click to skip; hidden
 * entirely under prefers-reduced-motion (CSS) and after the first showing.
 */
export default function BootOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(BOOT_SESSION_KEY)) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    window.sessionStorage.setItem(BOOT_SESSION_KEY, '1');
    setVisible(true);
    // No cleanup on purpose: StrictMode's double-invoke would cancel the hide
    // timer (the re-run early-returns on the session flag) and strand the
    // overlay. A stray late setVisible(false) is harmless.
    setTimeout(() => setVisible(false), BOOT_DURATION_MS);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="boot-overlay"
      onClick={() => setVisible(false)}
      data-testid="boot-overlay"
      aria-hidden
    >
      <div className="boot-screen" />
      <div className="boot-logo text-center">
        <p className="font-display text-3xl text-highlight ds-text-glow-strong sm:text-5xl">
          16 BIT MAHJONG
        </p>
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          THE JADE PARLOUR AWAITS
        </p>
      </div>
    </div>
  );
}
