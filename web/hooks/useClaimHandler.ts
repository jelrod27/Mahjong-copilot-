'use client';

import { useCallback } from 'react';
import { ClaimType } from '@/models/GameState';
import { Tile } from '@/models/Tile';
import type { AvailableClaim } from '@/engine/types';
import { getBestClaimSubmission } from '@/engine/claiming';

interface ClaimHandlerOptions {
  claimOptions: AvailableClaim[];
  submitClaim: (claimType: ClaimType, tilesFromHand: Tile[]) => void;
  pass: () => void;
}

/**
 * One-tap claiming: submits the highest-priority valid claim (win > kong > pung > chow)
 * using the first valid tile combination when several exist.
 */
export default function useClaimHandler({ claimOptions, submitClaim, pass }: ClaimHandlerOptions) {
  const claimBest = useCallback(() => {
    const best = getBestClaimSubmission(claimOptions);
    if (best) {
      submitClaim(best.claimType, best.tilesFromHand);
    }
  }, [claimOptions, submitClaim]);

  return { claimBest, pass };
}
