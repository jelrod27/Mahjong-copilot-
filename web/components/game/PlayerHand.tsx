'use client';

import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';

interface PlayerHandProps {
  tiles: Tile[];
  selectedTileId?: string;
  onTileSelect: (tile: Tile) => void;
  lastDrawnTileId?: string;
  disabled?: boolean;
}

export default function PlayerHand({
  tiles, selectedTileId, onTileSelect, lastDrawnTileId, disabled = false,
}: PlayerHandProps) {
  return (
    <div className="flex items-end justify-center gap-0.5 flex-wrap">
      {tiles.map((tile, i) => {
        const isLastDrawn = tile.id === lastDrawnTileId;
        return (
          <div key={tile.id} className={isLastDrawn ? 'ml-3' : ''}>
            <RetroTile
              tile={tile}
              size="lg"
              isSelected={tile.id === selectedTileId}
              onClick={() => onTileSelect(tile)}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
