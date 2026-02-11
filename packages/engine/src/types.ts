// ============================================================================
// Tile Types
// ============================================================================

/** Specific tile instance ID (0-135). Each of 34 tile types has 4 copies. */
export type TileId = number;

/** Unique tile type (0-33). Identifies the tile regardless of which copy. */
export type TileType = number;

/** Player seat index (0-3). East=0, South=1, West=2, North=3. */
export type PlayerId = 0 | 1 | 2 | 3;

/**
 * 34-element array representing tile counts.
 * Index = TileType (0-33), Value = count of that tile type.
 */
export type HandArray = number[];

/** Tile suits */
export enum Suit {
  Man = 'man',
  Pin = 'pin',
  Sou = 'sou',
  Wind = 'wind',
  Dragon = 'dragon',
}

/** Wind directions */
export enum Wind {
  East = 0,
  South = 1,
  West = 2,
  North = 3,
}

/** Dragon types */
export enum Dragon {
  Haku = 0,
  Hatsu = 1,
  Chun = 2,
}

/** Detailed info about a tile */
export interface TileInfo {
  id: TileId;
  type: TileType;
  suit: Suit;
  value: number;
  isHonor: boolean;
  isTerminal: boolean;
  isSuited: boolean;
  isRedDora: boolean;
  display: string;
}

// ============================================================================
// Meld Types
// ============================================================================

export type MeldKind = 'chi' | 'pon' | 'kan' | 'closedKan' | 'addedKan';

export interface Meld {
  type: MeldKind;
  tiles: TileId[];
  calledFrom?: PlayerId;
  calledTile?: TileId;
}

// ============================================================================
// Hand Types
// ============================================================================

export interface PlayerHand {
  closed: TileId[];
  closedArray: HandArray;
  openMelds: Meld[];
  closedKans: Meld[];
  tsumoTile?: TileId;
}

// ============================================================================
// Discard Types
// ============================================================================

export interface DiscardInfo {
  tile: TileId;
  turnNumber: number;
  calledBy?: PlayerId;
  isRiichiDiscard: boolean;
  isTsumogiri: boolean;
}

// ============================================================================
// Player State
// ============================================================================

export interface PlayerState {
  id: PlayerId;
  seat: Wind;
  hand: PlayerHand;
  discards: DiscardInfo[];
  points: number;
  isRiichi: boolean;
  riichiTurn?: number;
  isIppatsu: boolean;
  isFuriten: boolean;
  isTemporaryFuriten: boolean;
}

// ============================================================================
// Game State
// ============================================================================

export enum GamePhase {
  WaitingToStart = 'waiting',
  Dealing = 'dealing',
  PlayerDraw = 'draw',
  PlayerDiscard = 'discard',
  CallWindow = 'call_window',
  RiichiDeclaration = 'riichi',
  KanProcess = 'kan_process',
  RoundEnd = 'round_end',
  GameEnd = 'game_end',
}

export interface Wall {
  liveTiles: TileId[];
  deadWall: TileId[];
  tilesRemaining: number;
}

export interface RoundInfo {
  wind: Wind;
  number: number;
  dealer: PlayerId;
  honbaCount: number;
  riichiSticksOnTable: number;
}

export interface GameEvent {
  type: string;
  playerId?: PlayerId;
  tileId?: TileId;
  meld?: Meld;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface GameState {
  phase: GamePhase;
  round: RoundInfo;
  wall: Wall;
  players: [PlayerState, PlayerState, PlayerState, PlayerState];
  currentTurn: PlayerId;
  turnNumber: number;
  lastDiscard?: DiscardInfo;
  doraIndicators: TileId[];
  uraDoraIndicators: TileId[];
  gameLog: GameEvent[];
}

// ============================================================================
// Win/Scoring Types
// ============================================================================

export interface HandGroup {
  type: 'sequence' | 'triplet' | 'pair' | 'kan';
  tiles: TileType[];
  isOpen: boolean;
}

export interface HandParsing {
  groups: HandGroup[];
  pair: TileType;
  isValid: boolean;
}

export enum WaitType {
  Shanpon = 'shanpon',
  Kanchan = 'kanchan',
  Penchan = 'penchan',
  Ryanmen = 'ryanmen',
  Tanki = 'tanki',
}

export interface WinContext {
  winningTile: TileId;
  isTsumo: boolean;
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isFirstTurn: boolean;
  isLastTile: boolean;
  isAfterKan: boolean;
  isRobbedKan: boolean;
  seatWind: Wind;
  roundWind: Wind;
  doraCount: number;
  uraDoraCount: number;
  redDoraCount: number;
}

export interface Yaku {
  name: string;
  japaneseName: string;
  hanOpen: number;
  hanClosed: number;
  isYakuman: boolean;
}

export interface ScoringResult {
  yaku: Yaku[];
  han: number;
  fu: number;
  basePoints: number;
  dealerTsumoPayment?: { all: number };
  nonDealerTsumoPayment?: { dealer: number; nonDealer: number };
  ronPayment?: number;
  totalPoints: number;
  isYakuman: boolean;
  isMangan: boolean;
  limitName?: string;
}
