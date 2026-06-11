'use client';

/**
 * Daily Hand result: outcome, faan bar, streak, and the emoji-free share
 * card (clipboard + native share where available).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { DailyState, buildShareText, gamStreakLine } from '@/lib/dailyHand';

export default function DailyResultDialog({ state }: { state: DailyState }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const result = state.todayResult;
  if (!result) return null;

  const shareText = buildShareText(state);

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing sensible to do
    }
  };

  const headline = result.outcome === 'win'
    ? `Daily win — ${result.fan} faan`
    : result.outcome === 'draw'
      ? 'Daily draw — the wall ran dry'
      : 'Daily done — the table ate this one';

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Daily Hand result"
      data-testid="daily-result-dialog"
    >
      <div className="ds-card-elevated w-full max-w-md animate-slide-up p-5">
        <p className="font-display text-[10px] tracking-widest text-info">DAILY HAND · {state.today}</p>
        <h2 className={`mt-1 font-display text-lg ${result.outcome === 'win' ? 'text-success' : 'text-foreground'}`}>
          {headline}
        </h2>

        <pre className="mt-3 overflow-x-auto rounded-lg border border-border/30 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {shareText}
        </pre>

        <div className="mt-3 flex items-start gap-3">
          <CharacterPortrait character="gam" emotion={result.outcome === 'win' ? 'smug' : 'idle'} size="sm" />
          <p className="pt-1 font-sans text-xs leading-snug text-muted-foreground">
            Uncle Gam: {gamStreakLine(state)}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className="ds-btn-accent min-h-[44px] w-full font-display text-xs"
            onClick={onShare}
          >
            {copied ? 'Copied to clipboard' : 'Share result'}
          </button>
          <button
            type="button"
            className="ds-btn min-h-[44px] w-full font-sans text-xs text-muted-foreground"
            onClick={() => router.push('/')}
          >
            Back home
          </button>
        </div>
      </div>
    </div>
  );
}
