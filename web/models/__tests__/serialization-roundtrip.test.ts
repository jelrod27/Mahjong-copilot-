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
import { matchStateToJson, matchStateFromJson } from '../MatchState';

const PERSONALITY = { claimAppetite: 1.6, fanGreed: 0.5, defenseBias: 0.4, speedBias: 1.8 };

describe('GameState JSON round-trip', () => {
  it('preserves seed, winMethod, and player aiPersonality', () => {
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

    const revived = gameStateFromJson(JSON.parse(JSON.stringify(gameStateToJson(finished))));

    expect(revived.seed).toBe('roundtrip-test');
    expect(revived.winMethod).toBe('robKong');
    expect(revived.players[1].aiPersonality).toEqual(PERSONALITY);
    expect(revived.players[2].aiPersonality).toBeUndefined();
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
});
