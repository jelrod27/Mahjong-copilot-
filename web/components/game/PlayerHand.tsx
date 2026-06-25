'use client';

import { memo, useRef, useLayoutEffect } from 'react';
import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';
import type { TileHeatOverlay } from '@/engine/shantenHeat';

interface PlayerHandProps {
  tiles: Tile[];
  selectedTileId?: string;
  suggestedTileId?: string;
  onTileSelect: (tile: Tile) => void;
  lastDrawnTileId?: string;
  disabled?: boolean;
  tileClassifications?: Map<string, 'green' | 'orange' | 'red'>;
  heatOverlays?: Map<string, TileHeatOverlay>;
}

function PlayerHand({
  tiles, selectedTileId, suggestedTileId, onTileSelect, lastDrawnTileId,
  disabled = false, tileClassifications, heatOverlays,
}: PlayerHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const orderSig = tiles.map(t => t.id).join('|');

  // FLIP: when tiles reorder (manual sort) or a gap closes after a discard,
  // slide each tile from its previous position instead of teleporting.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-flight-tile]'));
    const newRects = new Map<string, DOMRect>();
    for (const el of els) {
      const id = el.dataset.flightTile;
      if (id) newRects.set(id, el.getBoundingClientRect());
    }

    const reduce = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      for (const el of els) {
        const id = el.dataset.flightTile;
        if (!id) continue;
        const prev = prevRects.current.get(id);
        const next = newRects.get(id);
        if (prev && next && Math.abs(prev.left - next.left) > 2) {
          el.classList.remove('hand-flip-tile');
          el.style.transform = `translateX(${prev.left - next.left}px)`;
          void el.offsetWidth; // force reflow so the transition animates
          el.classList.add('hand-flip-tile');
          el.style.transform = '';
        }
      }
    }
    prevRects.current = newRects;
  }, [orderSig]);

  return (
    <div
      ref={containerRef}
      className="flex min-w-min flex-nowrap items-end justify-center gap-px px-1 sm:gap-0.5"
    >
      {tiles.map((tile) => {
        const isLastDrawn = tile.id === lastDrawnTileId;
        const tutorColor = tileClassifications?.get(tile.id);
        const tutorLabel = tutorColor === 'green' ? 'GOOD' : tutorColor === 'orange' ? 'OK' : tutorColor === 'red' ? 'KEEP' : null;
        const heatOverlay = heatOverlays?.get(tile.id);
        return (
          <div
            key={tile.id}
            className={`shrink-0 ${isLastDrawn ? 'ml-1 sm:ml-3' : ''}`}
            data-testid="human-hand-tile"
            data-flight-tile={tile.id}
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
              heatOverlay={heatOverlay}
            />
            {tutorLabel && (
              <div
                className="mt-0.5 text-center font-sans text-muted-foreground"
                style={{ fontSize: 'calc(var(--tile-w) * 0.2)' }}
                aria-hidden="true"
              >
                {tutorLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(PlayerHand);
