'use client';

import { useRef, useEffect, useState } from 'react';
import { Tile } from '@/models/Tile';
import RetroTile from './RetroTile';

interface DiscardPoolProps {
  discards: Tile[];
  lastDiscardedTile?: Tile;
  /** Strong highlight on the most recent discard (e.g. during your claim window). */
  claimHighlight?: boolean;
  /** Per-player discard mapping: playerId → tiles discarded (in order) */
  playerDiscards?: Record<string, Tile[]>;
  /** Player names keyed by ID for labeling sections */
  playerNames?: Record<string, string>;
}

/** Track which tiles are new arrivals (for entry animation) and which just left (for exit ghost). */
function useDiscardAnimation(discards: Tile[]) {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newTileIds, setNewTileIds] = useState<Set<string>>(new Set());
  const [ghostTiles, setGhostTiles] = useState<Tile[]>([]);
  const prevDiscardRef = useRef<Tile[]>([]);

  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const currentIds = new Set(discards.map(t => t.id));

    // Detect new arrivals
    const arrivals = new Set<string>();
    discards.forEach(t => {
      if (!prevIds.has(t.id)) arrivals.add(t.id);
    });

    // Detect departures (claimed tiles)
    const departed: Tile[] = [];
    prevDiscardRef.current.forEach(t => {
      if (!currentIds.has(t.id)) departed.push(t);
    });

    if (arrivals.size > 0) {
      setNewTileIds(arrivals);
      const timer = setTimeout(() => setNewTileIds(new Set()), 300);
      return () => clearTimeout(timer);
    }

    if (departed.length > 0) {
      setGhostTiles(departed);
      const timer = setTimeout(() => setGhostTiles([]), 250);
      return () => clearTimeout(timer);
    }

    prevIdsRef.current = currentIds;
    prevDiscardRef.current = discards;
  }, [discards]);

  // Update refs after state settles
  useEffect(() => {
    prevIdsRef.current = new Set(discards.map(t => t.id));
    prevDiscardRef.current = discards;
  }, [discards]);

  return { newTileIds, ghostTiles };
}

function TileWrapper({
  tile, isLast, claimHighlight, isNew, isGhost,
}: {
  tile: Tile; isLast: boolean; claimHighlight: boolean; isNew: boolean; isGhost: boolean;
}) {
  const spotlight = claimHighlight && isLast;

  let className = 'flex items-center justify-center';
  if (spotlight) {
    className = 'relative flex items-center justify-center rounded-md p-0.5 ring-4 ring-retro-gold ring-offset-1 ring-offset-[#1a1f1c] shadow-[0_0_24px_rgba(245,183,49,0.55)] animate-pulse-gold scale-105 z-10';
  } else if (isNew) {
    className = 'flex items-center justify-center animate-tile-arrive';
  } else if (isGhost) {
    className = 'flex items-center justify-center animate-tile-depart pointer-events-none';
  }

  return (
    <div className={className}>
      <RetroTile tile={tile} size="sm" isLastDiscarded={isLast} />
    </div>
  );
}

export default function DiscardPool({
  discards, lastDiscardedTile, claimHighlight,
  playerDiscards, playerNames,
}: DiscardPoolProps) {
  const { newTileIds, ghostTiles } = useDiscardAnimation(discards);

  // If per-player discards are provided, show sectioned view
  if (playerDiscards && playerNames) {
    const playerIds = Object.keys(playerDiscards).filter(id => playerDiscards[id].length > 0);
    if (playerIds.length > 0) {
      return (
        <div className="retro-panel p-2 space-y-1">
          {playerIds.map(playerId => (
            <div key={playerId}>
              <div className="font-retro text-[9px] text-retro-textDim mb-0.5">
                {playerNames[playerId] ?? playerId}
              </div>
              <div className="flex flex-wrap gap-px">
                {playerDiscards[playerId].map(tile => (
                  <TileWrapper
                    key={tile.id}
                    tile={tile}
                    isLast={tile.id === lastDiscardedTile?.id}
                    claimHighlight={claimHighlight ?? false}
                    isNew={newTileIds.has(tile.id)}
                    isGhost={false}
                  />
                ))}
                {/* Ghost tiles for departure animation */}
                {ghostTiles.map(tile => (
                  <TileWrapper
                    key={`ghost-${tile.id}`}
                    tile={tile}
                    isLast={false}
                    claimHighlight={false}
                    isNew={false}
                    isGhost={true}
                  />
                ))}
              </div>
            </div>
          ))}
          {claimHighlight && lastDiscardedTile && (
            <p className="mt-1 text-center font-pixel text-[9px] text-retro-gold retro-glow tracking-wide">
              LAST DISCARD — USE CLAIM BELOW
            </p>
          )}
        </div>
      );
    }
  }

  // Fallback: single grid view
  return (
    <div className="retro-panel p-2">
      <div className="grid grid-cols-6 gap-px min-h-[120px]">
        {discards.map((tile) => (
          <TileWrapper
            key={tile.id}
            tile={tile}
            isLast={tile.id === lastDiscardedTile?.id}
            claimHighlight={claimHighlight ?? false}
            isNew={newTileIds.has(tile.id)}
            isGhost={false}
          />
        ))}
        {ghostTiles.map(tile => (
          <TileWrapper
            key={`ghost-${tile.id}`}
            tile={tile}
            isLast={false}
            claimHighlight={false}
            isNew={false}
            isGhost={true}
          />
        ))}
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
