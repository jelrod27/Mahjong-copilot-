import { Tile, WindTile } from '@/models/Tile';
import { ClaimType, MeldInfo, TurnPhase } from '@/models/GameState';

/** Action that can be submitted to the turn manager */
export type GameAction =
  | { type: 'DRAW' }
  | { type: 'DISCARD'; tile: Tile }
  | { type: 'DECLARE_KONG'; tile: Tile } // concealed kong or add to existing pung
  | { type: 'DECLARE_WIN' } // self-drawn win
  | { type: 'CLAIM'; claimType: ClaimType; tilesFromHand: Tile[] }
  | { type: 'PASS' };

/** Result of evaluating available claims after a discard */
export interface AvailableClaim {
  playerId: string;
  claimType: ClaimType;
  tilesFromHand: Tile[][]; // possible tile combinations to use
  priority: number; // higher = takes precedence
}

/** AI decision output */
export interface AIDecision {
  action: GameAction;
  reasoning?: string; // for debugging
}

/** Scoring context passed to the scorer */
export interface ScoringContext {
  winningTile: Tile;
  isSelfDrawn: boolean;
  seatWind: WindTile;
  prevailingWind: WindTile;
  isConcealed: boolean; // no exposed melds (except kongs)
  flowers: Tile[];
}

/** Individual fan award */
export interface FanItem {
  name: string;
  fan: number;
  description: string;
}

/** Full scoring result */
export interface ScoringResult {
  fans: FanItem[];
  totalFan: number;
  basePoints: number;
  totalPoints: number;
  handName?: string; // e.g. "Pure One Suit", "Thirteen Orphans"
  melds: MeldInfo[];
  pair: Tile[];
}

/** Win decomposition — one valid way to arrange a winning hand */
export interface HandDecomposition {
  melds: MeldInfo[];
  pair: Tile[];
}
