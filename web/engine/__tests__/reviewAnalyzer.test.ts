import { describe, it, expect } from 'vitest';
import { analyzeHandPerformance, type ReviewInsight } from '../reviewAnalyzer';
import { GameState, GamePhase, PlayerAction } from '@/models/GameState';
import { Tile, TileSuit, TileType, WindTile } from '@/models/Tile';

function makeTile(id: string, overrides: Partial<Tile> = {}): Tile {
  return {
    id,
    suit: TileSuit.DOT,
    type: TileType.SUIT,
    number: 1,
    nameEnglish: '1 Dot',
    nameChinese: '一筒',
    nameJapanese: '一筒',
    assetPath: '',
    ...overrides,
  };
}

function makeBaseGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    variant: 'hong-kong',
    phase: GamePhase.FINISHED,
    turnPhase: 'endOfTurn',
    players: [
      {
        id: 'human',
        name: 'Human',
        isAI: false,
        hand: [],
        melds: [],
        score: 0,
        seatWind: WindTile.EAST,
        isDealer: true,
        flowers: [],
      },
      {
        id: 'ai-1',
        name: 'AI 1',
        isAI: true,
        hand: [],
        melds: [],
        score: 0,
        seatWind: WindTile.SOUTH,
        isDealer: false,
        flowers: [],
      },
      {
        id: 'ai-2',
        name: 'AI 2',
        isAI: true,
        hand: [],
        melds: [],
        score: 0,
        seatWind: WindTile.WEST,
        isDealer: false,
        flowers: [],
      },
      {
        id: 'ai-3',
        name: 'AI 3',
        isAI: true,
        hand: [],
        melds: [],
        score: 0,
        seatWind: WindTile.NORTH,
        isDealer: false,
        flowers: [],
      },
    ],
    currentPlayerIndex: 0,
    wall: [],
    deadWall: [],
    discardPile: [],
    playerDiscards: { human: [], 'ai-1': [], 'ai-2': [], 'ai-3': [] },
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 0,
    ...overrides,
  };
}

describe('analyzeHandPerformance', () => {
  it('returns win insight when player won', () => {
    const state = makeBaseGameState({
      winnerId: 'human',
      isSelfDrawn: true,
    });
    const insights = analyzeHandPerformance(state, 0);
    const winInsight = insights.find(i => i.message.includes('won'));
    expect(winInsight).toBeDefined();
    expect(winInsight!.type).toBe('good');
    expect(winInsight!.message).toContain('self-drawn win');
  });

  it('returns meld count insight when player has exposed melds', () => {
    const state = makeBaseGameState();
    state.players[0].melds = [
      { tiles: [makeTile('t1'), makeTile('t2'), makeTile('t3')], type: 'pung', isConcealed: false },
      { tiles: [makeTile('t4'), makeTile('t5'), makeTile('t6')], type: 'chow', isConcealed: false },
    ];
    const insights = analyzeHandPerformance(state, 0);
    const meldInsight = insights.find(i => i.message.includes('claimed 2 melds'));
    expect(meldInsight).toBeDefined();
    expect(meldInsight!.type).toBe('good');
  });

  it('returns dangerous discard insight when players discard was winning tile', () => {
    const winTile = makeTile('winning-tile', { nameEnglish: '9 Bamboo' });
    const state = makeBaseGameState({
      winnerId: 'ai-1',
      isSelfDrawn: false,
      winningTile: winTile,
      lastDiscardedBy: 'human',
    });
    const insights = analyzeHandPerformance(state, 0);
    const dangerInsight = insights.find(i => i.message.includes('9 Bamboo'));
    expect(dangerInsight).toBeDefined();
    expect(dangerInsight!.type).toBe('mistake');
    expect(dangerInsight!.message).toContain('dangerous tiles');
  });

  it('returns draw insight when no winner', () => {
    const state = makeBaseGameState({ winnerId: undefined });
    const insights = analyzeHandPerformance(state, 0);
    const drawInsight = insights.find(i => i.message.includes('Draw game'));
    expect(drawInsight).toBeDefined();
    expect(drawInsight!.type).toBe('info');
  });

  it('limits to 5 insights max', () => {
    // Create a state that would generate many insights
    const winTile = makeTile('wt', { nameEnglish: '5 Dot', type: TileType.HONOR });
    const state = makeBaseGameState({
      winnerId: 'human',
      isSelfDrawn: false,
    });
    state.players[0].melds = [
      { tiles: [makeTile('a'), makeTile('b'), makeTile('c')], type: 'pung', isConcealed: false },
    ];
    // Add many honor discards early
    const honorTile = makeTile('h1', { type: TileType.HONOR, suit: TileSuit.WIND });
    state.playerDiscards['human'] = [honorTile, honorTile, honorTile, honorTile, honorTile];

    const insights = analyzeHandPerformance(state, 0);
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});
