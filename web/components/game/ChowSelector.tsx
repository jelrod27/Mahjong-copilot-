'use client';

import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';

interface ChowSelectorProps {
  /** Each option is a 2-tile array (from hand) that pairs with the discarded tile */
  options: Tile[][];
  discardedTile: Tile;
  onSelect: (tilesFromHand: Tile[]) => void;
  onPass: () => void;
}

/**
 * Inline selector shown when multiple chow combinations are possible.
 * Each row shows the 3-tile sequence (2 from hand + discarded) with the discarded tile highlighted.
 */
export default function ChowSelector({ options, discardedTile, onSelect, onPass }: ChowSelectorProps) {
  return (
    <div className="space-y-1 md:space-y-2 py-1 md:py-2 px-1 md:px-2">
      <div className="text-center mb-1">
        <p className="font-pixel text-[10px] md:text-xs text-retro-cyan">
          Choose your Chow:
        </p>
        <p className="font-retro text-[10px] text-retro-textDim mt-0.5 px-2">
          A Chow reveals part of your hand — pick the sequence that best fits your shape, or pass to stay concealed.
        </p>
      </div>
      <div className="flex flex-col items-center gap-1.5 md:gap-2">
        {options.map((handTiles, i) => {
          // Build the full 3-tile sequence and sort by number
          const fullSeq = [...handTiles, discardedTile].sort(
            (a, b) => (a.number ?? 0) - (b.number ?? 0)
          );
          return (
            <button
              key={i}
              type="button"
              className="flex items-center gap-0.5 px-2 md:px-3 py-1 md:py-1.5 rounded border-2 border-retro-border/40 hover:border-retro-cyan/60 hover:bg-retro-cyan/10 transition-colors min-h-[44px]"
              onClick={() => onSelect(handTiles)}
            >
              {fullSeq.map(tile => (
                <RetroTile
                  key={tile.id}
                  tile={tile}
                  size="sm"
                  isLastDiscarded={tile.id === discardedTile.id}
                />
              ))}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          className="min-h-[44px] px-5 py-2 retro-btn bg-retro-bgLight border-retro-border/40 font-retro text-sm"
          onClick={onPass}
        >
          [ PASS ]
        </button>
      </div>
    </div>
  );
}
