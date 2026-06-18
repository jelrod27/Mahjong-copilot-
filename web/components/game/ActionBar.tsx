'use client';

import { Tile } from '@/models/Tile';
import { TurnPhase } from '@/models/GameState';
import { AvailableClaim } from '@/engine/types';
import { getBestClaimSubmission } from '@/engine/claiming';
import type { WinShortfall } from './useGameController';
import ChowSelector from './ChowSelector';

interface ActionBarProps {
  canDiscard: boolean;
  canDeclareKong: boolean;
  canDeclareWin: boolean;
  /** Set when a complete hand is below the table's faan minimum — explains why there's no Mahjong button. */
  winShortfall?: WinShortfall | null;
  hasClaimOptions: boolean;
  claimOptions: AvailableClaim[];
  discardedTile?: Tile;
  selectedTileName?: string;
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

function claimConsequence(claimType: string, tileName: string | undefined): string {
  const tile = tileName ?? 'this tile';
  switch (claimType) {
    case 'win':
      return `${tile} completes a winning hand — declare Mahjong!`;
    case 'kong':
      return `Forms an exposed Kong (four of a kind). Strong on dragons and your seat wind; you draw a replacement tile.`;
    case 'pung':
      return `Forms an exposed Pung (three of a kind). Reveals part of your hand, but locks in a useful set.`;
    case 'chow':
      return `Forms an exposed Chow (sequence). Reveals part of your hand — only worth it if it speeds up your shape.`;
    default:
      return 'Take this tile.';
  }
}

const PASS_HINT =
  'Keeping your hand concealed is often better — pass if the claim does not improve your shape.';

export default function ActionBar({
  canDiscard,
  canDeclareKong,
  canDeclareWin,
  winShortfall,
  hasClaimOptions,
  claimOptions,
  discardedTile,
  selectedTileName,
  onDiscard,
  onKong,
  onWin,
  onClaimBest,
  onSubmitChow,
  onPass,
  turnPhase,
  isHumanTurn,
  claimTimer = 0,
  claimTimeout = 10000,
}: ActionBarProps) {
  if (turnPhase === 'discard' && isHumanTurn) {
    const discardAria = selectedTileName
      ? `Discard ${selectedTileName}`
      : 'Discard selected tile';
    return (
      <div className="space-y-3 py-1 md:space-y-0 md:py-1">
        {/* The phase pill on the table already carries this guidance on desktop */}
        <p className="text-center font-sans text-xs text-muted-foreground md:hidden">
          {selectedTileName ? (
            <>
              <span className="font-medium text-foreground">{selectedTileName}</span> is selected. Tap
              discard to send it out, or pick another tile.
            </>
          ) : (
            <>Select one tile from your hand, then confirm discard.</>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            data-testid="discard-tile-button"
            aria-label={discardAria}
            className="ds-btn-accent min-h-[48px] min-w-[140px] flex-col gap-0.5 px-6 py-2.5 md:min-w-[180px]"
            onClick={onDiscard}
            disabled={!canDiscard}
          >
            <span className="font-display text-sm font-bold tracking-wide">Discard</span>
            {selectedTileName ? (
              <span className="max-w-[220px] truncate font-sans text-[11px] font-normal text-white/85">
                {selectedTileName}
              </span>
            ) : (
              <span className="font-sans text-[11px] font-normal text-white/70">Choose a tile first</span>
            )}
          </button>
          {canDeclareKong && (
            <button
              type="button"
              className="ds-btn-highlight min-h-[48px] px-5 py-2.5 font-display text-sm font-semibold"
              onClick={onKong}
            >
              Kong
            </button>
          )}
          {canDeclareWin && (
            <button
              type="button"
              className="ds-btn-success min-h-[48px] px-5 py-2.5 font-display text-sm font-semibold"
              onClick={onWin}
            >
              Mahjong
            </button>
          )}
        </div>
        {!canDeclareWin && winShortfall && (
          <div
            data-testid="win-short-notice"
            className="mx-auto max-w-[22rem] rounded-lg border border-highlight/40 bg-highlight/10 px-3 py-2 text-center"
          >
            <p className="font-display text-xs font-semibold text-highlight">
              Complete hand — but only {winShortfall.currentFaan} faan
            </p>
            <p className="font-sans text-[11px] leading-snug text-muted-foreground">
              This table needs {winShortfall.minFaan}+ to win. Build value: go for one suit, all pungs, or a dragon/wind pung.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (turnPhase === 'claim' && hasClaimOptions && claimOptions.length > 0) {
    const best = getBestClaimSubmission(claimOptions);
    const timerPct = claimTimer > 0 ? (claimTimer / claimTimeout) * 100 : 0;
    const timerColor = timerPct > 50 ? 'bg-info' : timerPct > 20 ? 'bg-highlight' : 'bg-accent';

    const chowClaim = claimOptions.find((c) => c.claimType === 'chow');
    const hasMultipleChows = chowClaim && chowClaim.tilesFromHand.length > 1;
    const bestIsChow = best?.claimType === 'chow';

    if (bestIsChow && hasMultipleChows && discardedTile) {
      return (
        <div className="space-y-2 py-1 md:space-y-3 md:py-2 md:px-1">
          <div className="mx-1 h-1 overflow-hidden rounded-full bg-elevated">
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

    const primaryLabel = best?.claimType === 'win' ? 'Declare Mahjong' : 'Take discard';

    return (
      <div className="space-y-3 py-1 md:space-y-4 md:py-2 md:px-1">
        <div className="mx-1 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            data-testid="claim-best-button"
            className={`min-h-[52px] flex-1 rounded-xl border-2 px-6 py-3 font-display text-sm font-semibold transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:flex-none sm:px-10 ${
              best?.claimType === 'win'
                ? 'ds-btn-success border-success/40 shadow-ds-md'
                : 'border-accent/45 bg-accent/15 text-highlight shadow-ds-sm hover:bg-accent/25'
            }`}
            onClick={onClaimBest}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            data-testid="claim-pass-button"
            className="min-h-[52px] rounded-xl border border-border/50 bg-background/40 px-6 py-3 font-sans text-sm font-semibold text-muted-foreground backdrop-blur-sm transition-colors hover:border-border hover:text-foreground sm:px-8"
            onClick={onPass}
          >
            Pass
          </button>
        </div>
        {best && (
          <div className="space-y-1 px-1 text-center">
            <p className="font-sans text-xs leading-relaxed text-foreground md:text-sm" data-testid="claim-consequence">
              <span className="font-semibold text-info">{claimSummaryLabel(best.claimType)}.</span>{' '}
              {claimConsequence(best.claimType, discardedTile?.nameEnglish)}
            </p>
            <p className="font-sans text-[10px] leading-relaxed text-muted-foreground md:text-xs" data-testid="claim-pass-hint">
              <span className="font-semibold text-muted-foreground">Pass:</span> {PASS_HINT}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!isHumanTurn) {
    // Desktop: the table's phase pill already says whose turn it is —
    // don't spend a dock row repeating it.
    return (
      <div className="flex items-center justify-center py-3 md:hidden">
        <p className="text-center font-sans text-sm text-muted-foreground">
          Opponents are playing
          <span className="animate-blink">…</span>
        </p>
      </div>
    );
  }

  return null;
}
