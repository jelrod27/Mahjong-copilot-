/**
 * Game-state fixtures for the scene projection tests.
 *
 * Two kinds. `midHandGame` is hand-written so the goldens stay readable and a
 * change in the shuffle can never move them. `dealtGame` runs the real engine
 * on a fixed seed, so the property tests see the tile distributions a real
 * hand actually produces — including the flowers revealed during the deal.
 */

import { GamePhase, PlayerAction } from '@/models/GameState';
import type { GameState, MeldInfo, Player } from '@/models/GameState';
import { DragonTile, WindTile } from '@/models/Tile';
import type { Tile } from '@/models/Tile';
import { initializeGame } from '@/engine/turnManager';
import type { GameOptions } from '@/engine/turnManager';
import {
  bam,
  char,
  dot,
  dragonTile,
  flowerTile,
  makePlayer,
  windTile,
} from '@/engine/__tests__/testHelpers';

export const VIEWER_ID = 'human-1';

const SEAT_WINDS = [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH];

function player(index: number, overrides: Partial<Player> & { hand: Tile[] }): Player {
  return makePlayer({
    id: index === 0 ? VIEWER_ID : `ai-${index}`,
    name: index === 0 ? 'You' : `Opponent ${index}`,
    isAI: index !== 0,
    seatWind: SEAT_WINDS[index],
    isDealer: index === 0,
    ...overrides,
  });
}

const chow: MeldInfo = {
  tiles: [bam(4, 1), bam(5, 1), bam(6, 1)],
  type: 'chow',
  isConcealed: false,
};

const pung: MeldInfo = {
  tiles: [dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2), dragonTile(DragonTile.RED, 3)],
  type: 'pung',
  isConcealed: false,
};

const concealedKong: MeldInfo = {
  tiles: [char(7, 1), char(7, 2), char(7, 3), char(7, 4)],
  type: 'kong',
  isConcealed: true,
};

/**
 * A hand in progress: every slot kind occupied, uneven discard counts, one
 * exposed meld each for two seats, a concealed kong, and flowers on two seats.
 */
export function midHandGame(overrides: Partial<GameState> = {}): GameState {
  const players: Player[] = [
    player(0, {
      hand: [dot(1, 1), dot(2, 1), dot(3, 1), bam(9, 1), char(2, 1)],
      melds: [chow],
      flowers: [flowerTile('Plum', 1)],
    }),
    player(1, {
      hand: [dot(5, 2), dot(5, 3), bam(1, 2), char(4, 2), char(5, 2), dot(8, 3)],
      melds: [pung],
    }),
    player(2, {
      hand: [bam(2, 3), bam(3, 3), dot(6, 3), dot(7, 3)],
      melds: [concealedKong],
      flowers: [flowerTile('Orchid', 2), flowerTile('Chrysanthemum', 3)],
    }),
    player(3, {
      hand: [char(1, 3), char(9, 3), dot(4, 4), bam(7, 4), windTile(WindTile.WEST, 3), dot(2, 4), bam(8, 4), char(3, 4)],
    }),
  ];

  return {
    id: 'scene-fixture-mid-hand',
    variant: 'hong-kong',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard',
    players,
    currentPlayerIndex: 0,
    wall: wallOf(40),
    deadWall: wallOf(14, 'dead'),
    discardPile: [],
    playerDiscards: {
      [VIEWER_ID]: [windTile(WindTile.NORTH, 1), dot(9, 1), bam(1, 1)],
      'ai-1': discardRun(9),
      'ai-2': [],
      'ai-3': [char(8, 1)],
    },
    lastDiscardedTile: char(8, 1),
    lastDiscardedBy: 'ai-3',
    lastAction: PlayerAction.DISCARD,
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    turnHistory: [],
    turnTimeLimit: 20,
    ...overrides,
  };
}

/** Enough discards to push a pool onto its second row. */
function discardRun(count: number): Tile[] {
  return Array.from({ length: count }, (_, i) =>
    i < 4 ? dot(i + 1, 2) : bam(i - 3, 2),
  );
}

/**
 * Filler for the wall. The projection never reads these tiles' identities —
 * asserting that is part of the point — so any distinct tiles will do.
 */
function wallOf(count: number, prefix = 'live'): Tile[] {
  return Array.from({ length: count }, (_, i) => ({
    ...char((i % 9) + 1, 1),
    id: `${prefix}-wall-${i}`,
  }));
}

const DEAL_OPTIONS: GameOptions = {
  playerNames: ['You', 'Opponent 1', 'Opponent 2', 'Opponent 3'],
  aiPlayers: [
    { index: 1, difficulty: 'easy' },
    { index: 2, difficulty: 'easy' },
    { index: 3, difficulty: 'easy' },
  ],
  humanPlayerId: VIEWER_ID,
};

/** A real deal from the real engine, on a fixed seed. */
export function dealtGame(): GameState {
  return initializeGame({ ...DEAL_OPTIONS, seed: 'scene-projection-fixture' });
}

/** A finished hand, so the projection is exercised past `playing`. */
export function finishedGame(): GameState {
  const base = midHandGame();
  return {
    ...base,
    phase: GamePhase.FINISHED,
    turnPhase: 'endOfTurn',
    winnerId: VIEWER_ID,
    winningTile: base.playerDiscards['ai-3'][0],
    isSelfDrawn: false,
    winMethod: 'discard',
    finishedAt: new Date('2026-01-01T00:10:00.000Z'),
  };
}

/** A claim window: the last discard is open to every other seat. */
export function claimWindowGame(): GameState {
  return midHandGame({
    turnPhase: 'claim',
    currentPlayerIndex: 3,
    claimablePlayers: [VIEWER_ID, 'ai-1'],
  });
}

/** A hand in progress with both walls exhausted, for the wall's lower bound. */
export function emptyWallGame(): GameState {
  return midHandGame({ wall: [], deadWall: [] });
}
