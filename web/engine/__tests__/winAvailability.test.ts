/**
 * Regression tests for self-drawn win *availability* — guarding against the
 * "dead Mahjong button" bug where the UI offered a win the engine then silently
 * rejected.
 *
 * The controller's `canDeclareWin` delegates to `canDeclareSelfDrawnWin`, and
 * the engine accepts a win iff `applyAction(DECLARE_WIN)` returns non-null. If
 * those two predicates ever disagree, the button either lies (shows but
 * no-ops) or hides a legal win. The parity test below pins them together.
 */
import { describe, it, expect } from 'vitest';
import {
  applyAction,
  canDeclareSelfDrawnWin,
  scoreSelfDrawnHand,
} from '../turnManager';
import { GamePhase, GameState, Player } from '@/models/GameState';
import { dot, bam, char, makePlayer } from './testHelpers';
import { WindTile } from '@/models/Tile';

const HUMAN_ID = 'H';

/**
 * A discard-phase state where the human (index 0) has just self-drawn the tile
 * completing a fully concealed, mixed-suit, four-chows hand. With no flowers
 * this scores All Chows (1) + Concealed (1) + Self-Drawn (1) + No Flowers (1) =
 * 4 faan. `minFaan` is parameterised so we can straddle that 4-faan total.
 */
function buildSelfDrawState(minFaan: number | undefined): GameState {
  const winTile = dot(6, 1);
  const humanHand = [
    dot(1, 1), dot(2, 1), dot(3, 1),     // chow
    dot(4, 1), dot(5, 1), winTile,       // chow (winTile = dot 6, the self-draw)
    bam(1, 1), bam(2, 1), bam(3, 1),     // chow
    char(1, 1), char(2, 1), char(3, 1),  // chow
    char(9, 1), char(9, 2),              // pair
  ];

  const filler = (copy: number) => [
    char(1, copy), char(2, copy), char(3, copy), char(4, copy), char(5, copy),
    char(6, copy), char(8, copy), bam(7, copy), bam(8, copy), dot(7, copy),
    dot(8, copy), dot(9, copy), bam(9, copy),
  ];

  const players: Player[] = [
    makePlayer({ id: HUMAN_ID, name: 'Human', isAI: false, seatWind: WindTile.EAST, hand: humanHand }),
    makePlayer({ id: 'ai_1', name: 'AI 1', isAI: true, seatWind: WindTile.SOUTH, hand: filler(5) }),
    makePlayer({ id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.WEST, hand: filler(6) }),
    makePlayer({ id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.NORTH, hand: filler(7) }),
  ];

  return {
    id: 'self-draw-win-test',
    variant: 'HK',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard',
    currentPlayerIndex: 0,
    players,
    wall: Array.from({ length: 20 }, (_, i) => bam(1, 500 + i)),
    deadWall: Array.from({ length: 14 }, (_, i) => char(1, 500 + i)),
    discardPile: [],
    playerDiscards: { [HUMAN_ID]: [], ai_1: [], ai_2: [], ai_3: [] },
    lastDrawnTile: winTile,
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 20,
    minFaan,
  };
}

describe('self-drawn win availability', () => {
  it('scores the completed hand at 4 faan (All Chows + Concealed + Self-Drawn + No Flowers)', () => {
    const result = scoreSelfDrawnHand(buildSelfDrawState(3), 0);
    expect(result?.totalFan).toBe(4);
  });

  it('offers the win when the hand clears the table minimum', () => {
    expect(canDeclareSelfDrawnWin(buildSelfDrawState(3), 0)).toBe(true);
    expect(canDeclareSelfDrawnWin(buildSelfDrawState(0), 0)).toBe(true);
  });

  it('withholds the win when the hand is below the table minimum', () => {
    // 4-faan hand on a 5-faan floor — complete shape, but illegal to declare.
    expect(canDeclareSelfDrawnWin(buildSelfDrawState(5), 0)).toBe(false);
  });

  it('still scores a below-minimum hand so the UI can explain the shortfall', () => {
    const result = scoreSelfDrawnHand(buildSelfDrawState(5), 0);
    expect(result?.totalFan).toBe(4);
  });

  it('returns no score when it is not the player’s discard turn', () => {
    const drawing = { ...buildSelfDrawState(3), turnPhase: 'draw' as const };
    expect(scoreSelfDrawnHand(drawing, 0)).toBeNull();
    expect(canDeclareSelfDrawnWin(drawing, 0)).toBe(false);
  });

  // The contract that prevents the dead-button regression: the availability
  // gate the UI button uses must agree with whether the engine actually
  // accepts the win, for the exact same state.
  it('availability gate matches engine acceptance across faan floors', () => {
    for (const minFaan of [0, 1, 3, 5]) {
      const state = buildSelfDrawState(minFaan);
      const offered = canDeclareSelfDrawnWin(state, 0);
      const accepted = applyAction(state, HUMAN_ID, { type: 'DECLARE_WIN' }) !== null;
      expect(offered).toBe(accepted);
    }
  });
});
