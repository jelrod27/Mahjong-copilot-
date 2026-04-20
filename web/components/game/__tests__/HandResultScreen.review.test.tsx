import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HandResultScreen from '../HandResultScreen';
import { GameState, GamePhase, Player } from '@/models/GameState';
import { MatchState } from '@/models/MatchState';
import { ReviewInsight } from '@/engine/reviewAnalyzer';
import { Tile, TileSuit, TileType, WindTile } from '@/models/Tile';

// ─── Mocks ───────────────────────────────────────────────────────────────
// The review analyzer is a pure engine function; stubbing it keeps this test
// focused on the rendering behavior of the REVIEW section.
const mocks = vi.hoisted(() => ({
  insights: [] as ReviewInsight[],
}));

vi.mock('@/engine/reviewAnalyzer', async () => {
  const actual = await vi.importActual<typeof import('@/engine/reviewAnalyzer')>(
    '@/engine/reviewAnalyzer',
  );
  return {
    ...actual,
    analyzeHandPerformance: vi.fn(() => mocks.insights),
  };
});

// RetroTile renders a canvas-ish div with styling that doesn't matter here.
vi.mock('../RetroTile', () => ({
  default: ({ tile }: { tile: Tile }) => <div data-tile={tile.id} />,
}));
vi.mock('../ExposedMelds', () => ({
  default: () => null,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────
function makeTile(id: string): Tile {
  return {
    id,
    suit: TileSuit.DOT,
    type: TileType.SUIT,
    number: 5,
    nameEnglish: 'Five Dot',
    nameChinese: '五筒',
    nameJapanese: '五筒',
    assetPath: '',
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'human-player',
    name: 'You',
    isAI: false,
    hand: [makeTile('t1'), makeTile('t2')],
    melds: [],
    score: 0,
    seatWind: WindTile.EAST,
    isDealer: true,
    flowers: [],
    ...overrides,
  };
}

function makeGameState(winnerId: string | undefined = 'human-player'): GameState {
  const human = makePlayer({ id: 'human-player' });
  const opponent = makePlayer({ id: 'ai-1', name: 'Bot', isAI: true, isDealer: false });
  return {
    id: 'g1',
    variant: 'Hong Kong Mahjong',
    phase: GamePhase.FINISHED,
    turnPhase: 'endOfTurn',
    players: [human, opponent],
    currentPlayerIndex: 0,
    wall: [],
    deadWall: [],
    discardPile: [],
    playerDiscards: { 'human-player': [], 'ai-1': [] },
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    winnerId,
    isSelfDrawn: true,
    winningTile: winnerId ? makeTile('win') : undefined,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 20,
  };
}

function makeMatch(difficulty: 'easy' | 'medium' | 'hard' = 'hard'): MatchState {
  return {
    mode: 'quick',
    difficulty,
    currentRound: WindTile.EAST,
    handNumber: 2,
    totalHandsPlayed: 1,
    initialDealerIndex: 0,
    currentDealerIndex: 0,
    initialDealerHasRotated: false,
    playerScores: [100, 100, 100, 100],
    startingScore: 100,
    handResults: [
      {
        handNumber: 1,
        round: WindTile.EAST,
        dealerIndex: 0,
        winnerId: 'human-player',
        isSelfDrawn: true,
        scoringResult: null,
        scoreChanges: [24, -8, -8, -8],
      },
    ],
    currentHand: null,
    phase: 'betweenHands',
    playerNames: ['You', 'Bot 1', 'Bot 2', 'Bot 3'],
    humanPlayerId: 'human-player',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('HandResultScreen review section', () => {
  beforeEach(() => {
    mocks.insights = [];
  });

  it('renders insights with good/mistake/info glyphs on hard difficulty', () => {
    mocks.insights = [
      { type: 'good', message: 'You won this hand with a self-drawn win!' },
      { type: 'mistake', message: 'Your discard was claimed for the win.' },
      { type: 'info', message: 'You discarded honors early.' },
    ];

    render(
      <HandResultScreen
        gameState={makeGameState('human-player')}
        match={makeMatch('hard')}
        scoringResult={null}
        onContinue={() => {}}
      />,
    );

    // The REVIEW section must render regardless of difficulty now.
    const section = screen.getByTestId('hand-review');
    expect(section).toBeInTheDocument();
    expect(section.textContent).toContain('REVIEW');
    expect(section.textContent).toContain('You won this hand with a self-drawn win!');
    expect(section.textContent).toContain('Your discard was claimed for the win.');
    expect(section.textContent).toContain('You discarded honors early.');

    // Each insight type gets its own glyph element.
    const items = section.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].getAttribute('data-insight-type')).toBe('good');
    expect(items[1].getAttribute('data-insight-type')).toBe('mistake');
    expect(items[2].getAttribute('data-insight-type')).toBe('info');
    // Glyphs: check, x, bullet.
    expect(items[0].textContent).toContain('\u2713');
    expect(items[1].textContent).toContain('\u2717');
    expect(items[2].textContent).toContain('\u2022');
  });

  it('hides the review section when the analyzer returns no insights', () => {
    mocks.insights = [];

    render(
      <HandResultScreen
        gameState={makeGameState(undefined)}
        match={makeMatch('medium')}
        scoringResult={null}
        onContinue={() => {}}
      />,
    );

    expect(screen.queryByTestId('hand-review')).toBeNull();
  });

  it('caps the rendered list at 5 insights', () => {
    mocks.insights = Array.from({ length: 8 }, (_, i) => ({
      type: 'info' as const,
      message: `Insight #${i + 1}`,
    }));

    render(
      <HandResultScreen
        gameState={makeGameState('human-player')}
        match={makeMatch('easy')}
        scoringResult={null}
        onContinue={() => {}}
      />,
    );

    const items = screen.getByTestId('hand-review').querySelectorAll('li');
    expect(items.length).toBeLessThanOrEqual(5);
  });
});
