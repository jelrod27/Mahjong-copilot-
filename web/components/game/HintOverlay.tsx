'use client';

import { Tile, TileType, tileKey } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { calculateShanten } from '@/engine/winDetection';
import { isSafeTile } from '@/engine/ai/aiUtils';

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

export default function HintOverlay({ game, humanPlayerIndex, showHints, onToggle }: HintOverlayProps) {
  if (!showHints) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-4 z-30 bg-surface border border-info/50 rounded-lg px-3 py-2 font-sans text-sm text-info hover:ds-text-glow transition-all"
      >
        Show Hints
      </button>
    );
  }

  const hints = computeHints(game, humanPlayerIndex);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-4 z-30 bg-info/20 border border-info rounded-lg px-3 py-2 font-sans text-sm text-info ds-text-glow transition-all"
      >
        Hide Hints
      </button>

      {/* Hint panel */}
      <div className="fixed top-16 left-4 z-30 bg-surface/95 border border-info/40 rounded-lg p-3 max-w-[200px] shadow-lg">
        <p className="font-display text-[9px] text-info mb-2 tracking-wider">PRACTICE HINTS</p>

        {/* Shanten */}
        <div className="mb-2">
          <p className="text-xs text-muted-foreground font-sans">Distance to win:</p>
          <p className={`text-lg font-sans font-bold ${
            hints.shantenCount === 0 ? 'text-highlight ds-text-glow' :
            hints.shantenCount <= 2 ? 'text-success' :
            'text-foreground'
          }`}>
            {hints.shantenCount === 0 ? 'TENPAI!' :
             hints.shantenCount === -1 ? 'WINNING!' :
             `${hints.shantenCount} away`}
          </p>
        </div>

        {/* Safe tiles count */}
        <div className="mb-2">
          <p className="text-xs text-muted-foreground font-sans">Safe discards:</p>
          <p className="text-sm font-sans text-success">
            {hints.safeTileIds.size} tile{hints.safeTileIds.size !== 1 ? 's' : ''} in hand
          </p>
        </div>

        {/* Legend */}
        <div className="border-t border-border/20 pt-2 mt-2">
          <p className="text-[10px] text-muted-foreground font-sans">
            <span className="text-success">Green glow</span> = safe to discard
          </p>
        </div>
      </div>
    </>
  );
}
