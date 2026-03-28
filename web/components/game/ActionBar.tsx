'use client';

import { TurnPhase, ClaimType } from '@/models/GameState';

interface ActionBarProps {
  canDiscard: boolean;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
  hasClaimOptions: boolean;
  availableClaimTypes?: ClaimType[];
  onDiscard: () => void;
  onKong: () => void;
  onWin: () => void;
  onClaim: (claimType: ClaimType) => void;
  onPass: () => void;
  turnPhase: TurnPhase;
  isHumanTurn: boolean;
  claimTimer?: number;
  claimTimeout?: number;
}

export default function ActionBar({
  canDiscard, canDeclareKong, canDeclareWin, hasClaimOptions,
  availableClaimTypes = [],
  onDiscard, onKong, onWin, onClaim, onPass,
  turnPhase, isHumanTurn, claimTimer = 0, claimTimeout = 10000,
}: ActionBarProps) {
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

  if (turnPhase === 'claim' && hasClaimOptions) {
    const timerPct = claimTimer > 0 ? (claimTimer / claimTimeout) * 100 : 0;
    const timerColor = timerPct > 50 ? 'bg-retro-cyan' : timerPct > 20 ? 'bg-retro-gold' : 'bg-retro-accent';
    const hasClaim = (type: ClaimType) => availableClaimTypes.length === 0 || availableClaimTypes.includes(type);
    return (
      <div className="space-y-1 py-2">
        <div className="h-1 bg-retro-bgLight rounded-full mx-4">
          <div
            className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-2 animate-pulse-subtle">
          {hasClaim('win') && (
            <button className="retro-btn-green shadow-[0_0_12px_rgba(0,255,100,0.4)]" onClick={() => onClaim('win')}>
              [ WIN ]
            </button>
          )}
          {hasClaim('kong') && (
            <button className="retro-btn-gold shadow-[0_0_12px_rgba(255,215,0,0.4)]" onClick={() => onClaim('kong')}>
              [ KONG ]
            </button>
          )}
          {hasClaim('pung') && (
            <button className="retro-btn-gold shadow-[0_0_12px_rgba(255,215,0,0.4)]" onClick={() => onClaim('pung')}>
              [ PUNG ]
            </button>
          )}
          {hasClaim('chow') && (
            <button className="retro-btn shadow-[0_0_8px_rgba(83,216,251,0.3)]" onClick={() => onClaim('chow')}>
              [ CHOW ]
            </button>
          )}
          <button className="retro-btn bg-retro-bgLight" onClick={onPass}>
            [ PASS ]
          </button>
        </div>
      </div>
    );
  }

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
