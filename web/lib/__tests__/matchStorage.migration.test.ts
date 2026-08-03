/**
 * Save-format migration: a match saved by an older build must survive the
 * upgrade to the current save version.
 *
 * The version-1 payload below is written as a literal on purpose — round-tripping
 * it through the current writer would only prove the writer agrees with itself.
 * It mirrors what the version-1 writer actually stored: `JSON.stringify` of the
 * live match and hand, so the same hand appears at both `game` and
 * `match.currentHand`, and Dates arrive as ISO strings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadGame, saveGame, canResume } from '../matchStorage';
import { SAVE_VERSION, SUPPORTED_SAVE_VERSIONS, validateSavedGamePayload } from '../savedGameValidator';
import { initializeMatch } from '@/engine/matchManager';

const KEY = 'mahjong_match_in_progress';

/**
 * Every save version ever written, listed literally. Deriving this from
 * SUPPORTED_SAVE_VERSIONS would make these tests agree with whatever production
 * says, including a version silently dropped from it.
 */
const HISTORICAL_SAVE_VERSIONS = [1, 2];

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

/** The in-progress hand, as stored. */
function v1Game(): Record<string, unknown> {
  return {
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
      // The real writer stringifies the live match, so the hand is stored here too.
      currentHand: v1Game(),
      phase: 'playing',
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      humanPlayerId: 'player-0',
    },
    game: v1Game(),
    savedAt: '2026-01-15T10:42:00.000Z',
    version: 1,
  };
}

function storedPayload(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(KEY)!);
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

    // The nested hand deserialises too — the largest part of a real v1 blob.
    expect(match.currentHand).not.toBeNull();
    expect(match.currentHand!.id).toBe('hand-from-v1');
    expect(match.currentHand!.players[0].hand.map(t => t.id)).toEqual(['bamboo_1_1', 'dot_5_1']);
    expect(match.currentHand!.createdAt).toBeInstanceOf(Date);

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

  it('writes the migrated payload back, upgrading the stored record', () => {
    const original = v1Payload();
    localStorage.setItem(KEY, JSON.stringify(original));
    expect(storedPayload()['version']).toBe(1);

    loadGame();

    const stored = storedPayload();
    // The record on disk is no longer legacy...
    expect(stored['version']).toBe(2);
    expect(stored['version']).not.toBe(original['version']);
    // ...and nothing else about it moved.
    expect(stored['match']).toEqual(original['match']);
    expect(stored['game']).toEqual(original['game']);
    expect(stored['savedAt']).toBe(original['savedAt']);

    // A second load reads the upgraded record and still returns the same match.
    const reloaded = loadGame();
    expect(reloaded!.match!.handNumber).toBe(3);
    expect(reloaded!.game!.players[0].hand.map(t => t.id)).toEqual(['bamboo_1_1', 'dot_5_1']);
  });

  // These two pin the production constant against a hand-written history, so a
  // version dropped from SUPPORTED_SAVE_VERSIONS fails here instead of silently
  // deleting every save written at that version.
  it('supports every save version ever written', () => {
    expect([...SUPPORTED_SAVE_VERSIONS].sort()).toEqual(HISTORICAL_SAVE_VERSIONS);
  });

  it('supports the version it currently writes', () => {
    expect(SUPPORTED_SAVE_VERSIONS).toContain(SAVE_VERSION);
    expect(HISTORICAL_SAVE_VERSIONS).toContain(SAVE_VERSION);
  });

  it.each(HISTORICAL_SAVE_VERSIONS.filter(v => v !== SAVE_VERSION))(
    'migrates a version-%i save forward and upgrades it on disk',
    version => {
      localStorage.setItem(KEY, JSON.stringify({ ...v1Payload(), version }));

      const loaded = loadGame();

      expect(loaded).not.toBeNull();
      expect(loaded!.match!.handNumber).toBe(3);
      expect(storedPayload()['version']).toBe(SAVE_VERSION);
    }
  );

  // Nothing reads savedAt, so it may not be grounds for deleting a restorable match.
  it.each([undefined, null, 42])('restores a match whose savedAt is %p', savedAt => {
    localStorage.setItem(KEY, JSON.stringify({ ...v1Payload(), savedAt }));

    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.match!.handNumber).toBe(3);
    expect(typeof loaded!.savedAt).toBe('string');
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('does not rewrite storage when only asking whether a match can resume', () => {
    localStorage.setItem(KEY, JSON.stringify(v1Payload()));

    expect(canResume()).toBe(true);
    // canResume runs during first paint of /play — it must not pay for a write.
    expect(storedPayload()['version']).toBe(1);

    loadGame();
    expect(storedPayload()['version']).toBe(SAVE_VERSION);
  });

  it('still rejects a malformed payload carrying the older version, without rewriting it', () => {
    const payload = v1Payload();
    const game = payload['game'] as Record<string, unknown>;
    game['players'] = (game['players'] as unknown[]).slice(0, 3);
    localStorage.setItem(KEY, JSON.stringify(payload));

    expect(loadGame()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('validateSavedGamePayload', () => {
  it.each(HISTORICAL_SAVE_VERSIONS)('accepts a well-formed version-%i payload', version => {
    expect(validateSavedGamePayload({ ...v1Payload(), version })).toEqual({ ok: true });
  });

  it.each([999, 0, -1, '1', null, undefined])('rejects a payload versioned %p', version => {
    expect(validateSavedGamePayload({ ...v1Payload(), version })).toMatchObject({ ok: false });
  });

  it.each(HISTORICAL_SAVE_VERSIONS)('still rejects a malformed version-%i payload', version => {
    const payload = { ...v1Payload(), version };
    (payload['game'] as Record<string, unknown>)['currentPlayerIndex'] = 99;

    expect(validateSavedGamePayload(payload)).toMatchObject({ ok: false });
  });

  // matchStateFromJson calls handResults?.map(...) and dereferences each entry, so a
  // non-array — or a null inside the array — throws and takes the whole save down.
  it.each(['junk', 42, { 0: 'first' }])('rejects handResults of %p', handResults => {
    const payload = v1Payload();
    (payload['match'] as Record<string, unknown>)['handResults'] = handResults;

    expect(validateSavedGamePayload(payload)).toMatchObject({ ok: false });
  });

  it.each([[[null]], [['junk']], [[42]]])('rejects handResults containing %p', handResults => {
    const payload = v1Payload();
    (payload['match'] as Record<string, unknown>)['handResults'] = handResults;

    expect(validateSavedGamePayload(payload)).toMatchObject({ ok: false });
  });

  it('accepts a payload with no handResults at all', () => {
    const payload = v1Payload();
    delete (payload['match'] as Record<string, unknown>)['handResults'];

    expect(validateSavedGamePayload(payload)).toEqual({ ok: true });
  });

  // Both copies of the hand are deserialised by loadGame, so both are checked.
  it('rejects a corrupt match.currentHand even when the top-level game is valid', () => {
    const payload = v1Payload();
    const currentHand = (payload['match'] as Record<string, unknown>)['currentHand'] as Record<string, unknown>;
    currentHand['players'] = (currentHand['players'] as unknown[]).slice(0, 3);

    expect(validateSavedGamePayload(payload)).toMatchObject({ ok: false });
  });

  it('rejects a corrupt top-level game even when match.currentHand is valid', () => {
    const payload = v1Payload();
    (payload['game'] as Record<string, unknown>)['phase'] = 'hacked';

    expect(validateSavedGamePayload(payload)).toMatchObject({ ok: false });
  });

  it('rejects an over-long hand hidden in match.currentHand', () => {
    const payload = v1Payload();
    const currentHand = (payload['match'] as Record<string, unknown>)['currentHand'] as Record<string, unknown>;
    const players = currentHand['players'] as Record<string, unknown>[];
    players[0]['hand'] = Array.from({ length: 200 }, () => tile('bamboo_1_1', 'bamboo', 1, 'One Bamboo'));

    expect(validateSavedGamePayload(payload)).toMatchObject({ ok: false });
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
  ])('discards a log that is %s, without blocking restoration', (_label, log) => {
    localStorage.setItem(KEY, JSON.stringify(payloadWithLog(log)));

    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.presentationLog).toBeUndefined();
    // The match is authoritative and survives; a corrupt log never costs a game.
    expect(loaded!.match!.handNumber).toBe(3);
    expect(loaded!.game!.id).toBe('hand-from-v1');
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('discards a log too large to be one match, and still restores the match', () => {
    const events = Array.from({ length: 5001 }, (_, seq) => ({ kind: 'discard', seq }));
    localStorage.setItem(KEY, JSON.stringify(payloadWithLog({ version: 1, events })));

    const loaded = loadGame();

    expect(loaded).not.toBeNull();
    expect(loaded!.presentationLog).toBeUndefined();
    expect(loaded!.match!.handNumber).toBe(3);
  });

  // Each case seeds storage on its own, so both paths genuinely exercise both calls.
  it.each([
    ['carrying a log', { version: 1, events: [{ kind: 'deal', seq: 0 }] }],
    ['carrying no log', undefined],
  ])('resumes a save %s', (_label, log) => {
    const payload = log === undefined
      ? { ...v1Payload(), version: SAVE_VERSION }
      : payloadWithLog(log);
    localStorage.setItem(KEY, JSON.stringify(payload));

    expect(canResume()).toBe(true);

    const loaded = loadGame();
    expect(loaded!.match!.handNumber).toBe(3);
    expect(loaded!.match!.phase).toBe('playing');
    expect(loaded!.game!.id).toBe('hand-from-v1');
  });

  it('restores identical match and game whether or not the log is present', () => {
    localStorage.setItem(KEY, JSON.stringify(payloadWithLog({ version: 1, events: [{ kind: 'deal', seq: 0 }] })));
    const withLog = loadGame();

    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify({ ...v1Payload(), version: SAVE_VERSION }));
    const withoutLog = loadGame();

    expect(withLog!.match).toEqual(withoutLog!.match);
    expect(withLog!.game).toEqual(withoutLog!.game);
    expect(withLog!.presentationLog).toBeDefined();
    expect(withoutLog!.presentationLog).toBeUndefined();
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
    return storedPayload();
  }

  /** Every object key and every string value in the payload, at any depth. */
  function walk(
    value: unknown,
    found: { keys: string[]; strings: string[] } = { keys: [], strings: [] },
  ): { keys: string[]; strings: string[] } {
    if (typeof value === 'string') {
      found.strings.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) walk(item, found);
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        found.keys.push(k);
        walk(v, found);
      }
    }
    return found;
  }

  it('writes exactly one save format, at the current version', () => {
    const payload = writeRealMatch();

    expect(payload['version']).toBe(SAVE_VERSION);
    expect(Object.keys(payload).sort()).toEqual(['game', 'match', 'savedAt', 'version']);
  });

  it('records no renderer choice anywhere', () => {
    const payload = writeRealMatch();

    const { keys, strings } = walk(payload);
    // The walker reaches real content, so an empty result below means absence, not a broken scan.
    expect(keys).toContain('players');
    expect(strings).toContain('player-0');

    expect(keys.filter(k => /render|webgl|three|canvas|scene|graphics/i.test(k))).toEqual([]);
    // Values are matched whole against renderer identifiers only — a player named
    // "Dom" or a fan called "Three Great Scholars" is not a renderer choice.
    expect(strings.filter(v => ['webgl', 'threejs', 'three.js', 'r3f'].includes(v.toLowerCase()))).toEqual([]);
  });
});
