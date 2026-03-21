'use client';

import { TurnPhase } from '@/models/GameState';

interface ActionBarProps {
  canDiscard: boolean;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
  hasClaimOptions: boolean;
  onDiscard: () => void;
  onKong: () => void;
  onWin: () => void;
  onClaim: (claimType: string) => void;
  onPass: () => void;
  turnPhase: TurnPhase;
  isHumanTurn: boolean;
}

export default function ActionBar({
  canDiscard, canDeclareKong, canDeclareWin, hasClaimOptions,
  onDiscard, onKong, onWin, onClaim, onPass,
  turnPhase, isHumanTurn,
}: ActionBarProps) {
  // During discard phase (human's turn)
  if (turnPhase === 'discard' && isHumanTurn) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <button
          className="retro-btn-accent"
          onClick={onDiscard}
          disabled={!canDiscard}
        >
          [ DISCARD ]
        </button>
        {canDeclareKong && (
          <button className="retro-btn-gold" onClick={onKong}>
            [ KONG ]
          </button>
        )}
        {canDeclareWin && (
          <button className="retro-btn-green" onClick={onWin}>
            [ WIN! ]
          </button>
        )}
      </div>
    );
  }

  // During claim phase (opponent discarded)
  if (turnPhase === 'claim' && hasClaimOptions) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <button className="retro-btn-green" onClick={() => onClaim('win')}>
          [ WIN ]
        </button>
        <button className="retro-btn-gold" onClick={() => onClaim('kong')}>
          [ KONG ]
        </button>
        <button className="retro-btn-gold" onClick={() => onClaim('pung')}>
          [ PUNG ]
        </button>
        <button className="retro-btn" onClick={() => onClaim('chow')}>
          [ CHOW ]
        </button>
        <button className="retro-btn bg-retro-bgLight" onClick={onPass}>
          [ PASS ]
        </button>
      </div>
    );
  }

  // Waiting for opponent
  if (!isHumanTurn) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-retro-textDim font-retro text-lg">
          Waiting for opponent<span className="animate-blink">...</span>
        </span>
      </div>
    );
  }

  return null;
}
