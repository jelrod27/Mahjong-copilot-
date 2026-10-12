import { describe, expect, it } from 'vitest';
import { GamePhase, GameState, MeldInfo, Player } from '@/models/GameState';
import { DragonTile, Tile, WindTile } from '@/models/Tile';
import { applyAction } from '../turnManager';
import { bam, char, dot, dragonTile, makePlayer, windTile } from './testHelpers';

const kongMeld = (tiles: Tile[]): MeldInfo => ({ tiles, type: 'kong', isConcealed: false });
const fourOf = (makeTile: (copy: number) => Tile) => [1, 2, 3, 4].map(makeTile);

const ordinaryHand = [
  dot(1, 1), dot(3, 1), dot(5, 1), dot(7, 1),
  bam(2, 1), bam(4, 1), bam(6, 1), bam(8, 1),
  char(1, 1), char(3, 1), char(5, 1), char(7, 1), char(9, 1),
];

const robbingHand = [
  dot(1, 1), dot(1, 2), dot(1, 3),
  bam(1, 1), bam(1, 2), bam(1, 3),
  char(1, 1), char(1, 2), char(1, 3),
  windTile(WindTile.NORTH, 1), windTile(WindTile.NORTH, 2),
  dot(4, 1), dot(6, 1),
];

function makeState(options: {
  declarerHand: Tile[];
  declarerMelds?: MeldInfo[];
  samePlayerOwnsPriorKongs?: boolean;
  turnPhase?: GameState['turnPhase'];
  discardTile?: Tile;
  robbingKong?: boolean;
}): GameState {
  const priorKongs = [
    kongMeld(fourOf(copy => bam(9, copy))),
    kongMeld(fourOf(copy => char(9, copy))),
    kongMeld(fourOf(copy => dragonTile(DragonTile.RED, copy))),
  ];
  const players: Player[] = [
    makePlayer({
      id: 'human', name: 'Human', seatWind: WindTile.EAST, score: 100,
      hand: ordinaryHand,
      melds: options.samePlayerOwnsPriorKongs ? [] : [priorKongs[0]],
    }),
    makePlayer({
      id: 'declarer', name: 'Declarer', isAI: true, seatWind: WindTile.SOUTH, score: 200,
      hand: options.declarerHand,
      melds: options.declarerMelds ?? (options.samePlayerOwnsPriorKongs ? priorKongs : []),
    }),
    makePlayer({
      id: 'ai_2', name: 'AI 2', isAI: true, seatWind: WindTile.WEST, score: 300,
      hand: options.robbingKong ? robbingHand : ordinaryHand.map((tile, i) => ({ ...tile, id: `ordinary-2-${i}` })),
      melds: options.samePlayerOwnsPriorKongs || options.robbingKong ? [] : [priorKongs[1], priorKongs[2]],
    }),
    makePlayer({
      id: 'ai_3', name: 'AI 3', isAI: true, seatWind: WindTile.NORTH, score: 400,
      hand: ordinaryHand.map((tile, i) => ({ ...tile, id: `ordinary-3-${i}` })),
      melds: options.robbingKong && !options.samePlayerOwnsPriorKongs ? [priorKongs[1], priorKongs[2]] : [],
    }),
  ];

  const discardTile = options.discardTile;
  const isClaim = options.turnPhase === 'claim';
  return {
    id: 'four-kong-test',
    variant: 'Hong Kong Mahjong',
    phase: GamePhase.PLAYING,
    turnPhase: options.turnPhase ?? 'discard',
    currentPlayerIndex: 1,
    players,
    wall: [bam(8, 4)],
    deadWall: [char(8, 4)],
    discardPile: discardTile ? [discardTile] : [],
    playerDiscards: { human: discardTile ? [discardTile] : [], declarer: [], ai_2: [], ai_3: [] },
    lastDiscardedTile: discardTile,
    lastDiscardedBy: discardTile ? 'human' : undefined,
    pendingClaims: [],
    claimablePlayers: isClaim ? ['declarer', 'ai_2', 'ai_3'] : [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    turnHistory: [],
    turnTimeLimit: 20,
    totalKongsDeclared: 0,
    minFaan: options.robbingKong ? 0 : undefined,
  };
}

function passOtherClaimants(state: GameState): GameState {
  let current = state;
  while (current.turnPhase === 'claim') {
    const claimant = current.players.find(player =>
      player.id !== 'declarer' &&
      current.claimablePlayers.includes(player.id) &&
      !current.passedPlayers.includes(player.id) &&
      !current.pendingClaims.some(claim => claim.playerId === player.id)
    );
    if (!claimant) break;
    const next = applyAction(current, claimant.id, { type: 'PASS' });
    if (!next) throw new Error(`Expected ${claimant.id} to pass the claim window`);
    current = next;
  }
  return current;
}

describe('four-kong abortive draw', () => {
  it('aborts after a fourth kong when at least two players declared kongs', () => {
    const state = makeState({ declarerHand: fourOf(copy => dot(5, copy)) });
    const scoreBefore = state.players.map(player => player.score);
    const wallBefore = state.wall.length;
    const deadWallBefore = state.deadWall.length;

    const result = applyAction(state, 'declarer', { type: 'DECLARE_KONG', tile: dot(5, 1) });

    expect(result?.phase).toBe(GamePhase.FINISHED);
    expect(result?.winnerId).toBeUndefined();
    expect(result?.drawResult).toEqual({ reason: 'fourKongs', scoreChanges: [0, 0, 0, 0] });
    expect(result?.players.map(player => player.score)).toEqual(scoreBefore);
    expect(result?.players[1].melds.at(-1)?.type).toBe('kong');
    expect(result?.wall).toHaveLength(wallBefore);
    expect(result?.deadWall).toHaveLength(deadWallBefore);
  });

  it('continues when the same player declares all four kongs', () => {
    const state = makeState({
      declarerHand: fourOf(copy => dot(5, copy)),
      samePlayerOwnsPriorKongs: true,
    });

    const result = applyAction(state, 'declarer', { type: 'DECLARE_KONG', tile: dot(5, 1) });

    expect(result?.phase).toBe(GamePhase.PLAYING);
    expect(result?.turnPhase).toBe('discard');
    expect(result?.players[1].melds.filter(meld => meld.type === 'kong')).toHaveLength(4);
    expect(result?.drawResult).toBeUndefined();
    expect(result?.deadWall).toHaveLength(state.deadWall.length - 1);
  });

  it('aborts when an added kong successfully completes a fourth kong', () => {
    const pung: MeldInfo = {
      tiles: [dot(5, 1), dot(5, 2), dot(5, 3)],
      type: 'pung',
      isConcealed: false,
    };
    const state = makeState({ declarerHand: [dot(5, 4)], declarerMelds: [pung] });
    const wallBefore = state.wall.length;

    const result = applyAction(state, 'declarer', { type: 'DECLARE_KONG', tile: dot(5, 4) });

    expect(result?.phase).toBe(GamePhase.FINISHED);
    expect(result?.drawResult?.reason).toBe('fourKongs');
    expect(result?.wall).toHaveLength(wallBefore);
  });

  it('aborts after a deferred added kong completes the fourth kong and all robbers pass', () => {
    const pung: MeldInfo = {
      tiles: [dot(5, 1), dot(5, 2), dot(5, 3)],
      type: 'pung',
      isConcealed: false,
    };
    const state = makeState({ declarerHand: [dot(5, 4)], declarerMelds: [pung], robbingKong: true });
    const afterDeclaration = applyAction(state, 'declarer', { type: 'DECLARE_KONG', tile: dot(5, 4) });
    expect(afterDeclaration?.isRobKongOpportunity).toBe(true);
    expect(afterDeclaration?.claimablePlayers).toEqual(['ai_2']);

    const afterPass = applyAction(afterDeclaration!, 'ai_2', { type: 'PASS' });

    expect(afterPass?.phase).toBe(GamePhase.FINISHED);
    expect(afterPass?.drawResult?.reason).toBe('fourKongs');
    expect(afterPass?.players[1].melds[0].type).toBe('kong');
    expect(afterPass?.wall).toHaveLength(state.wall.length);
    expect(afterPass?.deadWall).toHaveLength(state.deadWall.length);
  });

  it('does not count an added kong that is robbed', () => {
    const pung: MeldInfo = {
      tiles: [dot(5, 1), dot(5, 2), dot(5, 3)],
      type: 'pung',
      isConcealed: false,
    };
    const state = makeState({ declarerHand: [dot(5, 4)], declarerMelds: [pung], robbingKong: true });
    const afterDeclaration = applyAction(state, 'declarer', { type: 'DECLARE_KONG', tile: dot(5, 4) });

    const result = applyAction(afterDeclaration!, 'ai_2', { type: 'CLAIM', claimType: 'win', tilesFromHand: [] });

    expect(result?.phase).toBe(GamePhase.FINISHED);
    expect(result?.winnerId).toBe('ai_2');
    expect(result?.winMethod).toBe('robKong');
    expect(result?.drawResult).toBeUndefined();
    expect(result?.players[1].melds[0].type).toBe('pung');
  });

  it('aborts when a discard-claimed kong completes the fourth kong', () => {
    const discardTile = dot(5, 4);
    const state = makeState({
      declarerHand: [dot(5, 1), dot(5, 2), dot(5, 3)],
      turnPhase: 'claim',
      discardTile,
    });

    const afterClaim = applyAction(state, 'declarer', {
      type: 'CLAIM',
      claimType: 'kong',
      tilesFromHand: [dot(5, 1), dot(5, 2), dot(5, 3)],
    });
    expect(afterClaim?.turnPhase).toBe('claim');

    const result = passOtherClaimants(afterClaim!);

    expect(result.phase).toBe(GamePhase.FINISHED);
    expect(result.drawResult?.reason).toBe('fourKongs');
    expect(result.wall).toHaveLength(state.wall.length);
    expect(result.players[1].melds.at(-1)?.type).toBe('kong');
  });
});
