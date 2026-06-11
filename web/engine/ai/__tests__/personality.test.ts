import { describe, it, expect } from 'vitest';
import { normalizePersonality, DEFAULT_PERSONALITY } from '../personality';
import { getEasyClaimDecision } from '../easyAI';
import { initializeGame } from '../../turnManager';
import { GameState } from '@/models/GameState';
import { Tile, TileSuit, TileType, DragonTile } from '@/models/Tile';
import { AvailableClaim } from '../../types';

describe('normalizePersonality', () => {
  it('returns defaults for undefined', () => {
    expect(normalizePersonality(undefined)).toEqual(DEFAULT_PERSONALITY);
  });

  it('clamps absurd and corrupted values into [0.1, 3]', () => {
    const p = normalizePersonality({
      claimAppetite: 999,
      fanGreed: -5,
      defenseBias: NaN,
      speedBias: Infinity,
    });
    expect(p.claimAppetite).toBe(3);
    expect(p.fanGreed).toBe(0.1);
    expect(p.defenseBias).toBe(1); // NaN falls back to default
    expect(p.speedBias).toBe(1); // Infinity is not finite — falls back to default
  });

  it('passes sane values through unchanged', () => {
    const p = normalizePersonality({ claimAppetite: 1.6, fanGreed: 0.5, defenseBias: 0.4, speedBias: 1.8 });
    expect(p).toEqual({ claimAppetite: 1.6, fanGreed: 0.5, defenseBias: 0.4, speedBias: 1.8 });
  });
});

describe('personality-driven decisions', () => {
  function gameWithPersonality(claimAppetite: number): GameState {
    return initializeGame({
      playerNames: ['You', 'A', 'B', 'C'],
      aiPlayers: [
        { index: 1, difficulty: 'easy', personality: { claimAppetite, fanGreed: 1, defenseBias: 1, speedBias: 1 } },
        { index: 2, difficulty: 'easy' },
        { index: 3, difficulty: 'easy' },
      ],
      humanPlayerId: 'human',
      seed: 'personality-test',
    });
  }

  it('claimAppetite changes the easy AI pung decision for the same state', () => {
    let uid = 0;
    const dragon = (): Tile => ({
      id: `d${uid++}`, suit: TileSuit.DRAGON, dragon: DragonTile.RED, type: TileType.HONOR,
      nameEnglish: 'Red Dragon', nameChinese: '', nameJapanese: '', assetPath: '',
    } as Tile);

    const pungClaim: AvailableClaim = {
      playerId: 'ai_1',
      claimType: 'pung',
      tilesFromHand: [[dragon(), dragon()]],
      priority: 2,
    };

    // Deterministic noise means the same state always rolls the same number;
    // appetite scales the threshold that roll is compared against. With a
    // minimal appetite the threshold is 0.07; with maximal it is 0.98 — the
    // same roll must claim under one and not the other (unless the roll is
    // outside both, which the assertion catches by inequality of outcomes
    // across two very different appetites for at least one of many salts).
    let differed = false;
    for (let i = 0; i < 12 && !differed; i++) {
      const base = gameWithPersonality(0.1);
      const eager = gameWithPersonality(2.5);
      // vary turnHistory length to vary the deterministic roll
      const pad = Array.from({ length: i }, (_, k) => ({
        turnNumber: k, playerId: 'human', action: 'discard' as never, timestamp: new Date(),
      }));
      const shy = getEasyClaimDecision({ ...base, turnHistory: pad as never }, 1, [pungClaim]);
      const bold = getEasyClaimDecision({ ...eager, turnHistory: pad as never }, 1, [pungClaim]);
      if (shy.action.type !== bold.action.type) differed = true;
    }
    expect(differed).toBe(true);
  });
});
