'use client';

import { Tile, TileType } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { calculateShanten } from '@/engine/winDetection';
import { isSafeTile } from '@/engine/ai/aiUtils';
import { Sparkles } from 'lucide-react';

interface HintOverlayProps {
  game: GameState;
  humanPlayerIndex: number;
  showHints: boolean;
  onToggle: () => void;
}

export interface HintData {
  shantenCount: number;
  safeTileIds: Set<string>;
  suggestedDiscardId: string | undefined;
}

export function computeHints(game: GameState, humanPlayerIndex: number): HintData {
  const player = game.players[humanPlayerIndex];
  const hand = player.hand.filter(t => t.type !== TileType.BONUS);

  const shantenCount = hand.length >= 13
    ? calculateShanten(hand.slice(0, 13))
    : 8;

  const safeTileIds = new Set<string>();
  for (const tile of hand) {
    if (isSafeTile(tile, game, humanPlayerIndex)) {
      safeTileIds.add(tile.id);
    }
  }

  return { shantenCount, safeTileIds, suggestedDiscardId: undefined };
}

const chip =
  'fixed z-30 rounded-full border px-4 py-2 font-sans text-sm shadow-lg transition-all duration-fast ease-ds-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50';

export default function HintOverlay({ game, humanPlayerIndex, showHints, onToggle }: HintOverlayProps) {
  if (!showHints) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`${chip} bottom-24 right-4 border-info/40 bg-surface/90 text-info hover:border-info hover:bg-info/10`}
      >
        Show hints
      </button>
    );
  }

  const hints = computeHints(game, humanPlayerIndex);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`${chip} bottom-24 right-4 border-info/50 bg-info/15 text-info hover:bg-info/25`}
      >
        Hide hints
      </button>

      <div className="game-hud-surface fixed left-4 top-16 z-30 max-w-[220px] rounded-xl p-3 shadow-xl md:max-w-[240px]">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-info" aria-hidden />
          <p className="font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-info">
            Practice hints
          </p>
        </div>

        <div className="mb-3">
          <p className="font-sans text-xs text-muted-foreground">Distance to win</p>
          <p
            className={`font-sans text-lg font-bold ${
              hints.shantenCount === 0
                ? 'text-highlight ds-text-glow'
                : hints.shantenCount <= 2
                  ? 'text-success'
                  : 'text-foreground'
            }`}
          >
            {hints.shantenCount === 0
              ? 'Tenpai'
              : hints.shantenCount === -1
                ? 'Winning hand'
                : `${hints.shantenCount} away`}
          </p>
        </div>

        <div className="mb-2">
          <p className="font-sans text-xs text-muted-foreground">Safe discards in hand</p>
          <p className="font-sans text-sm text-success">
            {hints.safeTileIds.size} tile{hints.safeTileIds.size !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="mt-2 border-t border-border/25 pt-2">
          <p className="font-sans text-[10px] leading-snug text-muted-foreground">
            <span className="font-medium text-success">Green glow</span> on your tiles means they are relatively safe to discard.
          </p>
        </div>
      </div>
    </>
  );
}
