'use client';

import { Tile } from '@/models/Tile';
import { ClaimType } from '@/models/GameState';
import { AvailableClaim } from '@/engine/types';
import RetroTile from './RetroTile';

interface ClaimChoiceModalProps {
  claim: AvailableClaim;
  discardedTile: Tile;
  onSelect: (claimType: ClaimType, tilesFromHand: Tile[]) => void;
  onCancel: () => void;
}

export default function ClaimChoiceModal({
  claim, discardedTile, onSelect, onCancel,
}: ClaimChoiceModalProps) {
  // If only one option, no need for modal
  if (claim.tilesFromHand.length <= 1) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="retro-panel p-4 max-w-sm w-full">
        <div className="font-pixel text-xs text-retro-cyan mb-3 text-center">
          CHOOSE TILES FOR {claim.claimType.toUpperCase()}
        </div>

        {/* Discarded tile */}
        <div className="text-center mb-3">
          <div className="font-retro text-xs text-retro-textDim mb-1">Claiming:</div>
          <div className="flex justify-center">
            <RetroTile tile={discardedTile} size="md" isLastDiscarded />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {claim.tilesFromHand.map((tiles, i) => (
            <button
              key={i}
              onClick={() => onSelect(claim.claimType, tiles)}
              className="w-full retro-btn bg-retro-bgLight flex items-center justify-center gap-1 py-2"
            >
              {tiles.map(tile => (
                <RetroTile key={tile.id} tile={tile} size="sm" />
              ))}
              <span className="text-retro-textDim ml-2">+</span>
              <RetroTile tile={discardedTile} size="sm" />
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="retro-btn bg-retro-bgLight w-full mt-3 text-center"
        >
          [ CANCEL ]
        </button>
      </div>
    </div>
  );
}
