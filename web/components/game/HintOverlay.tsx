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
        className="fixed bottom-24 right-4 z-30 bg-retro-panel border border-retro-cyan/50 rounded-lg px-3 py-2 font-retro text-sm text-retro-cyan hover:retro-glow transition-all"
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
        className="fixed bottom-24 right-4 z-30 bg-retro-cyan/20 border border-retro-cyan rounded-lg px-3 py-2 font-retro text-sm text-retro-cyan retro-glow transition-all"
      >
        Hide Hints
      </button>

      {/* Hint panel */}
      <div className="fixed top-16 left-4 z-30 bg-retro-panel/95 border border-retro-cyan/40 rounded-lg p-3 max-w-[200px] shadow-lg">
        <p className="font-pixel text-[9px] text-retro-cyan mb-2 tracking-wider">PRACTICE HINTS</p>

        {/* Shanten */}
        <div className="mb-2">
          <p className="text-xs text-retro-textDim font-retro">Distance to win:</p>
          <p className={`text-lg font-retro font-bold ${
            hints.shantenCount === 0 ? 'text-retro-gold retro-glow' :
            hints.shantenCount <= 2 ? 'text-retro-green' :
            'text-retro-text'
          }`}>
            {hints.shantenCount === 0 ? 'TENPAI!' :
             hints.shantenCount === -1 ? 'WINNING!' :
             `${hints.shantenCount} away`}
          </p>
        </div>

        {/* Safe tiles count */}
        <div className="mb-2">
          <p className="text-xs text-retro-textDim font-retro">Safe discards:</p>
          <p className="text-sm font-retro text-retro-green">
            {hints.safeTileIds.size} tile{hints.safeTileIds.size !== 1 ? 's' : ''} in hand
          </p>
        </div>

        {/* Legend */}
        <div className="border-t border-retro-border/20 pt-2 mt-2">
          <p className="text-[10px] text-retro-textDim font-retro">
            <span className="text-retro-green">Green glow</span> = safe to discard
          </p>
        </div>
      </div>
    </>
  );
}
