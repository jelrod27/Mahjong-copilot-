'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { GameState } from '@/models/GameState';
import { FaanProjection } from '@/engine/faanProjection';
import FaanMeter from './FaanMeter';
import DiscardReadingPanel from './DiscardReadingPanel';

interface MobileCoachDrawerProps {
  game: GameState;
  humanPlayerId: string;
  faanProjection: FaanProjection | null;
}

/** Collapsible coach tools on narrow viewports — keeps the table area taller. */
export default function MobileCoachDrawer({
  game,
  humanPlayerId,
  faanProjection,
}: MobileCoachDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden" data-testid="mobile-coach-drawer">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="game-hud-surface flex w-full items-center justify-between gap-2 px-3 py-2 font-sans text-xs text-foreground"
      >
        <span className="flex items-center gap-2 font-medium">
          <GraduationCap size={14} className="text-accent" aria-hidden />
          Coach tools
          {!open && (
            <span className="text-muted-foreground">· Faan & discard reading</span>
          )}
        </span>
        {open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {faanProjection && <FaanMeter projection={faanProjection} compact />}
          <DiscardReadingPanel game={game} humanPlayerId={humanPlayerId} compact />
        </div>
      )}
    </div>
  );
}
