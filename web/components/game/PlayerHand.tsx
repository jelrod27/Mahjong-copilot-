'use client';

import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';

interface PlayerHandProps {
  tiles: Tile[];
  selectedTileId?: string;
  suggestedTileId?: string;
  onTileSelect: (tile: Tile) => void;
  lastDrawnTileId?: string;
  disabled?: boolean;
  tileClassifications?: Map<string, 'green' | 'orange' | 'red'>;
}

export default function PlayerHand({
  tiles, selectedTileId, suggestedTileId, onTileSelect, lastDrawnTileId,
  disabled = false, tileClassifications,
}: PlayerHandProps) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-px sm:gap-0.5">
      {tiles.map((tile) => {
        const isLastDrawn = tile.id === lastDrawnTileId;
        const tutorColor = tileClassifications?.get(tile.id);
        const tutorLabel = tutorColor === 'green' ? 'GOOD' : tutorColor === 'orange' ? 'OK' : tutorColor === 'red' ? 'KEEP' : null;
        return (
          <div
            key={tile.id}
            className={isLastDrawn ? 'ml-1 sm:ml-3' : ''}
            data-testid="human-hand-tile"
          >
            <RetroTile
              tile={tile}
              size="lg"
              isSelected={tile.id === selectedTileId}
              isSuggested={tile.id === suggestedTileId}
              isNewlyDrawn={isLastDrawn}
              onClick={() => onTileSelect(tile)}
              disabled={disabled}
              tutorColor={tutorColor}
              tutorLabel={tutorLabel ?? undefined}
            />
            {tutorLabel && (
              <div className="mt-0.5 text-center font-sans text-[length:calc(var(--tile-w)*0.22)] text-muted-foreground" aria-hidden="true">
                {tutorLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
