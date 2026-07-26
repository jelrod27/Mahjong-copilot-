/**
 * Hong Kong Mahjong scoring reference — single source of truth for the
 * numbers taught on /reference and in the Level 3-6 lessons.
 *
 * Follows the pattern in `content/glossary.ts`: one exported table, read by
 * every content surface, instead of the same numbers hand-copied into
 * `level4.ts`, `reference/page.tsx`, and `ScoringQuiz.tsx` and drifting apart.
 *
 * The two numbers most prone to drift — the base payment and, especially,
 * the capped limit payment — are pulled straight out of `engine/scoring.ts`
 * by calling it, not retyped. That number alone has independently gone
 * wrong in three separate places (content/level4.ts, content/glossary.ts,
 * and this file's predecessor hand-copied FAN_TABLE): all three said "256"
 * where the engine's real cap is 8192. See `__tests__/scoringReference.test.ts`
 * for the assertions that keep this table honest against `engine/scoring.ts`.
 */

import { calculateScore } from '@/engine/scoring';
import { DEFAULT_MIN_FAAN, type ScoringContext } from '@/engine/types';
import { Tile, TileSuit, TileType, WindTile } from '@/models/Tile';

// A single placeholder tile, used only to satisfy calculateScore's required
// arguments below — it is never scored on its own merits.
const PLACEHOLDER_TILE: Tile = {
  id: 'scoring-reference-placeholder',
  suit: TileSuit.DOT,
  type: TileType.SUIT,
  number: 1,
  nameEnglish: '1 Dot',
  nameChinese: '',
  nameJapanese: '',
  assetPath: '',
};

const PLACEHOLDER_CONTEXT: ScoringContext = {
  winningTile: PLACEHOLDER_TILE,
  isSelfDrawn: false,
  seatWind: WindTile.EAST,
  prevailingWind: WindTile.EAST,
  isConcealed: false,
  flowers: [],
};

/** Base payment for a 0-fan "Chicken Hand" — the HK standard, documented in
 *  engine/scoring.ts as BASE_POINTS. Verified against a real 0-fan hand in
 *  the drift test rather than derived here, since it has never drifted. */
export const BASE_POINTS = 8;

/** Fan count at which a hand becomes a "limit hand" and payment stops
 *  doubling. Matches engine/scoring.ts's LIMIT_FAN. */
export const LIMIT_FAN = 10;

/**
 * The capped payment for any limit hand (10+ fan, or a named limit pattern
 * like Thirteen Orphans). Derived by asking the engine to score a Heavenly
 * Hand — a call that returns the capped value unconditionally, before any
 * hand decomposition runs — rather than retyping engine/scoring.ts's
 * MAX_PAYMENT constant.
 */
export const MAX_PAYMENT = calculateScore(
  [PLACEHOLDER_TILE, PLACEHOLDER_TILE],
  [],
  { ...PLACEHOLDER_CONTEXT, isHeavenly: true },
).totalPoints;

/** HK standard minimum faan required to legally declare a win. */
export const MIN_FAAN = DEFAULT_MIN_FAAN;

/** Payment for a given fan count, mirroring engine/scoring.ts's own formula. */
export function paymentForFan(fan: number): number {
  return fan >= LIMIT_FAN ? MAX_PAYMENT : BASE_POINTS * Math.pow(2, fan);
}

/** How the base payment gets redistributed depending on how the hand was won. */
export const PAYMENT_RULES = {
  discard: {
    description: 'The discarder pays double the base; the other two players each pay the base once.',
    discarderMultiplier: 2,
    otherMultiplier: 1,
    totalMultiplier: 4,
  },
  selfDraw: {
    description: 'All three other players pay double the base.',
    perOpponentMultiplier: 2,
    totalMultiplier: 6,
  },
} as const;

export interface FanEntry {
  name: string;
  fan: string;
  description: string;
}

/**
 * Every standard (non-limit) fan source the engine awards, in
 * `engine/scoring.ts`'s `evaluateFans`. Names match the engine's fan names.
 */
export const FAN_TABLE: FanEntry[] = [
  { name: 'Chicken Hand', fan: '0', description: 'A winning hand with no scoring elements.' },
  { name: 'Self-Drawn Win', fan: '1', description: 'Win by drawing the tile yourself, not from a discard.' },
  { name: 'Concealed Hand', fan: '1', description: 'Win without exposing any melds (no claims from discards).' },
  { name: 'No Flowers', fan: '1', description: 'Win while holding zero flower or season tiles.' },
  { name: 'Dragon Pung', fan: '1 each', description: 'A pung (or kong) of any dragon tile (Red, Green, or White).' },
  { name: 'Small Three Dragons', fan: '3', description: 'Two dragon pungs plus a dragon pair — stacks with the two dragon-pung fans above.' },
  { name: 'Seat Wind Pung', fan: '1', description: 'A pung (or kong) of your own seat wind.' },
  { name: 'Prevailing Wind Pung', fan: '1', description: "A pung (or kong) of the round's prevailing wind. A double wind (seat = prevailing) scores both." },
  { name: 'Flower/Season', fan: '1 each', description: 'A flower or season tile that numerically matches your seat wind (e.g. East + Plum). Non-matching flowers score 0.' },
  { name: 'All Four Flowers', fan: '2', description: 'You hold the complete set of all four flower tiles.' },
  { name: 'All Four Seasons', fan: '2', description: 'You hold the complete set of all four season tiles.' },
  { name: 'All Chows', fan: '1', description: 'All four melds are chows (sequences) — no pungs or kongs.' },
  { name: 'All Pungs', fan: '3', description: 'All four melds are pungs or kongs — no chows.' },
  { name: 'Mixed One Suit', fan: '3', description: 'All tiles from one numbered suit plus honor tiles.' },
  { name: 'Pure One Suit', fan: '7', description: 'All tiles from a single numbered suit, no honors.' },
  { name: 'Seven Pairs', fan: '4', description: 'Hand of 7 distinct pairs instead of 4 melds + 1 pair.' },
  { name: 'Robbing the Kong', fan: '1', description: "Win by claiming a tile another player just used to upgrade a pung to a kong." },
  { name: 'Win on Kong Replacement', fan: '1', description: 'Win on the replacement tile drawn immediately after forming a kong.' },
  { name: 'Last Tile Draw', fan: '1', description: 'Win by drawing the very last tile in the wall.' },
  { name: 'Last Tile Claim', fan: '1', description: 'Win by claiming the very last discard of the hand.' },
];

export interface LimitHand {
  name: string;
  chinese: string;
  description: string;
  example: string;
}

/** Every limit-hand pattern the engine recognizes, in engine/scoring.ts. */
export const LIMIT_HANDS: LimitHand[] = [
  {
    name: 'Heavenly Hand',
    chinese: '天和',
    description: "The dealer's starting 14 tiles are already a complete winning hand, before anyone discards.",
    example: 'Dealer self-draws a win on the very first turn',
  },
  {
    name: 'Earthly Hand',
    chinese: '地和',
    description: "A non-dealer wins by claiming the dealer's very first discard.",
    example: "Claim on the dealer's first discard (non-dealer)",
  },
  {
    name: 'Thirteen Orphans',
    chinese: '十三幺',
    description: 'One of each terminal (1 and 9 of each suit), one of each wind, one of each dragon, plus a pair of any of those 13 types.',
    example: '1D 9D 1B 9B 1C 9C E S W N Red Grn Wht + pair',
  },
  {
    name: 'Nine Gates',
    chinese: '九蓮寶燈',
    description: 'In a single suit: 1-1-1-2-3-4-5-6-7-8-9-9-9 plus any tile of that suit. Any of the 9 tiles completes the hand.',
    example: '1-1-1-2-3-4-5-6-7-8-9-9-9 + any (one suit)',
  },
  {
    name: 'Big Three Dragons',
    chinese: '大三元',
    description: 'Pungs (or kongs) of all three dragons: Red, Green, and White. The remaining set and pair can be anything.',
    example: 'Red x3 + Grn x3 + Wht x3 + any set + pair',
  },
  {
    name: 'Big Four Winds',
    chinese: '大四喜',
    description: 'Pungs (or kongs) of all four winds: East, South, West, and North. The pair can be anything.',
    example: 'E x3 + S x3 + W x3 + N x3 + any pair',
  },
  {
    name: 'Small Four Winds',
    chinese: '小四喜',
    description: 'Pungs (or kongs) of three winds, plus a pair of the fourth wind.',
    example: 'E x3 + S x3 + W x3 + N pair + any set',
  },
  {
    name: 'All Honors',
    chinese: '字一色',
    description: 'Every tile in the hand is an honor tile (winds and/or dragons). No suit tiles at all.',
    example: '4 honor pungs/kongs + honor pair',
  },
  {
    name: 'All Terminals',
    chinese: '清老頭',
    description: 'Every tile is a 1 or 9 (terminal). No middle numbers, no honors.',
    example: '1D x3 + 9D x3 + 1B x3 + 9C x3 + 9B pair',
  },
  {
    name: 'Four Concealed Pungs',
    chinese: '四暗刻',
    description: 'Four pungs all self-drawn (none claimed from discards). The pair may be completed from a discard.',
    example: '4 self-drawn pungs + pair',
  },
  {
    name: 'All Kongs',
    chinese: '十八羅漢',
    description: 'Four kongs plus a pair. Extremely rare since it requires 18 tiles.',
    example: '4 kongs (16 tiles) + pair (2 tiles)',
  },
];
