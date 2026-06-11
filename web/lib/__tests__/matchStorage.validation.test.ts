/**
 * Validates that loadGame() rejects corrupted or hand-edited payloads and
 * clears storage on any violation, while accepting valid saves unchanged.
 *
 * Structure: build a real baseline via initializeMatch + saveGame, then
 * tamper with the raw JSON per case before calling loadGame().
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveGame, loadGame } from '../matchStorage';
import { initializeMatch } from '@/engine/matchManager';
import { matchStateToJson } from '@/models/MatchState';

const KEY = 'mahjong_match_in_progress';

function getRaw(): string | null {
  return localStorage.getItem(KEY);
}

function getPayload(): Record<string, unknown> {
  return JSON.parse(getRaw()!);
}

function setPayload(payload: Record<string, unknown>): void {
  localStorage.setItem(KEY, JSON.stringify(payload));
}

function getGame(payload: Record<string, unknown>): Record<string, unknown> {
  return (payload['game'] ?? (payload['match'] as Record<string, unknown>)['currentHand']) as Record<string, unknown>;
}

describe('matchStorage validation', () => {
  let basePayload: Record<string, unknown>;

  beforeEach(() => {
    localStorage.clear();

    // Build a real match with a deterministic seed and save it
    const match = initializeMatch({
      mode: 'quick',
      difficulty: 'easy',
      playerNames: ['You', 'West AI', 'North AI', 'East AI'],
      humanPlayerId: 'player-0',
      seed: 'validation-test',
    });

    saveGame(match, match.currentHand);
    basePayload = getPayload();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Case 1: valid baseline — loadGame returns non-null; storage is NOT cleared
  it('accepts a valid baseline save', () => {
    const result = loadGame();
    expect(result).not.toBeNull();
    // Storage should still be present (not cleared)
    expect(getRaw()).not.toBeNull();
  });

  // Case 2: player hand inflated to 200 copies of one tile
  it('rejects a hand inflated to 200 copies of one tile', () => {
    const payload = structuredClone(basePayload);
    const game = getGame(payload);
    const players = game['players'] as Record<string, unknown>[];
    const fakeTile = { id: 'bamboo_1_1', suit: 'bamboo', type: 'suit', number: 1, nameEnglish: 'One Bamboo', nameChinese: '一索', nameJapanese: '一索', assetPath: 'assets/tiles/bamboo_1.svg' };
    players[0]['hand'] = Array.from({ length: 200 }, () => ({ ...fakeTile }));
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 3: five copies of the same tile kind split across wall and a hand
  it('rejects five copies of the same tile kind across wall and hand', () => {
    const payload = structuredClone(basePayload);
    const game = getGame(payload);
    const fakeTile = { id: 'dot_5_1', suit: 'dot', type: 'suit', number: 5, nameEnglish: 'Five Dot', nameChinese: '五筒', nameJapanese: '五筒', assetPath: 'assets/tiles/dot_5.svg' };
    // Place 5 copies total: 3 in wall + 2 in player 0's hand
    const wall = (game['wall'] as Record<string, unknown>[]).slice(0, 3);
    // Replace first 3 wall tiles with our target tile
    for (let i = 0; i < 3; i++) wall[i] = { ...fakeTile, id: `dot_5_${i + 1}` };
    game['wall'] = wall;
    const players = game['players'] as Record<string, unknown>[];
    const hand = (players[0]['hand'] as Record<string, unknown>[]).slice(0, 2);
    hand[0] = { ...fakeTile, id: 'dot_5_a' };
    hand[1] = { ...fakeTile, id: 'dot_5_b' };
    players[0]['hand'] = hand;
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 4: players array with 3 entries
  it('rejects a players array with 3 entries', () => {
    const payload = structuredClone(basePayload);
    const game = getGame(payload);
    const players = (game['players'] as unknown[]).slice(0, 3);
    game['players'] = players;
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 5: currentPlayerIndex: 99
  it('rejects currentPlayerIndex of 99', () => {
    const payload = structuredClone(basePayload);
    const game = getGame(payload);
    game['currentPlayerIndex'] = 99;
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 6: phase: 'hacked'
  it('rejects an invalid game phase', () => {
    const payload = structuredClone(basePayload);
    const game = getGame(payload);
    game['phase'] = 'hacked';
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 7: turnHistory inflated to 5000 entries
  it('rejects turnHistory inflated to 5000 entries', () => {
    const payload = structuredClone(basePayload);
    const game = getGame(payload);
    game['turnHistory'] = Array.from({ length: 5000 }, (_, i) => ({
      turnNumber: i,
      playerId: 'player-0',
      action: 'draw',
      timestamp: new Date().toISOString(),
    }));
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 8: playerScores: ['a','b','c','d'] on the match
  it('rejects non-numeric playerScores on the match', () => {
    const payload = structuredClone(basePayload);
    const match = payload['match'] as Record<string, unknown>;
    match['playerScores'] = ['a', 'b', 'c', 'd'];
    setPayload(payload);

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });

  // Case 9: non-object garbage
  it('rejects non-object garbage stored at the key', () => {
    localStorage.setItem(KEY, '"just a string"');

    expect(loadGame()).toBeNull();
    expect(getRaw()).toBeNull();
  });
});
