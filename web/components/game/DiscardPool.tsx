'use client';

import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';

interface DiscardPoolProps {
  discards: Tile[];
  lastDiscardedTile?: Tile;
}

export default function DiscardPool({ discards, lastDiscardedTile }: DiscardPoolProps) {
  return (
    <div className="retro-panel p-2">
      <div className="grid grid-cols-6 gap-px min-h-[120px]">
        {discards.map(tile => (
          <RetroTile
            key={tile.id}
            tile={tile}
            size="sm"
            isLastDiscarded={tile.id === lastDiscardedTile?.id}
          />
        ))}
      </div>
      {discards.length === 0 && (
        <div className="flex items-center justify-center h-[120px] text-retro-textDim font-retro text-sm">
          No discards yet
        </div>
      )}
    </div>
  );
}
