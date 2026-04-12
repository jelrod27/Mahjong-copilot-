'use client';

import { Tile } from '@/models/Tile';
import { TurnPhase } from '@/models/GameState';
import { AvailableClaim } from '@/engine/types';
import { getBestClaimSubmission } from '@/engine/claiming';
import ChowSelector from './ChowSelector';

interface ActionBarProps {
  canDiscard: boolean;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
  hasClaimOptions: boolean;
  claimOptions: AvailableClaim[];
  discardedTile?: Tile;
  onDiscard: () => void;
  onKong: () => void;
  onWin: () => void;
  onClaimBest: () => void;
  onSubmitChow: (tilesFromHand: Tile[]) => void;
  onPass: () => void;
  turnPhase: TurnPhase;
  isHumanTurn: boolean;
  claimTimer?: number;
  claimTimeout?: number;
}

function claimSummaryLabel(claimType: string): string {
  switch (claimType) {
    case 'win':
      return 'Win the hand';
    case 'kong':
      return 'Take as Kong (four of a kind)';
    case 'pung':
      return 'Take as Pung (three of a kind)';
    case 'chow':
      return 'Take as Chow (sequence)';
    default:
      return 'Take this tile';
  }
}

export default function ActionBar({
  canDiscard, canDeclareKong, canDeclareWin, hasClaimOptions,
  claimOptions, discardedTile,
  onDiscard, onKong, onWin, onClaimBest, onSubmitChow, onPass,
  turnPhase, isHumanTurn, claimTimer = 0, claimTimeout = 10000,
}: ActionBarProps) {
  if (turnPhase === 'discard' && isHumanTurn) {
    return (
      <div className="flex items-center justify-center gap-2 py-1 md:py-2">
        <button
          className="retro-btn-accent min-h-[44px] px-4 md:px-6"
          onClick={onDiscard}
          disabled={!canDiscard}
        >
          [ DISCARD ]
        </button>
        {canDeclareKong && (
          <button type="button" className="retro-btn-gold min-h-[44px] px-4 md:px-6" onClick={onKong}>
            [ KONG ]
          </button>
        )}
        {canDeclareWin && (
          <button type="button" className="retro-btn-green min-h-[44px] px-4 md:px-6" onClick={onWin}>
            [ WIN! ]
          </button>
        )}
      </div>
    );
  }

  if (turnPhase === 'claim' && hasClaimOptions && claimOptions.length > 0) {
    const best = getBestClaimSubmission(claimOptions);
    const timerPct = claimTimer > 0 ? (claimTimer / claimTimeout) * 100 : 0;
    const timerColor = timerPct > 50 ? 'bg-retro-cyan' : timerPct > 20 ? 'bg-retro-gold' : 'bg-retro-accent';

    // Check if the only/best claim is a chow with multiple combinations
    const chowClaim = claimOptions.find(c => c.claimType === 'chow');
    const hasMultipleChows = chowClaim && chowClaim.tilesFromHand.length > 1;
    const bestIsChow = best?.claimType === 'chow';

    // Show chow selector when chow is the best (or only) claim and there are multiple combos
    if (bestIsChow && hasMultipleChows && discardedTile) {
      return (
        <div className="space-y-1 md:space-y-2 py-1 md:py-2 px-1 md:px-2">
          <div className="h-1 bg-retro-bgLight rounded-full mx-1">
            <div
              className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <ChowSelector
            options={chowClaim!.tilesFromHand}
            discardedTile={discardedTile}
            onSelect={onSubmitChow}
            onPass={onPass}
          />
        </div>
      );
    }

    const primaryVerb = best?.claimType === 'win' ? 'WIN!' : 'CLAIM';

    return (
      <div className="space-y-1 md:space-y-2 py-1 md:py-2 px-1 md:px-2">
        <div className="h-1 bg-retro-bgLight rounded-full mx-1">
          <div
            className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <button
            type="button"
            data-testid="claim-best-button"
            className={`min-h-[48px] px-6 py-3 font-pixel text-sm sm:text-base rounded-md border-2 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/70 ${
              best?.claimType === 'win'
                ? 'retro-btn-green shadow-[0_0_20px_rgba(0,255,100,0.35)] border-retro-green/50'
                : 'bg-retro-cyan/25 text-retro-cyan border-retro-cyan/60 shadow-[0_0_16px_rgba(69,183,209,0.35)] hover:bg-retro-cyan/35'
            }`}
            onClick={onClaimBest}
          >
            [ {primaryVerb} ]
          </button>
          <button
            type="button"
            className="min-h-[48px] px-5 py-3 retro-btn bg-retro-bgLight border-retro-border/40 font-retro text-base"
            onClick={onPass}
          >
            [ PASS ]
          </button>
        </div>
        {best && (
          <p className="text-center font-retro text-xs text-retro-textDim px-2">
            {claimSummaryLabel(best.claimType)} — adds the highlighted discard to your hand.
          </p>
        )}
      </div>
    );
  }

  if (!isHumanTurn) {
    return (
      <div className="flex items-center justify-center py-1 md:py-2">
        <span className="text-retro-textDim font-retro text-sm md:text-lg">
          Waiting for opponent<span className="animate-blink">...</span>
        </span>
      </div>
    );
  }

  return null;
}
