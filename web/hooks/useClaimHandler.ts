'use client';

import { useState, useCallback } from 'react';
import { ClaimType } from '@/models/GameState';
import { Tile } from '@/models/Tile';
import { AvailableClaim } from '@/engine/types';

interface ClaimHandlerOptions {
  claimOptions: AvailableClaim[];
  submitClaim: (claimType: ClaimType, tilesFromHand: Tile[]) => void;
  pass: () => void;
}

/**
 * Shared claim handler logic — used by GameContent, practice page, and multiplayer game page.
 * Manages the pending claim state and provides handleClaim/handleClaimSelect/cancelClaim.
 */
export default function useClaimHandler({ claimOptions, submitClaim, pass }: ClaimHandlerOptions) {
  const [pendingClaim, setPendingClaim] = useState<AvailableClaim | null>(null);

  const handleClaim = useCallback((claimType: ClaimType) => {
    const claim = claimOptions.find(c => c.claimType === claimType);
    if (!claim) return;

    if (claim.tilesFromHand.length > 1) {
      setPendingClaim(claim);
      return;
    }

    submitClaim(claimType, claim.tilesFromHand[0] || []);
  }, [claimOptions, submitClaim]);

  const handleClaimSelect = useCallback((claimType: ClaimType, tilesFromHand: Tile[]) => {
    submitClaim(claimType, tilesFromHand);
    setPendingClaim(null);
  }, [submitClaim]);

  const cancelClaim = useCallback(() => {
    setPendingClaim(null);
    pass();
  }, [pass]);

  return { pendingClaim, handleClaim, handleClaimSelect, cancelClaim };
}
