import { Tile, WindTile } from '@/models/Tile';
import { MeldInfo, TurnPhase } from '@/models/GameState';

/** Action that can be submitted to the turn manager */
export type GameAction =
  | { type: 'DRAW' }
  | { type: 'DISCARD'; tile: Tile }
  | { type: 'DECLARE_KONG'; tile: Tile } // concealed kong or add to existing pung
  | { type: 'DECLARE_WIN' } // self-drawn win
  | { type: 'CLAIM'; claimType: ClaimType; tilesFromHand: Tile[] }
  | { type: 'PASS' };

/** Result of evaluating available claims after a discard */
export type ClaimType = 'chow' | 'pung' | 'kong' | 'win';

export type TileColor = 'green' | 'orange' | 'red' | 'neutral';

export interface TileClassification {
  tileId: string;
  color: TileColor;
}

export interface TutorAdvice {
  message: string;
  type: 'discard' | 'claim' | 'general';
  suggestedTileId?: string;
  tileClassifications?: TileClassification[];
  isTenpai?: boolean;
  tenpaiWaits?: string[];
}

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

/** How the winning tile was obtained */
export type WinMethod = 'selfDraw' | 'discard' | 'robKong' | 'kongReplacement' | 'lastTileDraw' | 'lastTileClaim';

/** Scoring context passed to the scorer */
export interface ScoringContext {
  winningTile: Tile;
  isSelfDrawn: boolean;
  seatWind: WindTile;
  prevailingWind: WindTile;
  isConcealed: boolean; // no exposed melds (except kongs)
  flowers: Tile[];
  winMethod?: WinMethod;
  isDealer?: boolean;
  discarderIndex?: number;
}

/** Individual fan award */
export interface FanItem {
  name: string;
  fan: number;
  description: string;
}

/** Payment breakdown after scoring */
export interface PaymentBreakdown {
  payments: { fromPlayerIndex: number; toPlayerIndex: number; amount: number }[];
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
  payment?: PaymentBreakdown;
}

/** Win decomposition — one valid way to arrange a winning hand */
export interface HandDecomposition {
  melds: MeldInfo[];
  pair: Tile[];
}
