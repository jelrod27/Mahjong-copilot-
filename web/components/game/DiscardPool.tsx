'use client';

import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';

interface DiscardPoolProps {
  discards: Tile[];
  lastDiscardedTile?: Tile;
  /** Strong highlight on the most recent discard (e.g. during your claim window). */
  claimHighlight?: boolean;
}

export default function DiscardPool({ discards, lastDiscardedTile, claimHighlight }: DiscardPoolProps) {
  return (
    <div className="retro-panel p-2">
      <div className="grid grid-cols-6 gap-px min-h-[120px]">
        {discards.map((tile) => {
          const isLast = tile.id === lastDiscardedTile?.id;
          const spotlight = claimHighlight && isLast;
          return (
            <div
              key={tile.id}
              className={
                spotlight
                  ? 'relative flex items-center justify-center rounded-md p-0.5 ring-4 ring-retro-gold ring-offset-2 ring-offset-[#1a1f1c] shadow-[0_0_24px_rgba(245,183,49,0.55)] animate-pulse-gold scale-105 z-10'
                  : 'flex items-center justify-center'
              }
            >
              <RetroTile
                tile={tile}
                size="sm"
                isLastDiscarded={isLast}
              />
            </div>
          );
        })}
      </div>
      {discards.length === 0 && (
        <div className="flex items-center justify-center h-[120px] text-retro-textDim font-retro text-sm">
          No discards yet
        </div>
      )}
      {claimHighlight && lastDiscardedTile && (
        <p className="mt-2 text-center font-pixel text-[9px] text-retro-gold retro-glow tracking-wide">
          LAST DISCARD — USE CLAIM BELOW
        </p>
      )}
    </div>
  );
}
