'use client';

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

export default function DiscardPool({
  discards, lastDiscardedTile, claimHighlight,
  playerDiscards, playerNames,
}: DiscardPoolProps) {
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
                {playerDiscards[playerId].map(tile => {
                  const isLast = tile.id === lastDiscardedTile?.id;
                  const spotlight = claimHighlight && isLast;
                  return (
                    <div
                      key={tile.id}
                      className={
                        spotlight
                          ? 'relative flex items-center justify-center rounded-md p-0.5 ring-4 ring-retro-gold ring-offset-1 ring-offset-[#1a1f1c] shadow-[0_0_24px_rgba(245,183,49,0.55)] animate-pulse-gold scale-105 z-10'
                          : 'flex items-center justify-center'
                      }
                    >
                      <RetroTile tile={tile} size="sm" isLastDiscarded={isLast} />
                    </div>
                  );
                })}
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
