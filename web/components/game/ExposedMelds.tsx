'use client';

import { MeldInfo } from '@/models/GameState';
import RetroTile from './RetroTile';

interface ExposedMeldsProps {
  melds: MeldInfo[];
  size?: 'xs' | 'sm' | 'md';
}

export default function ExposedMelds({ melds, size = 'sm' }: ExposedMeldsProps) {
  if (melds.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {melds.map((meld, i) => (
        <div key={i} className="flex gap-px">
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
