import type {
  TileType,
  HandGroup,
  HandParsing,
  Meld,
  Yaku,
  WinContext,
  WaitType,
  ScoringResult,
  Wind,
} from './types.js';

// ============================================================================
// Tile helpers (inlined to avoid circular deps)
// ============================================================================

function isTerminal(t: TileType): boolean {
  return t === 0 || t === 8 || t === 9 || t === 17 || t === 18 || t === 26;
}

function isHonor(t: TileType): boolean {
  return t >= 27 && t <= 33;
}

function isTerminalOrHonor(t: TileType): boolean {
  return isTerminal(t) || isHonor(t);
}

function isDragon(t: TileType): boolean {
  return t >= 31 && t <= 33;
}

function windToTileType(wind: Wind): TileType {
  return 27 + (wind as number);
}

// ============================================================================
// Fu (Minipoints) Calculation
// ============================================================================

/**
 * Calculate fu (minipoints) for a winning hand.
 *
 * Base fu:
 * - 30 fu for a ron win (concealed)
 * - 20 fu for a tsumo win
 * - 20 fu for an open (pinfu-like) hand
 *
 * Set fu:
 * - Open triplet of simples: 2
 * - Closed triplet of simples: 4
 * - Open triplet of terminals/honors: 4
 * - Closed triplet of terminals/honors: 8
 * - Open kan of simples: 8
 * - Closed kan of simples: 16
 * - Open kan of terminals/honors: 16
 * - Closed kan of terminals/honors: 32
 *
 * Pair fu:
 * - Dragon pair: 2
 * - Seat wind pair: 2
 * - Round wind pair: 2
 * - (Double wind: 2+2=4)
 *
 * Wait fu:
 * - Kanchan (middle wait): 2
 * - Penchan (edge wait): 2
 * - Tanki (pair wait): 2
 * - Shanpon: 0
 * - Ryanmen: 0
 *
 * Tsumo: +2 fu (except for pinfu)
 *
 * The total is then rounded up to the nearest 10.
 */
export function calculateFu(
  parsing: HandParsing,
  openMelds: Meld[],
  closedKans: Meld[],
  winContext: WinContext,
  waitType: WaitType,
  isConcealed: boolean,
  isPinfu: boolean,
  isChiitoitsu: boolean,
): number {
  // Seven pairs: always 25 fu, no rounding
  if (isChiitoitsu) return 25;

  // Pinfu tsumo: always 20 fu
  if (isPinfu && winContext.isTsumo) return 20;

  // Base fu
  let fu = 20;

  // Concealed ron: +10 base
  if (isConcealed && !winContext.isTsumo) {
    fu += 10;
  }

  // Open pinfu (all sequences, valueless pair, ryanmen): keep 30 minimum
  // If open hand and all sets are sequences and pair is valueless -> at least 30 fu

  // Set fu from parsed groups (closed hand groups)
  for (const group of parsing.groups) {
    fu += groupFu(group, winContext);
  }

  // Set fu from open melds
  for (const meld of openMelds) {
    fu += meldFu(meld, winContext);
  }

  // Set fu from closed kans
  for (const meld of closedKans) {
    fu += meldFu(meld, winContext);
  }

  // Pair fu
  fu += pairFu(parsing.pair, winContext);

  // Wait fu
  fu += waitFu(waitType);

  // Tsumo fu (+2, but not for pinfu)
  if (winContext.isTsumo && !isPinfu) {
    fu += 2;
  }

  // Open hand with no fu: minimum 30 (open pinfu rule)
  if (!isConcealed && fu === 20) {
    fu = 30;
  }

  // Round up to nearest 10
  return Math.ceil(fu / 10) * 10;
}

function groupFu(group: HandGroup, _winContext: WinContext): number {
  if (group.type === 'sequence') return 0;
  if (group.type === 'pair') return 0;

  const tileType = group.tiles[0]!;
  const isTH = isTerminalOrHonor(tileType);

  if (group.type === 'triplet') {
    const base = isTH ? 4 : 2;
    return group.isOpen ? base : base * 2;
  }

  if (group.type === 'kan') {
    const base = isTH ? 16 : 8;
    return group.isOpen ? base : base * 2;
  }

  return 0;
}

function meldFu(meld: Meld, _winContext: WinContext): number {
  const tileType = Math.floor(meld.tiles[0]! / 4);
  const isTH = isTerminalOrHonor(tileType);

  switch (meld.type) {
    case 'pon': {
      const base = isTH ? 4 : 2;
      return base; // open
    }
    case 'kan':
    case 'addedKan': {
      const base = isTH ? 16 : 8;
      return base; // open
    }
    case 'closedKan': {
      const base = isTH ? 16 : 8;
      return base * 2; // closed
    }
    default:
      return 0;
  }
}

function pairFu(pairType: TileType, winContext: WinContext): number {
  let fu = 0;
  if (isDragon(pairType)) fu += 2;
  if (pairType === windToTileType(winContext.seatWind)) fu += 2;
  if (pairType === windToTileType(winContext.roundWind)) fu += 2;
  return fu;
}

function waitFu(waitType: WaitType): number {
  switch (waitType as string) {
    case 'kanchan':
    case 'penchan':
    case 'tanki':
      return 2;
    default:
      return 0;
  }
}

// ============================================================================
// Point Calculation Tables
// ============================================================================

/**
 * Calculate base points from han and fu.
 * base = fu * 2^(2+han)
 * With limits at mangan and above.
 */
export function calculateBasePoints(han: number, fu: number): number {
  // Yakuman
  if (han >= 13) return 8000;

  // Counted yakuman (sanbaiman)
  if (han >= 11) return 6000;

  // Baiman
  if (han >= 8) return 4000;

  // Haneman
  if (han >= 6) return 3000;

  // Mangan (5 han, or 4 han 30+ fu, or 3 han 60+ fu)
  if (han >= 5) return 2000;

  // Standard calculation: fu * 2^(2+han)
  const base = fu * Math.pow(2, 2 + han);

  // Cap at mangan
  if (base >= 2000) return 2000;

  return base;
}

/**
 * Get the limit name for a given han count.
 */
export function getLimitName(han: number, basePoints: number): string | undefined {
  if (han >= 13) return 'yakuman';
  if (han >= 11) return 'sanbaiman';
  if (han >= 8) return 'baiman';
  if (han >= 6) return 'haneman';
  if (han >= 5 || basePoints >= 2000) return 'mangan';
  return undefined;
}

// ============================================================================
// Payment Calculation
// ============================================================================

/** Round up to the nearest 100. */
function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

export interface PaymentResult {
  /** For dealer tsumo: each non-dealer pays this */
  dealerTsumoPayment?: { all: number };
  /** For non-dealer tsumo: dealer pays more */
  nonDealerTsumoPayment?: { dealer: number; nonDealer: number };
  /** For ron: loser pays this */
  ronPayment?: number;
  /** Total points the winner receives */
  totalPoints: number;
}

/**
 * Calculate payment amounts from base points.
 *
 * Dealer (East):
 * - Tsumo: each non-dealer pays base * 2, rounded up to 100
 * - Ron: discarder pays base * 6, rounded up to 100
 *
 * Non-dealer:
 * - Tsumo: dealer pays base * 2, non-dealers pay base * 1, each rounded up to 100
 * - Ron: discarder pays base * 4, rounded up to 100
 */
export function calculatePayment(
  basePoints: number,
  isDealer: boolean,
  isTsumo: boolean,
  honbaCount: number,
  riichiSticksOnTable: number,
): PaymentResult {
  const honbaBonus = honbaCount * 300;

  if (isDealer) {
    if (isTsumo) {
      // Each of 3 non-dealers pays basePoints * 2 + 100 per honba
      const each = roundUp100(basePoints * 2) + (honbaCount * 100);
      return {
        dealerTsumoPayment: { all: each },
        totalPoints: each * 3 + riichiSticksOnTable * 1000,
      };
    } else {
      // Ron: discarder pays basePoints * 6
      const payment = roundUp100(basePoints * 6) + honbaBonus;
      return {
        ronPayment: payment,
        totalPoints: payment + riichiSticksOnTable * 1000,
      };
    }
  } else {
    if (isTsumo) {
      // Dealer pays basePoints * 2, non-dealers pay basePoints * 1
      const dealerPay = roundUp100(basePoints * 2) + (honbaCount * 100);
      const nonDealerPay = roundUp100(basePoints * 1) + (honbaCount * 100);
      return {
        nonDealerTsumoPayment: { dealer: dealerPay, nonDealer: nonDealerPay },
        totalPoints: dealerPay + nonDealerPay * 2 + riichiSticksOnTable * 1000,
      };
    } else {
      // Ron: discarder pays basePoints * 4
      const payment = roundUp100(basePoints * 4) + honbaBonus;
      return {
        ronPayment: payment,
        totalPoints: payment + riichiSticksOnTable * 1000,
      };
    }
  }
}

// ============================================================================
// Full Scoring Pipeline
// ============================================================================

/**
 * Calculate the full scoring result for a winning hand.
 */
export function calculateScore(
  yaku: Yaku[],
  parsing: HandParsing,
  openMelds: Meld[],
  closedKans: Meld[],
  winContext: WinContext,
  waitType: WaitType,
  isConcealed: boolean,
  honbaCount: number,
  riichiSticksOnTable: number,
): ScoringResult {
  if (yaku.length === 0) {
    return {
      yaku: [],
      han: 0,
      fu: 0,
      basePoints: 0,
      totalPoints: 0,
      isYakuman: false,
      isMangan: false,
    };
  }

  const isYakuman = yaku.some((y) => y.isYakuman);
  const isPinfu = yaku.some((y) => y.name === 'Pinfu');
  const isChiitoitsu = yaku.some((y) => y.name === 'Chiitoitsu');

  // Calculate han from yaku
  let han = 0;
  for (const y of yaku) {
    if (y.isYakuman) {
      han += 13;
    } else if (isConcealed) {
      han += y.hanClosed;
    } else {
      han += y.hanOpen === -1 ? 0 : y.hanOpen;
    }
  }

  // Add dora
  han += winContext.doraCount;
  han += winContext.uraDoraCount;
  han += winContext.redDoraCount;

  // Calculate fu
  const fu = isYakuman
    ? 0
    : calculateFu(
        parsing,
        openMelds,
        closedKans,
        winContext,
        waitType,
        isConcealed,
        isPinfu,
        isChiitoitsu,
      );

  // Calculate base points
  const basePoints = calculateBasePoints(han, fu);

  // Determine if dealer
  const isDealer = winContext.seatWind === (0 as unknown as Wind); // East = dealer

  // Calculate payments
  const payment = calculatePayment(
    basePoints,
    isDealer,
    winContext.isTsumo,
    honbaCount,
    riichiSticksOnTable,
  );

  const limitName = getLimitName(han, basePoints);
  const isMangan = basePoints >= 2000;

  return {
    yaku,
    han,
    fu,
    basePoints,
    dealerTsumoPayment: payment.dealerTsumoPayment,
    nonDealerTsumoPayment: payment.nonDealerTsumoPayment,
    ronPayment: payment.ronPayment,
    totalPoints: payment.totalPoints,
    isYakuman,
    isMangan,
    limitName,
  };
}
