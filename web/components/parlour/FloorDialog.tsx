'use client';

/**
 * Pre/post-match dialogue overlay for Parlour floor encounters.
 * Rules (docs/design/story-bible.md): max 3 lines, always skippable,
 * character-forward. The rival speaks; Uncle Gam frames wins and losses.
 */

import { useMemo } from 'react';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { NPCS, NpcId } from '@/content/npcs';

interface FloorDialogProps {
  npcId: NpcId;
  kind: 'preMatch' | 'winMatch' | 'loseMatch';
  /** Floor metadata for the header chip. */
  floorNumber: number;
  floorName: string;
  /** Primary action (Sit down / Next floor / Try again). */
  actionLabel: string;
  onAction: () => void;
  /** Secondary action (Back to the Parlour). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function FloorDialog({
  npcId, kind, floorNumber, floorName, actionLabel, onAction,
  secondaryLabel, onSecondary,
}: FloorDialogProps) {
  const npc = NPCS[npcId];
  const line = useMemo(() => {
    const lines = npc.dialogue?.[kind] ?? [];
    if (lines.length === 0) return '';
    return lines[Math.floor(Math.random() * lines.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pick once per mount
  }, []);

  const gamLine = kind === 'winMatch'
    ? NPCS.gam.dialogue?.winMatch[0]
    : kind === 'loseMatch'
      ? NPCS.gam.dialogue?.loseMatch[0]
      : null;

  const emotion = kind === 'winMatch' ? 'frustrated' : kind === 'loseMatch' ? 'triumphant' : 'idle';

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${npc.name} — ${floorName}`}
      data-testid="floor-dialog"
    >
      <div className="ds-card-elevated w-full max-w-md animate-slide-up p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full border border-border/40 bg-surface/60 px-3 py-1 font-display text-[10px] text-muted-foreground">
            Floor {floorNumber} · {floorName}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <CharacterPortrait character={npcId} emotion={emotion} size="md" />
          </div>
          <div className="min-w-0 pt-1">
            <p className="font-display text-sm text-highlight">{npc.name}</p>
            <p className="mt-1 font-sans text-sm leading-snug text-foreground">{line}</p>
            {gamLine && (
              <p className="mt-3 border-l-2 border-accent/40 pl-2 font-sans text-xs italic leading-snug text-muted-foreground">
                Uncle Gam: {gamLine}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="ds-btn-accent min-h-[44px] w-full font-display text-xs"
            onClick={onAction}
            autoFocus
          >
            {actionLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              className="ds-btn min-h-[44px] w-full font-sans text-xs text-muted-foreground"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
