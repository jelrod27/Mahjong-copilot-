import { describe, it, expect } from 'vitest';
import { GameState, GamePhase, Player } from '@/models/GameState';
import { Tile, TileSuit, TileType, WindTile, DragonTile } from '@/models/Tile';
import { AvailableClaim } from '../types';
import { getEasyClaimDecision } from '../ai/easyAI';
import {
  dot, bam, char, dragonTile, windTile, makePlayer,
} from './testHelpers';

function buildGameState(hand: Tile[]): GameState {
  return {
    id: 'easy-ai-test',
    variant: 'Hong Kong Mahjong',
    phase: GamePhase.PLAYING,
    turnPhase: 'discard',
    currentPlayerIndex: 0,
    players: [
      makePlayer({
        id: 'player_0', name: 'Player 0', seatWind: WindTile.EAST, hand,
      }),
      makePlayer({
        id: 'player_1', name: 'Player 1', seatWind: WindTile.SOUTH,
        hand: [dot(1, 4), dot(2, 4), dot(3, 4), dot(4, 4), dot(5, 4), dot(6, 4),
               dot(7, 4), dot(8, 4), dot(9, 4), bam(1, 4), bam(2, 4), bam(3, 4), bam(4, 4)],
      }),
      makePlayer({
        id: 'player_2', name: 'Player 2', seatWind: WindTile.WEST,
        hand: [char(1, 4), char(2, 4), char(3, 4), char(4, 4), char(5, 4), char(6, 4),
               char(7, 4), char(8, 4), char(9, 4), bam(5, 4), bam(6, 4), bam(7, 4), bam(8, 4)],
      }),
      makePlayer({
        id: 'player_3', name: 'Player 3', seatWind: WindTile.NORTH,
        hand: [bam(9, 4), dot(1, 3), dot(2, 3), dot(3, 3), dot(4, 3), dot(5, 3),
               dot(6, 3), dot(7, 3), dot(8, 3), dot(9, 3), char(1, 3), char(2, 3), char(3, 3)],
      }),
    ],
    wall: Array.from({ length: 40 }, (_, i) => bam(1, 200 + i)),
    deadWall: Array.from({ length: 14 }, (_, i) => char(1, 200 + i)),
    discardPile: [],
    playerDiscards: { player_0: [], player_1: [], player_2: [], player_3: [] },
    pendingClaims: [],
    claimablePlayers: [],
    passedPlayers: [],
    prevailingWind: WindTile.EAST,
    finalScores: {},
    createdAt: new Date(),
    turnHistory: [],
    turnTimeLimit: 20,
  };
}

describe('getEasyClaimDecision', () => {
  it('should return PASS when no claims are available', () => {
    const state = buildGameState([dot(1, 1), dot(2, 1), dot(3, 1)]);
    const decision = getEasyClaimDecision(state, 0, []);
    expect(decision.action.type).toBe('PASS');
  });

  it('should claim win when available', () => {
    const state = buildGameState([dot(1, 1), dot(2, 1), dot(3, 1)]);
    const winClaim: AvailableClaim = {
      playerId: 'player_0',
      claimType: 'win',
      tilesFromHand: [[dot(1, 1), dot(2, 1)]],
      priority: 1,
    };
    const decision = getEasyClaimDecision(state, 0, [winClaim]);
    expect(decision.action.type).toBe('CLAIM');
    if (decision.action.type === 'CLAIM') {
      expect(decision.action.claimType).toBe('win');
    }
  });

  describe('MC-001: empty tilesFromHand crash guard', () => {
    it('should NOT crash when pungClaim has an empty tilesFromHand[0] array', () => {
      const state = buildGameState([dot(1, 1), dot(2, 1), dot(3, 1)]);

      // This is the exact crash scenario: tilesFromHand[0] is an empty array.
      // In JavaScript, [] is truthy, so the old check `pungClaim.tilesFromHand[0]`
      // would pass, but accessing [0][0] yields undefined, and tile.nameEnglish
      // would throw a TypeError at runtime.
      const pungClaimWithEmptyTiles: AvailableClaim = {
        playerId: 'player_0',
        claimType: 'pung',
        tilesFromHand: [[]], // empty inner array — truthy but [0] is undefined
        priority: 1,
      };

      // This must NOT throw a TypeError
      const decision = getEasyClaimDecision(state, 0, [pungClaimWithEmptyTiles]);
      expect(decision.action.type).toBe('PASS');
      expect(decision.reasoning).toBe('Easy AI: passing on claim');
    });

    it('should NOT crash when pungClaim has undefined tilesFromHand[0]', () => {
      const state = buildGameState([dot(1, 1), dot(2, 1), dot(3, 1)]);

      // Also guard against tilesFromHand being an array with no first element
      const pungClaimNoFirst: AvailableClaim = {
        playerId: 'player_0',
        claimType: 'pung',
        tilesFromHand: [] as Tile[][],
        priority: 1,
      };

      const decision = getEasyClaimDecision(state, 0, [pungClaimNoFirst]);
      expect(decision.action.type).toBe('PASS');
    });

    it('should still claim pung on dragon tiles when tilesFromHand is valid', () => {
      // Use a hand with dragon tiles matching seat wind for reliable claim
      const hand = [
        dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2),
        dot(1, 1), dot(2, 1), dot(3, 1),
        dot(5, 1), dot(6, 1), dot(7, 1),
        char(1, 1), char(2, 1), char(3, 1),
        bam(1, 1), bam(2, 1), bam(3, 1),
      ];
      const state = buildGameState(hand);

      const pungClaim: AvailableClaim = {
        playerId: 'player_0',
        claimType: 'pung',
        tilesFromHand: [[dragonTile(DragonTile.RED, 1), dragonTile(DragonTile.RED, 2)]],
        priority: 1,
      };

      const decision = getEasyClaimDecision(state, 0, [pungClaim]);
      // Dragon pung gets claimed 70% of the time; either PASS or CLAIM is valid
      expect(['CLAIM', 'PASS']).toContain(decision.action.type);
      if (decision.action.type === 'CLAIM') {
        expect(decision.action.claimType).toBe('pung');
      }
    });

    it('should return PASS for pung claim on non-dragon, non-seat-wind tile', () => {
      const hand = [bam(1, 1), bam(2, 1), bam(3, 1), dot(1, 1), dot(2, 1), dot(3, 1),
                    bam(5, 1), bam(6, 1), bam(7, 1), char(1, 1), char(2, 1), char(3, 1),
                    dot(5, 1)];
      const state = buildGameState(hand);
      // Player 0 seat is EAST; claim on a south wind (not dragon, not seat wind)
      const pungClaim: AvailableClaim = {
        playerId: 'player_0',
        claimType: 'pung',
        tilesFromHand: [[windTile(WindTile.SOUTH, 1), windTile(WindTile.SOUTH, 2)]],
        priority: 1,
      };

      // South wind is not player 0's seat wind (EAST) and not a dragon,
      // so the AI should always pass
      const decision = getEasyClaimDecision(state, 0, [pungClaim]);
      expect(decision.action.type).toBe('PASS');
    });
  });
});