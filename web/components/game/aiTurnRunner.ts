/**
 * Sequential AI turn runner — one in-flight token from start to applied action.
 * Avoids effect re-entry races between draw follow-ups (win/kong) and discard.
 */

import { GamePhase, GameState } from '@/models/GameState';
import { TileType } from '@/models/Tile';
import { GameAction } from '@/engine/types';
import { getAIDecision, getAIClaimDecision } from '@/engine/ai';
import { getLegalClaims } from '@/engine/turnManager';

export interface AiTurnDelays {
  draw: number;
  discard: number;
}

export interface AiTurnRunnerOptions {
  delays: AiTurnDelays;
  /** Apply an engine action for the given player; returns next state or null. */
  apply: (playerId: string, action: GameAction) => GameState | null;
  /** Read the latest game state (refs) for fallbacks after async gaps. */
  getGame: () => GameState | null;
  /** Called when the chain finishes or is cancelled. */
  onComplete?: () => void;
  /** Special-action pause after draw before win/kong (ms). */
  specialActionDelayMs?: number;
  claimDelayMs?: number;
  /**
   * Seat this chain acts for. Defaults to `game.currentPlayerIndex`, which is
   * correct for draw and discard. During a claim window it is NOT — the window
   * is simultaneous and `currentPlayerIndex` names the next drawer — so the
   * caller must pass the claimant's seat explicitly.
   */
  seatIndex?: number;
}

type TimerHandle = ReturnType<typeof setTimeout>;

/**
 * Start one AI action chain for the current seat/phase.
 * Returns a cancel function that clears pending timers.
 */
export function startAiTurn(
  game: GameState,
  options: AiTurnRunnerOptions,
): () => void {
  const timers: TimerHandle[] = [];
  let cancelled = false;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    options.onComplete?.();
  };

  const schedule = (ms: number, fn: () => void) => {
    const handle = setTimeout(() => {
      if (cancelled) return;
      fn();
    }, ms);
    timers.push(handle);
  };

  const seatIndex = options.seatIndex ?? game.currentPlayerIndex;

  const applyWithDiscardFallback = (playerId: string, action: GameAction) => {
    const applied = options.apply(playerId, action);
    if (!applied && action.type !== 'DISCARD') {
      // Read the fallback from this chain's own seat. `currentPlayerIndex` may
      // already have moved on by the time a rejected action lands here.
      const live = options.getGame();
      const aiPlayer = live?.players[seatIndex];
      const fallback = aiPlayer?.hand.find(t => t.type !== TileType.BONUS);
      if (fallback) options.apply(playerId, { type: 'DISCARD', tile: fallback });
    }
    finish();
  };

  const player = game.players[seatIndex];
  if (!player?.isAI || game.phase !== GamePhase.PLAYING) {
    finish();
    return () => undefined;
  }

  if (game.turnPhase === 'draw') {
    schedule(options.delays.draw, () => {
      const afterDraw = options.apply(player.id, { type: 'DRAW' });
      if (!afterDraw || afterDraw.phase !== GamePhase.PLAYING) {
        finish();
        return;
      }
      if (afterDraw.turnPhase !== 'discard') {
        finish();
        return;
      }

      const decision = getAIDecision(afterDraw, afterDraw.currentPlayerIndex);
      const isSpecial =
        decision.action.type === 'DECLARE_WIN' || decision.action.type === 'DECLARE_KONG';
      const delay = isSpecial
        ? (options.specialActionDelayMs ?? 500)
        : options.delays.discard;

      schedule(delay, () => {
        applyWithDiscardFallback(player.id, decision.action);
      });
    });
  } else if (game.turnPhase === 'discard') {
    schedule(options.delays.discard, () => {
      const live = options.getGame() ?? game;
      if (live.phase !== GamePhase.PLAYING || live.turnPhase !== 'discard') {
        finish();
        return;
      }
      if (live.currentPlayerIndex !== game.currentPlayerIndex) {
        finish();
        return;
      }
      const decision = getAIDecision(live, live.currentPlayerIndex);
      applyWithDiscardFallback(player.id, decision.action);
    });
  } else if (game.turnPhase === 'claim' && game.lastDiscardedBy !== player.id) {
    schedule(options.claimDelayMs ?? 150, () => {
      const live = options.getGame() ?? game;
      if (live.phase !== GamePhase.PLAYING || live.turnPhase !== 'claim') {
        finish();
        return;
      }
      const claims = getLegalClaims(live, seatIndex);
      if (claims.length > 0) {
        const decision = getAIClaimDecision(live, seatIndex, claims);
        const applied = options.apply(player.id, decision.action);
        if (!applied) options.apply(player.id, { type: 'PASS' });
      } else {
        options.apply(player.id, { type: 'PASS' });
      }
      finish();
    });
  } else {
    finish();
  }

  return () => {
    cancelled = true;
    for (const t of timers) clearTimeout(t);
    finish();
  };
}
