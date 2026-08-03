/**
 * Save-format migration: a match saved by an older build must survive the
 * upgrade to the current save version.
 *
 * The version-1 payload below is written as a literal on purpose — round-tripping
 * it through the current writer would only prove the writer agrees with itself.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadGame, saveGame, canResume } from '../matchStorage';
import { SAVE_VERSION } from '../savedGameValidator';
import { initializeMatch } from '@/engine/matchManager';

const KEY = 'mahjong_match_in_progress';

/** A tile exactly as the version-1 writer serialised it. */
function tile(id: string, suit: string, number: number, nameEnglish: string) {
  return {
    id,
    suit,
    type: 'suit',
    number,
    nameEnglish,
    nameChinese: nameEnglish,
    nameJapanese: nameEnglish,
    assetPath: `assets/tiles/${suit}_${number}.svg`,
  };
}

function v1Player(id: string, name: string, isAI: boolean, hand: Record<string, unknown>[]) {
  return {
    id,
    name,
    isAI,
    hand,
    melds: [],
    score: 500,
    seatWind: 'east',
    isDealer: false,
    flowers: [],
  };
}

/** A mid-hand match as stored by the build that shipped save version 1. */
function v1Payload(): Record<string, unknown> {
  return {
    match: {
      mode: 'quick',
      difficulty: 'medium',
      currentRound: 'east',
      handNumber: 3,
      totalHandsPlayed: 2,
      initialDealerIndex: 0,
      currentDealerIndex: 2,
      initialDealerHasRotated: true,
      playerScores: [620, 480, 480, 420],
      startingScore: 500,
      handResults: [],
      currentHand: null,
      phase: 'playing',
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      humanPlayerId: 'player-0',
    },
    game: {
      id: 'hand-from-v1',
      variant: 'hongkong',
      phase: 'playing',
      turnPhase: 'discard',
      players: [
        v1Player('player-0', 'You', false, [
          tile('bamboo_1_1', 'bamboo', 1, 'One Bamboo'),
          tile('dot_5_1', 'dot', 5, 'Five Dot'),
        ]),
        v1Player('player-1', 'West AI', true, [tile('character_9_1', 'character', 9, 'Nine Character')]),
        v1Player('player-2', 'North AI', true, []),
        v1Player('player-3', 'East AI', true, []),
      ],
      currentPlayerIndex: 0,
      wall: [tile('bamboo_2_1', 'bamboo', 2, 'Two Bamboo')],
      deadWall: [],
      discardPile: [tile('dot_9_1', 'dot', 9, 'Nine Dot')],
      playerDiscards: { 'player-0': [tile('dot_9_1', 'dot', 9, 'Nine Dot')] },
      pendingClaims: [],
      claimablePlayers: [],
      passedPlayers: [],
      prevailingWind: 'east',
      finalScores: {},
      totalKongsDeclared: 0,
      createdAt: '2026-01-15T10:30:00.000Z',
      turnHistory: [],
      turnTimeLimit: 20,
    },
    savedAt: '2026-01-15T10:42:00.000Z',
    version: 1,
  };
}

describe('save-format migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads a version-1 save intact instead of deleting it', () => {
    localStorage.setItem(KEY, JSON.stringify(v1Payload()));

    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    // The save is kept, not cleared.
    expect(localStorage.getItem(KEY)).not.toBeNull();

    const match = loaded!.match!;
    expect(match.handNumber).toBe(3);
    expect(match.playerScores).toEqual([620, 480, 480, 420]);
    expect(match.playerNames).toEqual(['You', 'West AI', 'North AI', 'East AI']);
    expect(match.mode).toBe('quick');
    expect(match.difficulty).toBe('medium');
    expect(match.currentDealerIndex).toBe(2);
    expect(match.phase).toBe('playing');

    const game = loaded!.game!;
    expect(game.id).toBe('hand-from-v1');
    expect(game.turnPhase).toBe('discard');
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.players.map(p => p.id)).toEqual(['player-0', 'player-1', 'player-2', 'player-3']);
    expect(game.players[0].hand.map(t => t.id)).toEqual(['bamboo_1_1', 'dot_5_1']);
    expect(game.players[1].hand.map(t => t.id)).toEqual(['character_9_1']);
    expect(game.wall.map(t => t.id)).toEqual(['bamboo_2_1']);
    expect(game.discardPile.map(t => t.id)).toEqual(['dot_9_1']);
    expect(game.playerDiscards['player-0'].map(t => t.id)).toEqual(['dot_9_1']);
    expect(game.createdAt).toBeInstanceOf(Date);
    expect(game.createdAt.toISOString()).toBe('2026-01-15T10:30:00.000Z');

    expect(loaded!.savedAt).toBe('2026-01-15T10:42:00.000Z');
  });

  it('still rejects a malformed payload carrying the older version', () => {
    const payload = v1Payload();
    const game = payload['game'] as Record<string, unknown>;
    game['players'] = (game['players'] as unknown[]).slice(0, 3);
    localStorage.setItem(KEY, JSON.stringify(payload));

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('presentation log', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /** A current-version payload carrying whatever the test wants under presentationLog. */
  function payloadWithLog(presentationLog: unknown): Record<string, unknown> {
    return { ...v1Payload(), version: SAVE_VERSION, presentationLog };
  }

  it('surfaces a well-formed log, versioned independently of the save', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify(payloadWithLog({ version: 1, events: [{ kind: 'discard', seq: 4 }] }))
    );

    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_VERSION);
    expect(loaded!.presentationLog).toEqual({ version: 1, events: [{ kind: 'discard', seq: 4 }] });
    // The log's version is its own — it does not track the save version.
    expect(loaded!.presentationLog!.version).not.toBe(loaded!.version);
  });

  it.each([
    ['absent', undefined],
    ['null', null],
    ['a string', 'not-a-log'],
    ['an array', [{ kind: 'discard' }]],
    ['missing its version', { events: [] }],
    ['versioned with a string', { version: '1', events: [] }],
    ['versioned with zero', { version: 0, events: [] }],
    ['missing its events', { version: 1 }],
    ['events that are not an array', { version: 1, events: { 0: 'discard' } }],
  ])('discards a log that is %s and restores the match anyway', (_label, log) => {
    localStorage.setItem(KEY, JSON.stringify(payloadWithLog(log)));

    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.presentationLog).toBeUndefined();
    // The match is authoritative and survives; a corrupt log never costs a game.
    expect(loaded!.match!.handNumber).toBe(3);
    expect(loaded!.game!.id).toBe('hand-from-v1');
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('restores a match identically whether or not the log is present', () => {
    // The legacy board reads only match and game, so the extra key changes nothing for it.
    localStorage.setItem(KEY, JSON.stringify(payloadWithLog({ version: 1, events: [{ kind: 'deal', seq: 0 }] })));
    const withLog = loadGame();

    localStorage.setItem(KEY, JSON.stringify({ ...v1Payload(), version: SAVE_VERSION }));
    const withoutLog = loadGame();

    expect(withLog!.match).toEqual(withoutLog!.match);
    expect(withLog!.game).toEqual(withoutLog!.game);
    expect(canResume()).toBe(true);
  });
});

describe('the written save', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function writeRealMatch(): Record<string, unknown> {
    const match = initializeMatch({
      mode: 'quick',
      difficulty: 'easy',
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      humanPlayerId: 'player-0',
      seed: 'migration-test',
    });
    saveGame(match, match.currentHand);
    return JSON.parse(localStorage.getItem(KEY)!);
  }

  /** Every object key in the payload, at any depth. */
  function allKeys(value: unknown, found: string[] = []): string[] {
    if (Array.isArray(value)) {
      for (const item of value) allKeys(item, found);
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        found.push(k);
        allKeys(v, found);
      }
    }
    return found;
  }

  /** Every string value in the payload, at any depth. */
  function allStringValues(value: unknown, found: string[] = []): string[] {
    if (typeof value === 'string') {
      found.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) allStringValues(item, found);
    } else if (value !== null && typeof value === 'object') {
      for (const v of Object.values(value)) allStringValues(v, found);
    }
    return found;
  }

  it('writes exactly one save format, at the current version', () => {
    const payload = writeRealMatch();

    expect(payload['version']).toBe(2);
    expect(payload['version']).toBe(SAVE_VERSION);
    expect(Object.keys(payload).sort()).toEqual(['game', 'match', 'savedAt', 'version']);
  });

  it('records no renderer choice anywhere', () => {
    const payload = writeRealMatch();

    const keys = allKeys(payload);
    const values = allStringValues(payload);
    // The walkers reach real content, so an empty result below means absence, not a broken scan.
    expect(keys).toContain('players');
    expect(values).toContain('player-0');

    expect(keys.filter(k => /render|webgl|three|canvas|scene|graphics/i.test(k))).toEqual([]);
    expect(
      values.filter(v => ['three', 'threejs', 'webgl', 'legacy', 'dom', '2d', '3d'].includes(v.toLowerCase()))
    ).toEqual([]);
  });
});
