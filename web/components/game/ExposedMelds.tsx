'use client';

import { useEffect, useRef, useState } from 'react';
import { MeldInfo } from '@/models/GameState';
import RetroTile from './RetroTile';

interface ExposedMeldsProps {
  melds: MeldInfo[];
  size?: 'xs' | 'sm' | 'md';
}

/**
 * Renders a player's exposed melds. The most-recent meld plays a brief
 * `tile-claim` flash animation when meld count grows, so a new pung/chow/kong
 * lands with a visible "claimed!" cue rather than appearing silently.
 */
export default function ExposedMelds({ melds, size = 'sm' }: ExposedMeldsProps) {
  const prevCount = useRef(melds.length);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (melds.length > prevCount.current) {
      setFlashKey(k => k + 1);
    }
    prevCount.current = melds.length;
  }, [melds.length]);

  if (melds.length === 0) return null;

  const lastIndex = melds.length - 1;

  return (
    <div className="flex gap-2 flex-wrap">
      {melds.map((meld, i) => (
        <div
          key={`${flashKey}-${i}`}
          className={`flex gap-px ${i === lastIndex ? 'animate-tile-claim' : ''}`}
        >
          {meld.tiles.map((tile, j) => {
            // For concealed kongs, show first and last face-down
            const showBack = meld.isConcealed && meld.type === 'kong' && (j === 0 || j === 3);
            return (
              <RetroTile
                key={tile.id}
                tile={tile}
                size={size}
                showBack={showBack}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
