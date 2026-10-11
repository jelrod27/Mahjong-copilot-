import { describe, expect, it } from 'vitest';
import { GameState, MeldInfo } from '@/models/GameState';
import { DragonTile, Tile, WindTile, tileKey } from '@/models/Tile';
import { getAIClaimDecision, getAIDecision } from '../index';
import { applyAction, getLegalClaims, initializeGame } from '../../turnManager';
import {
  bam, char, dot, dragonTile, windTile,
} from '../../__tests__/testHelpers';

/**
 * These literal action signatures are deliberate behavior baselines, not claims
 * that the choices are strategically optimal. To refresh one, run
 * `npx vitest run engine/ai/__tests__/aiDecisionBaseline.test.ts`, inspect the
 * changed decision and its fixture, then edit the expected signature explicitly.
 * Do not bulk-update these values without reviewing each change.
 *
 * The opening-discard cases deal from a seed and play the dealer's first draw.
 * Targeted defensive, win, kong, and claim cases use explicit hands and decision
 * context on a seeded GameState. This keeps edge-case positions reproducible
 * without relying on long replays whose later states could cascade after an
 * earlier decision changes. Rows name the seed and decision point; fixtures use
 * the default AI personality and minFaan 0. Signatures omit tile copy IDs and
 * reasoning text so only the strategic action is pinned.
 */

type Difficulty = 'easy' | 'medium' | 'hard';

interface DiscardScenario {
  decisionPoint: string;
  seed: string;
  difficulty: Difficulty;
  hand?: Tile[];
  expected: string;
  lastDrawnTile?: Tile;
  opponentMelds?: MeldInfo[];
}

interface ClaimScenario {
  decisionPoint: string;
  seed: string;
  difficulty: Difficulty;
  hand: Tile[];
  discarded: Tile;
  expected: string;
}

function stateFor(
  seed: string,
  difficulty: Difficulty,
  hand: Tile[],
  opponentMelds: MeldInfo[] = [],
): GameState {
  const base = initializeGame({
    playerNames: ['AI 1', 'AI 2', 'AI 3', 'AI 4'],
    aiPlayers: [0, 1, 2, 3].map(index => ({ index, difficulty })),
    humanPlayerId: 'ai_0',
    seed,
    minFaan: 0,
  });
  const players = base.players.map((player, index) => index === 0
    ? { ...player, hand, isAI: true, aiDifficulty: difficulty, seatWind: WindTile.EAST }
    : index === 1 && opponentMelds.length > 0
      ? { ...player, melds: opponentMelds }
      : player);

  return {
    ...base,
    currentPlayerIndex: 0,
    turnPhase: 'discard',
    players,
  };
}

function firstDiscardState(seed: string, difficulty: Difficulty): GameState {
  const initial = initializeGame({
    playerNames: ['AI 1', 'AI 2', 'AI 3', 'AI 4'],
    aiPlayers: [0, 1, 2, 3].map(index => ({ index, difficulty })),
    humanPlayerId: 'ai_0',
    seed,
    minFaan: 0,
  });
  const state = applyAction(initial, 'ai_0', { type: 'DRAW' });
  if (!state) throw new Error(`Seeded dealer draw failed for ${seed}`);
  return state;
}

function claimState(scenario: ClaimScenario): GameState {
  return {
    ...stateFor(scenario.seed, scenario.difficulty, scenario.hand),
    turnPhase: 'claim',
    lastDiscardedTile: scenario.discarded,
    lastDiscardedBy: 'ai_1',
  };
}

function actionSignature(action: ReturnType<typeof getAIDecision>['action']): string {
  switch (action.type) {
    case 'DISCARD':
    case 'DECLARE_KONG':
      return `${action.type}:${tileKey(action.tile)}`;
    case 'CLAIM':
      if (action.claimType === 'win') return 'CLAIM:win';
      return `CLAIM:${action.claimType}:${action.tilesFromHand.map(tileKey).sort().join(',')}`;
    default:
      return action.type;
  }
}

const defensiveHand = [
  bam(1, 1), bam(2, 1), bam(3, 1),
  dot(4, 1), dot(5, 1), dot(6, 1),
  char(7, 1), char(8, 1),
  windTile(WindTile.NORTH, 1),
  dot(3, 1), dot(9, 1), bam(7, 1), char(5, 1),
];

const threateningMelds: MeldInfo[] = [
  { tiles: [dot(1, 1), dot(1, 2), dot(1, 3)], type: 'pung', isConcealed: false },
  { tiles: [dot(7, 1), dot(8, 1), dot(9, 1)], type: 'chow', isConcealed: false },
  {
    tiles: [dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3)],
    type: 'pung',
    isConcealed: false,
  },
];

const winningClaimHand = [
  dot(1, 1), dot(1, 2), dot(1, 3),
  dot(2, 1), dot(2, 2), dot(2, 3),
  dot(3, 1), dot(3, 2), dot(3, 3),
  dot(4, 1), dot(4, 2), dot(4, 3),
  dot(5, 1),
];

const dragonPungClaimHand = [
  bam(1, 1), bam(2, 1), bam(3, 1),
  dot(1, 1), dot(2, 1), dot(3, 1),
  char(1, 1), char(2, 1), char(3, 1),
  dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2),
  windTile(WindTile.NORTH, 1), windTile(WindTile.WEST, 1),
];

const kongHand = [
  dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4),
  bam(2, 1), bam(3, 1), bam(4, 1),
  char(5, 1), char(6, 1), char(7, 1),
  dot(9, 1), dot(9, 2),
  windTile(WindTile.NORTH, 1),
];

const nearTenpaiPungClaimHand = [
  bam(5, 1), bam(5, 2),
  windTile(WindTile.EAST, 1), char(5, 1), windTile(WindTile.EAST, 2),
  dot(4, 1), char(4, 1), bam(2, 1), windTile(WindTile.EAST, 3),
  bam(9, 1), dot(6, 1), bam(8, 1), char(6, 1),
];

const discardScenarios: DiscardScenario[] = [
  ...(['easy', 'medium', 'hard'] as const).flatMap(difficulty => [
    {
      decisionPoint: 'dealer first discard after seeded draw',
      seed: 'baseline-opening-a',
      difficulty,
      expected: difficulty === 'easy' ? 'DISCARD:wind_east' : 'DISCARD:bamboo_3',
    },
    {
      decisionPoint: 'dealer first discard after seeded draw',
      seed: 'baseline-opening-b',
      difficulty,
      expected: difficulty === 'easy' ? 'DISCARD:dragon_white' : 'DISCARD:bamboo_3',
    },
  ]),
  {
    decisionPoint: 'defensive discard with three exposed opponent melds',
    seed: 'decision-hard-defense',
    difficulty: 'hard',
    hand: defensiveHand,
    opponentMelds: threateningMelds,
    expected: 'DISCARD:bamboo_7',
  },
  ...(['easy', 'medium', 'hard'] as const).map(difficulty => ({
    decisionPoint: 'self-drawn win takes priority over discard',
    seed: `decision-${difficulty}-self-drawn-win`,
    difficulty,
    hand: [...winningClaimHand, dot(5, 2)],
    lastDrawnTile: dot(5, 2),
    expected: 'DECLARE_WIN',
  })),
  {
    decisionPoint: 'medium declares a concealed kong',
    seed: 'decision-medium-kong',
    difficulty: 'medium',
    hand: kongHand,
    expected: 'DECLARE_KONG:dot_1',
  },
];

const claimScenarios: ClaimScenario[] = [
  ...(['easy', 'medium', 'hard'] as const).map(difficulty => ({
    decisionPoint: 'claim a winning discard',
    seed: `decision-${difficulty}-win`,
    difficulty,
    hand: winningClaimHand,
    discarded: dot(5, 2),
    expected: 'CLAIM:win',
  })),
  {
    decisionPoint: 'easy claims a valuable dragon pung',
    seed: 'decision-easy-dragon-pung',
    difficulty: 'easy',
    hand: dragonPungClaimHand,
    discarded: dragonTile(DragonTile.RED, 3),
    expected: 'CLAIM:pung:dragon_red,dragon_red',
  },
  {
    decisionPoint: 'medium passes on a neutral pung at equal shanten',
    seed: 'decision-medium-pung',
    difficulty: 'medium',
    hand: nearTenpaiPungClaimHand,
    discarded: bam(5, 3),
    expected: 'PASS',
  },
  {
    decisionPoint: 'hard claims a neutral pung near tenpai',
    seed: 'decision-hard-pung',
    difficulty: 'hard',
    hand: nearTenpaiPungClaimHand,
    discarded: bam(5, 3),
    expected: 'CLAIM:pung:bamboo_5,bamboo_5',
  },
];

describe('AI decision characterization baseline', () => {
  it.each(discardScenarios)('$decisionPoint ($difficulty, seed: $seed)', scenario => {
    const state = scenario.hand
      ? stateFor(scenario.seed, scenario.difficulty, scenario.hand, scenario.opponentMelds)
      : firstDiscardState(scenario.seed, scenario.difficulty);
    state.lastDrawnTile = scenario.lastDrawnTile ?? state.lastDrawnTile;

    expect(actionSignature(getAIDecision(state, 0).action)).toBe(scenario.expected);
  });

  it.each(claimScenarios)('$decisionPoint ($difficulty, seed: $seed)', scenario => {
    const state = claimState(scenario);
    const claims = getLegalClaims(state, 0);

    expect(actionSignature(getAIClaimDecision(state, 0, claims).action)).toBe(scenario.expected);
  });
});
