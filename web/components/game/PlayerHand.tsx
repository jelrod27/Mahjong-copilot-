'use client';

import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 767px)');
  const tileSize = isMobile ? 'sm' : isTablet ? 'md' : 'lg';

  return (
    <div className="flex items-end justify-center gap-px sm:gap-0.5 flex-wrap">
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
              size={tileSize}
              isSelected={tile.id === selectedTileId}
              isSuggested={tile.id === suggestedTileId}
              isNewlyDrawn={isLastDrawn}
              onClick={() => onTileSelect(tile)}
              disabled={disabled}
              tutorColor={tutorColor}
              tutorLabel={tutorLabel ?? undefined}
            />
            {tutorLabel && (
              <div className="mt-0.5 text-center font-pixel text-[6px] text-retro-textDim" aria-hidden="true">
                {tutorLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
