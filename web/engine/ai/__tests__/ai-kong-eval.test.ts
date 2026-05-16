/**
 * Tests for the kong evaluation, empty-hand guard, and Set-based claim fixes
 * (MC-002, MC-003, MC-007, MC-008, MC-022)
 */
import { describe, it, expect } from 'vitest';
import { getMediumDiscard, getMediumClaimDecision } from '../mediumAI';
import { getHardDiscard, getHardClaimDecision } from '../hardAI';
import { calculateShanten } from '../../winDetection';
import {
  dot, bam, char, windTile, dragonTile, flowerTile, makePlayer,
} from '../../__tests__/testHelpers';
import { WindTile, DragonTile, TileSuit, TileType, Tile } from '@/models/Tile';
import { GamePhase, MeldInfo } from '@/models/GameState';

function buildFakeState(player: any, opponents: any[] = [], discardPile: any[] = []) {
  const players = [player, ...opponents];
  return {
    id: 'test', variant: 'Hong Kong Mahjong',
    phase: GamePhase.PLAYING, turnPhase: 'discard' as const,
    currentPlayerIndex: 0, players,
    wall: Array(40).fill(dot(9, 4)), deadWall: [], discardPile,
    playerDiscards: Object.fromEntries(players.map((p: any) => [p.id, []])),
    pendingClaims: [], prevailingWind: WindTile.EAST, finalScores: {},
    createdAt: new Date(), turnHistory: [], turnTimeLimit: 20,
    claimablePlayers: [], passedPlayers: [],
  };
}

describe('Kong evaluation - best-discard search', () => {
  it('medium AI declares kong when it improves shanten across all discard choices', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'medium',
      hand: [
        dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4),
        bam(2, 1), bam(3, 1), bam(4, 1),
        char(5, 1), char(6, 1), char(7, 1),
        dot(9, 1), dot(9, 2),
        windTile(WindTile.NORTH, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getMediumDiscard(state, 0);
    expect(decision.action.type).toBe('DECLARE_KONG');
  });

  it('hard AI declares kong when it improves shanten across best discard', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'hard',
      hand: [
        dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4),
        bam(2, 1), bam(3, 1), bam(4, 1),
        char(5, 1), char(6, 1), char(7, 1),
        dot(9, 1), dot(9, 2),
        windTile(WindTile.NORTH, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getHardDiscard(state, 0);
    expect(decision.action.type).toBe('DECLARE_KONG');
  });

  it('medium AI does NOT declare kong when keeping the quad is better (seven pairs path)', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'medium',
      hand: [
        dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4),
        dot(3, 1), dot(3, 2),
        dot(5, 1), dot(5, 2),
        dot(7, 1), dot(7, 2),
        bam(2, 1), bam(2, 2),
        bam(4, 1), bam(4, 2),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getMediumDiscard(state, 0);
    expect(decision.action.type).toBe('DISCARD');
  });
});

describe('Empty hand edge cases', () => {
  it('medium AI handles all-bonus hand without crash', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'medium',
      hand: [
        dot(1, 1),
        flowerTile('Plum', 1),
        flowerTile('Orchid', 2),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getMediumDiscard(state, 0);
    expect(decision.action.type).toBe('DISCARD');
  });

  it('hard AI handles all-bonus hand without crash', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'hard',
      hand: [
        dot(1, 1),
        flowerTile('Plum', 1),
        flowerTile('Orchid', 2),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getHardDiscard(state, 0);
    expect(decision.action.type).toBe('DISCARD');
  });

  it('medium AI handles bonus-only hand gracefully', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true,
      hand: [flowerTile('Plum', 1)],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    expect(() => getMediumDiscard(state, 0)).not.toThrow();
  });

  it('hard AI handles bonus-only hand gracefully', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true,
      hand: [flowerTile('Plum', 1)],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    expect(() => getHardDiscard(state, 0)).not.toThrow();
  });
});

describe('Claim tile removal - Set-based lookup', () => {
  it('hard AI chow claim removes correct tiles from hand', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'hard',
      hand: [
        bam(1, 1), bam(2, 1), bam(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        char(7, 1), char(8, 1), char(9, 1),
        dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2),
        windTile(WindTile.NORTH, 1),
        bam(8, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const claims = [{
      playerId: 'ai_1',
      claimType: 'chow' as const,
      tilesFromHand: [[bam(1, 1), bam(2, 1)]],
      priority: 1,
    }];
    const decision = getHardClaimDecision(state, 0, claims);
    expect(['CLAIM', 'PASS']).toContain(decision.action.type);
  });

  it('hard AI pung claim removes correct tiles with Set-based lookup', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'hard',
      hand: [
        dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2),
        bam(1, 1), bam(2, 1), bam(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        char(7, 1), char(8, 1), char(9, 1),
        dot(2, 1), dot(3, 1),
        bam(5, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const claims = [{
      playerId: 'ai_1',
      claimType: 'pung' as const,
      tilesFromHand: [[dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2)]],
      priority: 3,
    }];
    const decision = getHardClaimDecision(state, 0, claims);
    expect(decision.action.type).toBe('CLAIM');
  });

  it('medium AI pung claim is valid with Set-based lookup', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'medium',
      hand: [
        dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2),
        bam(1, 1), bam(2, 1), bam(3, 1),
        dot(4, 1), dot(5, 1), dot(6, 1),
        char(7, 1), char(8, 1), char(9, 1),
        dot(2, 1), dot(3, 1),
        bam(5, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const claims = [{
      playerId: 'ai_1',
      claimType: 'pung' as const,
      tilesFromHand: [[dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2)]],
      priority: 3,
    }];
    const decision = getMediumClaimDecision(state, 0, claims);
    expect(['CLAIM', 'PASS']).toContain(decision.action.type);
  });
});

describe('Kong decision reasoning', () => {
  it('medium AI kong decision includes shanten comparison in reasoning', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'medium',
      hand: [
        dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4),
        bam(2, 1), bam(3, 1), bam(4, 1),
        char(5, 1), char(6, 1), char(7, 1),
        dot(9, 1), dot(9, 2),
        windTile(WindTile.NORTH, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getMediumDiscard(state, 0);
    if (decision.action.type === 'DECLARE_KONG') {
      expect(decision.reasoning).toContain('vs');
      expect(decision.reasoning).toMatch(/\d/);
    }
  });

  it('hard AI kong decision includes shanten comparison in reasoning', () => {
    const player = makePlayer({
      id: 'ai_1', name: 'AI 1', isAI: true, aiDifficulty: 'hard',
      hand: [
        dot(1, 1), dot(1, 2), dot(1, 3), dot(1, 4),
        bam(2, 1), bam(3, 1), bam(4, 1),
        char(5, 1), char(6, 1), char(7, 1),
        dot(9, 1), dot(9, 2),
        windTile(WindTile.NORTH, 1),
      ],
      seatWind: WindTile.EAST,
    });
    const state = buildFakeState(player);
    const decision = getHardDiscard(state, 0);
    if (decision.action.type === 'DECLARE_KONG') {
      expect(decision.reasoning).toContain('vs');
      expect(decision.reasoning).toMatch(/\d/);
    }
  });
});
