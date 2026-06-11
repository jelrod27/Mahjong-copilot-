/**
 * Regression: JSON round-trips must preserve every field the engine relies
 * on. seed/winMethod/aiPersonality/aiSeats were silently dropped by the
 * serializers when first added (caught in PR review) — a reloaded game lost
 * determinism and AI personality.
 */

import { describe, it, expect } from 'vitest';
import { initializeGame } from '@/engine/turnManager';
import { initializeMatch } from '@/engine/matchManager';
import { gameStateToJson, gameStateFromJson } from '../GameState';
import { matchStateToJson, matchStateFromJson, normaliseAiSeats } from '../MatchState';

const PERSONALITY = { claimAppetite: 1.6, fanGreed: 0.5, defenseBias: 0.4, speedBias: 1.8 };

describe('GameState JSON round-trip', () => {
  function roundTrip() {
    const state = initializeGame({
      playerNames: ['You', 'A', 'B', 'C'],
      aiPlayers: [
        { index: 1, difficulty: 'easy', personality: PERSONALITY },
        { index: 2, difficulty: 'medium' },
        { index: 3, difficulty: 'hard' },
      ],
      humanPlayerId: 'human',
      seed: 'roundtrip-test',
    });
    const finished = { ...state, winMethod: 'robKong' as const };
    return gameStateFromJson(JSON.parse(JSON.stringify(gameStateToJson(finished))));
  }

  it('preserves the seed', () => {
    expect(roundTrip().seed).toBe('roundtrip-test');
  });

  it('preserves the win method', () => {
    expect(roundTrip().winMethod).toBe('robKong');
  });

  it('preserves player aiPersonality where set', () => {
    expect(roundTrip().players[1].aiPersonality).toEqual(PERSONALITY);
  });

  it('leaves aiPersonality undefined for players without one', () => {
    expect(roundTrip().players[2].aiPersonality).toBeUndefined();
  });
});

describe('MatchState JSON round-trip', () => {
  it('preserves per-seat AI config (aiSeats)', () => {
    const match = initializeMatch({
      mode: 'single',
      difficulty: 'medium',
      playerNames: ['You', 'A', 'B', 'C'],
      humanPlayerId: 'human',
      minFaan: 1,
      aiSeats: [{ index: 2, difficulty: 'hard', personality: PERSONALITY }],
    });

    const revived = matchStateFromJson(JSON.parse(JSON.stringify(matchStateToJson(match))));

    expect(revived.aiSeats).toEqual([{ index: 2, difficulty: 'hard', personality: PERSONALITY }]);
    expect(revived.mode).toBe('single');
  });

  it('drops corrupted aiSeats entries on deserialisation', () => {
    expect(normaliseAiSeats('not an array')).toBeUndefined();
    expect(normaliseAiSeats([{ index: 99, difficulty: 'hard' }])).toBeUndefined();
    expect(normaliseAiSeats([{ index: 2, difficulty: 'impossible' }])).toBeUndefined();
    expect(normaliseAiSeats([
      { index: 2, difficulty: 'hard' },
      { index: 0.5, difficulty: 'easy' },
      null,
    ])).toEqual([{ index: 2, difficulty: 'hard' }]);
  });
});
