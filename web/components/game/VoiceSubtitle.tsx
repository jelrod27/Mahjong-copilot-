'use client';

import { useEffect, useState } from 'react';
import { subscribeToSubtitles, TileSubtitle } from '@/lib/tileVoice';

/**
 * Floating subtitle that shows the Chinese characters + English translation
 * of whatever tile was just spoken. Auto-dismisses after ~2 seconds so
 * learners see the mapping without the UI filling up. Positioned at the
 * top-center of the play area so it doesn't obscure the player's hand.
 */
export default function VoiceSubtitle() {
  const [subtitle, setSubtitle] = useState<TileSubtitle | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSubtitles(setSubtitle);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!subtitle) return;
    const timer = setTimeout(() => {
      setSubtitle(current => (current?.id === subtitle.id ? null : current));
    }, 2200);
    return () => clearTimeout(timer);
  }, [subtitle]);

  if (!subtitle) return null;

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-slide-up"
      role="status"
      aria-live="polite"
      aria-label={`${subtitle.speaker ? subtitle.speaker + ': ' : ''}${subtitle.english}`}
      key={subtitle.at}
    >
      <div className="retro-panel px-3 py-1.5 bg-retro-bgLight/95 backdrop-blur-sm border-retro-cyan/40 shadow-lg">
        <div className="flex flex-col items-center gap-0.5 text-center">
          {subtitle.speaker && (
            <span className="font-pixel text-[8px] text-retro-textDim tracking-widest uppercase">
              {subtitle.speaker}
            </span>
          )}
          <span className="text-2xl md:text-3xl text-retro-gold retro-glow leading-none">
            {subtitle.chinese}
          </span>
          <span className="font-retro text-[11px] md:text-xs text-retro-cyan">
            {subtitle.english}
          </span>
        </div>
      </div>
    </div>
  );
}
