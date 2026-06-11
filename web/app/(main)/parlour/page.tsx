'use client';

/**
 * The Jade Parlour — the story-mode floor ladder. Floors light up as you
 * beat them; the next floor unlocks; Uncle Gam keeps the front desk.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { NPCS } from '@/content/npcs';
import {
  PARLOUR_FLOORS, getParlourProgress, isFloorUnlocked, ParlourProgress,
} from '@/lib/parlour';

export default function ParlourPage() {
  // Progress lives in localStorage; read after mount to avoid SSR mismatch.
  const [progress, setProgress] = useState<ParlourProgress | null>(null);
  useEffect(() => {
    setProgress(getParlourProgress());
  }, []);

  const cleared = progress?.highestCleared ?? 0;
  const litFloors = cleared;
  const gamGreeting = cleared === 0
    ? 'The Parlour only sleeps. Wake it up. One floor at a time.'
    : cleared >= 9
      ? 'Told you. It only sleeps.'
      : `Floor ${cleared} is lit. ${9 - cleared} to go, kid.`;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <div className="ds-panel mb-4 p-4">
        <p className="font-display text-[10px] tracking-widest text-info">STORY MODE</p>
        <h1 className="mt-1 font-display text-xl text-foreground">The Jade Parlour</h1>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Nine floors gone quiet. Win each floor&apos;s table to light the house back up.
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-highlight transition-all duration-slow ease-ds-out"
            style={{ width: `${(litFloors / 9) * 100}%` }}
          />
        </div>
        <p className="mt-1 font-sans text-[11px] text-muted-foreground">
          {litFloors}/9 floors lit
        </p>
      </div>

      {/* Front desk */}
      <div className="ds-card mb-4 flex items-center gap-3 p-3">
        <CharacterPortrait character="gam" emotion="idle" size="sm" />
        <div className="min-w-0">
          <p className="font-display text-xs text-highlight">Uncle Gam · The Front Desk</p>
          <p className="font-sans text-xs leading-snug text-muted-foreground">{gamGreeting}</p>
        </div>
      </div>

      {/* Floors, top of the building first */}
      <div className="space-y-2">
        {[...PARLOUR_FLOORS].reverse().map(floor => {
          const unlocked = progress ? isFloorUnlocked(floor.floor, progress) : floor.floor === 1;
          const beaten = floor.floor <= cleared;
          const rival = NPCS[floor.rival];
          const isJadeRoom = floor.floor === 9;

          return (
            <div
              key={floor.floor}
              className={`ds-card flex items-center gap-3 p-3 transition-opacity duration-normal ${
                unlocked ? '' : 'opacity-45'
              } ${beaten ? 'border-success/30' : ''} ${isJadeRoom && unlocked ? 'border-highlight/50' : ''}`}
              data-testid={`parlour-floor-${floor.floor}`}
            >
              <div className="relative shrink-0">
                <CharacterPortrait
                  character={floor.rival}
                  emotion={beaten ? 'frustrated' : 'idle'}
                  size="sm"
                />
                {!unlocked && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-surface p-1 text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] text-muted-foreground">F{floor.floor}</span>
                  <p className="truncate font-display text-sm text-foreground">{floor.name}</p>
                  {beaten && (
                    <span className="rounded-full border border-success/40 bg-success/10 px-1.5 py-px font-display text-[8px] text-success">
                      LIT
                    </span>
                  )}
                </div>
                <p className="truncate font-sans text-xs text-muted-foreground">
                  {rival.name} · {floor.teaches}
                </p>
              </div>

              {unlocked ? (
                <Link
                  href={`/play/game?floor=${floor.floor}`}
                  className={`${beaten ? 'ds-btn' : 'ds-btn-accent'} min-h-[40px] shrink-0 px-3 font-display text-[10px]`}
                >
                  {beaten ? 'Rematch' : 'Challenge'}
                </Link>
              ) : (
                <span className="shrink-0 px-3 font-sans text-[10px] text-muted-foreground">
                  Beat floor {floor.floor - 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {progress?.epilogueUnlocked && (
        <div className="ds-card-elevated mt-4 border-highlight/40 p-4 text-center">
          <p className="font-display text-sm text-highlight ds-text-glow">CHAMPION OF THE JADE PARLOUR</p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            Every floor lit. Jin deals the next hand at your table. Gam, from the desk:
            &ldquo;Told you. It only sleeps.&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
