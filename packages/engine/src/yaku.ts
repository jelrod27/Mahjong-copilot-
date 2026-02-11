import type {
  TileType,
  HandArray,
  HandGroup,
  HandParsing,
  Yaku,
  WinContext,
  WaitType,
  Meld,
  Wind,
} from './types.js';

// ── Tile classification helpers ──

/** Terminal tile types: 1m, 9m, 1p, 9p, 1s, 9s */
const TERMINALS: ReadonlySet<TileType> = new Set([0, 8, 9, 17, 18, 26]);

/** Honor tile types: East, South, West, North, Haku, Hatsu, Chun */
const HONORS: ReadonlySet<TileType> = new Set([27, 28, 29, 30, 31, 32, 33]);

/** Terminal or honor tile types */
const TERMINAL_OR_HONOR: ReadonlySet<TileType> = new Set([
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
]);

function isTerminal(t: TileType): boolean {
  return TERMINALS.has(t);
}

function isHonor(t: TileType): boolean {
  return HONORS.has(t);
}

function isTerminalOrHonor(t: TileType): boolean {
  return TERMINAL_OR_HONOR.has(t);
}

function isSuited(t: TileType): boolean {
  return t >= 0 && t <= 26;
}

function suitOf(t: TileType): number {
  return Math.floor(t / 9);
}

function valueOf(t: TileType): number {
  return (t % 9) + 1;
}

/** Dragon tile types: Haku=31, Hatsu=32, Chun=33 */
const DRAGON_TYPES: readonly TileType[] = [31, 32, 33];

/** Wind tile types: East=27, South=28, West=29, North=30 */
const WIND_TYPES: readonly TileType[] = [27, 28, 29, 30];

/** Green tiles for Ryuuiisou: 2s, 3s, 4s, 6s, 8s, Hatsu */
const GREEN_TILES: ReadonlySet<TileType> = new Set([19, 20, 21, 23, 25, 32]);

/** Wind enum value to tile type */
function windToTileType(wind: Wind): TileType {
  return 27 + (wind as number);
}

// ── Helper: check if a group contains a terminal or honor ──

function groupHasTerminalOrHonor(group: HandGroup): boolean {
  return group.tiles.some((t) => isTerminalOrHonor(t));
}

function groupHasTerminal(group: HandGroup): boolean {
  return group.tiles.some((t) => isTerminal(t));
}

/** Check if a triplet/kan group matches a specific tile type */
function isTripletOf(group: HandGroup, tileType: TileType): boolean {
  return (group.type === 'triplet' || group.type === 'kan') && group.tiles[0] === tileType;
}

/** Get all groups from parsing + open melds combined */
function getAllGroups(ctx: YakuCheckContext): HandGroup[] {
  const groups = [...ctx.parsing.groups];
  for (const meld of ctx.openMelds) {
    const tileTypes = meldToTileTypes(meld);
    if (meld.type === 'chi') {
      groups.push({ type: 'sequence', tiles: tileTypes.sort((a, b) => a - b), isOpen: true });
    } else if (meld.type === 'pon') {
      groups.push({ type: 'triplet', tiles: tileTypes, isOpen: true });
    } else if (meld.type === 'kan' || meld.type === 'addedKan') {
      groups.push({ type: 'kan', tiles: tileTypes, isOpen: true });
    } else if (meld.type === 'closedKan') {
      groups.push({ type: 'kan', tiles: tileTypes, isOpen: false });
    }
  }
  return groups;
}

/** Convert meld tile IDs to tile types (each TileId / 4 gives TileType, but we use the tile encoding) */
function meldToTileTypes(meld: Meld): TileType[] {
  // TileId 0-135 maps to TileType: Math.floor(tileId / 4)
  return meld.tiles.map((id) => Math.floor(id / 4));
}

// ── Yaku Definitions ──

export const YAKU = {
  // 1-han
  riichi: { name: 'Riichi', japaneseName: '立直', hanOpen: -1, hanClosed: 1, isYakuman: false },
  ippatsu: { name: 'Ippatsu', japaneseName: '一発', hanOpen: -1, hanClosed: 1, isYakuman: false },
  menzenTsumo: {
    name: 'Menzen Tsumo',
    japaneseName: '門前清自摸和',
    hanOpen: -1,
    hanClosed: 1,
    isYakuman: false,
  },
  tanyao: { name: 'Tanyao', japaneseName: '断幺九', hanOpen: 1, hanClosed: 1, isYakuman: false },
  pinfu: { name: 'Pinfu', japaneseName: '平和', hanOpen: -1, hanClosed: 1, isYakuman: false },
  iipeiko: { name: 'Iipeiko', japaneseName: '一盃口', hanOpen: -1, hanClosed: 1, isYakuman: false },
  yakuhaiHaku: {
    name: 'Yakuhai (Haku)',
    japaneseName: '役牌 白',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  yakuhaiHatsu: {
    name: 'Yakuhai (Hatsu)',
    japaneseName: '役牌 發',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  yakuhaiChun: {
    name: 'Yakuhai (Chun)',
    japaneseName: '役牌 中',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  yakuhaiSeatWind: {
    name: 'Seat Wind',
    japaneseName: '自風牌',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  yakuhaiRoundWind: {
    name: 'Round Wind',
    japaneseName: '場風牌',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  haitei: { name: 'Haitei', japaneseName: '海底摸月', hanOpen: 1, hanClosed: 1, isYakuman: false },
  houtei: {
    name: 'Houtei',
    japaneseName: '河底撈魚',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  rinshan: {
    name: 'Rinshan Kaihou',
    japaneseName: '嶺上開花',
    hanOpen: 1,
    hanClosed: 1,
    isYakuman: false,
  },
  chankan: { name: 'Chankan', japaneseName: '搶槓', hanOpen: 1, hanClosed: 1, isYakuman: false },

  // 2-han
  doubleRiichi: {
    name: 'Double Riichi',
    japaneseName: 'ダブル立直',
    hanOpen: -1,
    hanClosed: 2,
    isYakuman: false,
  },
  chanta: {
    name: 'Chanta',
    japaneseName: '混全帯幺九',
    hanOpen: 1,
    hanClosed: 2,
    isYakuman: false,
  },
  ittsu: {
    name: 'Ittsu',
    japaneseName: '一気通貫',
    hanOpen: 1,
    hanClosed: 2,
    isYakuman: false,
  },
  sanshokuDoujun: {
    name: 'Sanshoku Doujun',
    japaneseName: '三色同順',
    hanOpen: 1,
    hanClosed: 2,
    isYakuman: false,
  },
  sanshokuDoukou: {
    name: 'Sanshoku Doukou',
    japaneseName: '三色同刻',
    hanOpen: 2,
    hanClosed: 2,
    isYakuman: false,
  },
  toitoi: { name: 'Toitoi', japaneseName: '対々和', hanOpen: 2, hanClosed: 2, isYakuman: false },
  sanAnkou: {
    name: 'San Ankou',
    japaneseName: '三暗刻',
    hanOpen: 2,
    hanClosed: 2,
    isYakuman: false,
  },
  honroutou: {
    name: 'Honroutou',
    japaneseName: '混老頭',
    hanOpen: 2,
    hanClosed: 2,
    isYakuman: false,
  },
  shousangen: {
    name: 'Shousangen',
    japaneseName: '小三元',
    hanOpen: 2,
    hanClosed: 2,
    isYakuman: false,
  },
  chiitoitsu: {
    name: 'Chiitoitsu',
    japaneseName: '七対子',
    hanOpen: -1,
    hanClosed: 2,
    isYakuman: false,
  },

  // 3-han
  honitsu: {
    name: 'Honitsu',
    japaneseName: '混一色',
    hanOpen: 2,
    hanClosed: 3,
    isYakuman: false,
  },
  junchan: {
    name: 'Junchan',
    japaneseName: '純全帯幺九',
    hanOpen: 2,
    hanClosed: 3,
    isYakuman: false,
  },
  ryanpeiko: {
    name: 'Ryanpeiko',
    japaneseName: '二盃口',
    hanOpen: -1,
    hanClosed: 3,
    isYakuman: false,
  },

  // 6-han
  chinitsu: {
    name: 'Chinitsu',
    japaneseName: '清一色',
    hanOpen: 5,
    hanClosed: 6,
    isYakuman: false,
  },

  // Yakuman
  kokushi: {
    name: 'Kokushi Musou',
    japaneseName: '国士無双',
    hanOpen: -1,
    hanClosed: 13,
    isYakuman: true,
  },
  suuankou: {
    name: 'Suuankou',
    japaneseName: '四暗刻',
    hanOpen: -1,
    hanClosed: 13,
    isYakuman: true,
  },
  daisangen: {
    name: 'Daisangen',
    japaneseName: '大三元',
    hanOpen: 13,
    hanClosed: 13,
    isYakuman: true,
  },
  shousuushii: {
    name: 'Shousuushii',
    japaneseName: '小四喜',
    hanOpen: 13,
    hanClosed: 13,
    isYakuman: true,
  },
  daisuushii: {
    name: 'Daisuushii',
    japaneseName: '大四喜',
    hanOpen: 13,
    hanClosed: 13,
    isYakuman: true,
  },
  tsuuiisou: {
    name: 'Tsuuiisou',
    japaneseName: '字一色',
    hanOpen: 13,
    hanClosed: 13,
    isYakuman: true,
  },
  chinroutou: {
    name: 'Chinroutou',
    japaneseName: '清老頭',
    hanOpen: 13,
    hanClosed: 13,
    isYakuman: true,
  },
  ryuuiisou: {
    name: 'Ryuuiisou',
    japaneseName: '緑一色',
    hanOpen: 13,
    hanClosed: 13,
    isYakuman: true,
  },
  chuurenPoutou: {
    name: 'Chuuren Poutou',
    japaneseName: '九蓮宝燈',
    hanOpen: -1,
    hanClosed: 13,
    isYakuman: true,
  },
  tenhou: {
    name: 'Tenhou',
    japaneseName: '天和',
    hanOpen: -1,
    hanClosed: 13,
    isYakuman: true,
  },
  chiihou: {
    name: 'Chiihou',
    japaneseName: '地和',
    hanOpen: -1,
    hanClosed: 13,
    isYakuman: true,
  },
} as const satisfies Record<string, Yaku>;

// ── Yaku Check Context ──

/** Context passed to all yaku checkers */
export interface YakuCheckContext {
  parsing: HandParsing;
  closedHand: HandArray;
  allTiles: HandArray;
  openMelds: Meld[];
  closedKans: Meld[];
  winContext: WinContext;
  waitType: WaitType;
  isConcealed: boolean;
}

// ── 1-han Yaku Checkers ──

export function checkRiichi(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isRiichi && !ctx.winContext.isDoubleRiichi;
}

export function checkIppatsu(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isIppatsu;
}

export function checkMenzenTsumo(ctx: YakuCheckContext): boolean {
  return ctx.isConcealed && ctx.winContext.isTsumo;
}

export function checkTanyao(ctx: YakuCheckContext): boolean {
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0 && isTerminalOrHonor(t)) {
      return false;
    }
  }
  return true;
}

export function checkPinfu(ctx: YakuCheckContext): boolean {
  if (!ctx.isConcealed) return false;

  const { parsing, winContext, waitType } = ctx;

  // All groups must be sequences
  for (const group of parsing.groups) {
    if (group.type !== 'sequence') return false;
  }

  // Pair must not be yakuhai
  const pair = parsing.pair;
  // Check dragons
  if (DRAGON_TYPES.includes(pair)) return false;
  // Check seat wind
  if (pair === windToTileType(winContext.seatWind)) return false;
  // Check round wind
  if (pair === windToTileType(winContext.roundWind)) return false;

  // Wait must be ryanmen (open-ended / two-sided)
  if (waitType !== ('ryanmen' as WaitType)) return false;

  return true;
}

export function checkIipeiko(ctx: YakuCheckContext): boolean {
  if (!ctx.isConcealed) return false;

  const sequences = ctx.parsing.groups.filter((g) => g.type === 'sequence' && !g.isOpen);
  if (sequences.length < 2) return false;

  let pairCount = 0;
  const used = new Array(sequences.length).fill(false);

  for (let i = 0; i < sequences.length; i++) {
    if (used[i]) continue;
    for (let j = i + 1; j < sequences.length; j++) {
      if (used[j]) continue;
      if (
        sequences[i]!.tiles[0] === sequences[j]!.tiles[0] &&
        sequences[i]!.tiles[1] === sequences[j]!.tiles[1] &&
        sequences[i]!.tiles[2] === sequences[j]!.tiles[2]
      ) {
        pairCount++;
        used[i] = true;
        used[j] = true;
        break;
      }
    }
  }

  // Exactly 1 pair of identical sequences (not 2, that would be ryanpeiko)
  return pairCount === 1;
}

export function checkYakuhaiHaku(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  return allGroups.some((g) => isTripletOf(g, 31));
}

export function checkYakuhaiHatsu(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  return allGroups.some((g) => isTripletOf(g, 32));
}

export function checkYakuhaiChun(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  return allGroups.some((g) => isTripletOf(g, 33));
}

export function checkYakuhaiSeatWind(ctx: YakuCheckContext): boolean {
  const seatWindTile = windToTileType(ctx.winContext.seatWind);
  const allGroups = getAllGroups(ctx);
  return allGroups.some((g) => isTripletOf(g, seatWindTile));
}

export function checkYakuhaiRoundWind(ctx: YakuCheckContext): boolean {
  const roundWindTile = windToTileType(ctx.winContext.roundWind);
  const allGroups = getAllGroups(ctx);
  return allGroups.some((g) => isTripletOf(g, roundWindTile));
}

export function checkHaitei(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isLastTile && ctx.winContext.isTsumo;
}

export function checkHoutei(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isLastTile && !ctx.winContext.isTsumo;
}

export function checkRinshan(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isAfterKan && ctx.winContext.isTsumo;
}

export function checkChankan(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isRobbedKan;
}

// ── 2-han Yaku Checkers ──

export function checkDoubleRiichi(ctx: YakuCheckContext): boolean {
  return ctx.winContext.isDoubleRiichi;
}

export function checkChanta(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  if (allGroups.length === 0) return false;

  // Every group must contain a terminal or honor
  for (const group of allGroups) {
    if (!groupHasTerminalOrHonor(group)) return false;
  }

  // Pair must be terminal or honor
  if (!isTerminalOrHonor(ctx.parsing.pair)) return false;

  // Must have at least one honor (otherwise it's junchan)
  let hasHonor = isHonor(ctx.parsing.pair);
  if (!hasHonor) {
    for (const group of allGroups) {
      if (group.tiles.some((t) => isHonor(t))) {
        hasHonor = true;
        break;
      }
    }
  }
  if (!hasHonor) return false;

  // Must have at least one sequence (otherwise it might just be honroutou/toitoi)
  const hasSequence = allGroups.some((g) => g.type === 'sequence');
  if (!hasSequence) return false;

  return true;
}

export function checkIttsu(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  const sequences = allGroups.filter((g) => g.type === 'sequence');
  if (sequences.length < 3) return false;

  // Check each suit (0=man, 1=pin, 2=sou)
  for (let suit = 0; suit < 3; suit++) {
    const base = suit * 9;
    let has123 = false;
    let has456 = false;
    let has789 = false;

    for (const seq of sequences) {
      const first = seq.tiles[0];
      if (first === base + 0) has123 = true;      // 1-2-3
      if (first === base + 3) has456 = true;      // 4-5-6
      if (first === base + 6) has789 = true;      // 7-8-9
    }

    if (has123 && has456 && has789) return true;
  }

  return false;
}

export function checkSanshokuDoujun(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  const sequences = allGroups.filter((g) => g.type === 'sequence');
  if (sequences.length < 3) return false;

  // For each starting value (0-6 within suit), check if same sequence in all 3 suits
  for (let val = 0; val <= 6; val++) {
    let hasSuits = [false, false, false];
    for (const seq of sequences) {
      const first = seq.tiles[0]!;
      if (isSuited(first) && valueOf(first) === val + 1) {
        hasSuits[suitOf(first)] = true;
      }
    }
    if (hasSuits[0]! && hasSuits[1]! && hasSuits[2]!) return true;
  }

  return false;
}

export function checkSanshokuDoukou(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  const triplets = allGroups.filter((g) => g.type === 'triplet' || g.type === 'kan');
  if (triplets.length < 3) return false;

  // For each value 1-9, check if same triplet in all 3 suits
  for (let val = 1; val <= 9; val++) {
    let hasSuits = [false, false, false];
    for (const tri of triplets) {
      const t = tri.tiles[0]!;
      if (isSuited(t) && valueOf(t) === val) {
        hasSuits[suitOf(t)] = true;
      }
    }
    if (hasSuits[0]! && hasSuits[1]! && hasSuits[2]!) return true;
  }

  return false;
}

export function checkToitoi(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  // All 4 groups must be triplets or kans
  return (
    allGroups.length === 4 &&
    allGroups.every((g) => g.type === 'triplet' || g.type === 'kan')
  );
}

export function checkSanAnkou(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  const winningTileType = Math.floor(ctx.winContext.winningTile / 4);

  let concealedTripletCount = 0;

  for (const group of allGroups) {
    if (group.type !== 'triplet' && group.type !== 'kan') continue;
    if (group.isOpen) continue;

    // For kan type, closed kans are concealed
    if (group.type === 'kan') {
      concealedTripletCount++;
      continue;
    }

    // For a closed triplet completed by ron, it's NOT concealed
    // A triplet is completed by ron if: not tsumo, and the winning tile matches the triplet
    if (
      !ctx.winContext.isTsumo &&
      group.tiles[0] === winningTileType &&
      ctx.waitType !== ('tanki' as WaitType) // tanki means won on pair, not triplet
    ) {
      // This triplet was completed by ron - it's shanpon wait completing this triplet
      // Only skip if wait type is shanpon (waiting on this triplet)
      if (ctx.waitType === ('shanpon' as WaitType)) {
        // Ron on shanpon: the triplet completed by the ron tile is NOT concealed
        continue;
      }
    }

    concealedTripletCount++;
  }

  // Also count closed kans from the ctx.closedKans
  // (they should already be in allGroups from the parsing or as closed kan groups)
  // The closed kans from ctx.closedKans are added via getAllGroups

  return concealedTripletCount === 3;
}

export function checkHonroutou(ctx: YakuCheckContext): boolean {
  // All tiles must be terminals or honors
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0 && !isTerminalOrHonor(t)) {
      return false;
    }
  }
  // Must have both terminals and honors to be honroutou (not chinroutou or tsuuiisou)
  let hasTerminal = false;
  let hasHonor = false;
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0) {
      if (isTerminal(t)) hasTerminal = true;
      if (isHonor(t)) hasHonor = true;
    }
  }
  return hasTerminal && hasHonor;
}

export function checkShousangen(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);

  let dragonTriplets = 0;
  for (const dragon of DRAGON_TYPES) {
    if (allGroups.some((g) => isTripletOf(g, dragon))) {
      dragonTriplets++;
    }
  }

  const dragonPair = DRAGON_TYPES.includes(ctx.parsing.pair);

  return dragonTriplets === 2 && dragonPair;
}

export function checkChiitoitsu(ctx: YakuCheckContext): boolean {
  // Seven pairs: check directly from the closed hand
  // Must have exactly 7 distinct pairs
  let pairCount = 0;
  for (let t = 0; t < 34; t++) {
    if (ctx.closedHand[t]! === 2) {
      pairCount++;
    } else if (ctx.closedHand[t]! !== 0) {
      return false;
    }
  }
  return pairCount === 7 && ctx.openMelds.length === 0;
}

// ── 3-han Yaku Checkers ──

export function checkHonitsu(ctx: YakuCheckContext): boolean {
  // One suit + honors only
  let suitFound = -1;
  for (let t = 0; t < 27; t++) {
    if (ctx.allTiles[t]! > 0) {
      const s = suitOf(t);
      if (suitFound === -1) {
        suitFound = s;
      } else if (s !== suitFound) {
        return false;
      }
    }
  }

  // Must have at least one suited tile
  if (suitFound === -1) return false;

  // Must have at least one honor (otherwise it's chinitsu)
  let hasHonor = false;
  for (let t = 27; t < 34; t++) {
    if (ctx.allTiles[t]! > 0) {
      hasHonor = true;
      break;
    }
  }

  return hasHonor;
}

export function checkJunchan(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  if (allGroups.length === 0) return false;

  // Every group must contain a terminal (no honors)
  for (const group of allGroups) {
    if (!groupHasTerminal(group)) return false;
    // No honors allowed in the group
    if (group.tiles.some((t) => isHonor(t))) return false;
  }

  // Pair must be terminal (not honor)
  if (!isTerminal(ctx.parsing.pair)) return false;

  // Must have at least one sequence (otherwise it's chinroutou)
  const hasSequence = allGroups.some((g) => g.type === 'sequence');
  if (!hasSequence) return false;

  return true;
}

export function checkRyanpeiko(ctx: YakuCheckContext): boolean {
  if (!ctx.isConcealed) return false;

  const sequences = ctx.parsing.groups.filter((g) => g.type === 'sequence' && !g.isOpen);
  if (sequences.length < 4) return false;

  // Need 2 pairs of identical sequences (4 sequences forming 2 distinct pairs)
  let pairCount = 0;
  const used = new Array(sequences.length).fill(false);

  for (let i = 0; i < sequences.length; i++) {
    if (used[i]) continue;
    for (let j = i + 1; j < sequences.length; j++) {
      if (used[j]) continue;
      if (
        sequences[i]!.tiles[0] === sequences[j]!.tiles[0] &&
        sequences[i]!.tiles[1] === sequences[j]!.tiles[1] &&
        sequences[i]!.tiles[2] === sequences[j]!.tiles[2]
      ) {
        pairCount++;
        used[i] = true;
        used[j] = true;
        break;
      }
    }
  }

  return pairCount === 2;
}

// ── 6-han Yaku Checker ──

export function checkChinitsu(ctx: YakuCheckContext): boolean {
  // All tiles in one suit, no honors
  let suitFound = -1;
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0) {
      if (isHonor(t)) return false;
      const s = suitOf(t);
      if (suitFound === -1) {
        suitFound = s;
      } else if (s !== suitFound) {
        return false;
      }
    }
  }
  return suitFound !== -1;
}

// ── Yakuman Checkers ──

export function checkKokushi(ctx: YakuCheckContext): boolean {
  if (!ctx.isConcealed) return false;

  // Thirteen orphans: one of each terminal and honor, plus one duplicate
  const kokushiTiles: TileType[] = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

  let hasDuplicate = false;
  for (const t of kokushiTiles) {
    if (ctx.closedHand[t]! === 0) return false;
    if (ctx.closedHand[t]! === 2) hasDuplicate = true;
  }

  // Ensure total tile count is 14
  let total = 0;
  for (let t = 0; t < 34; t++) {
    total += ctx.closedHand[t]!;
  }
  if (total !== 14) return false;

  return hasDuplicate;
}

export function checkSuuankou(ctx: YakuCheckContext): boolean {
  if (!ctx.isConcealed) return false;

  const allGroups = getAllGroups(ctx);
  const winningTileType = Math.floor(ctx.winContext.winningTile / 4);

  let concealedTripletCount = 0;
  for (const group of allGroups) {
    if (group.type !== 'triplet' && group.type !== 'kan') continue;
    if (group.isOpen) continue;

    // For ron: a triplet completed by the winning tile on shanpon wait is NOT concealed
    if (
      !ctx.winContext.isTsumo &&
      group.tiles[0] === winningTileType &&
      ctx.waitType === ('shanpon' as WaitType)
    ) {
      continue;
    }

    concealedTripletCount++;
  }

  return concealedTripletCount === 4;
}

export function checkDaisangen(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  return DRAGON_TYPES.every((dragon) => allGroups.some((g) => isTripletOf(g, dragon)));
}

export function checkShousuushii(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);

  let windTriplets = 0;
  for (const wind of WIND_TYPES) {
    if (allGroups.some((g) => isTripletOf(g, wind))) {
      windTriplets++;
    }
  }

  const windPair = WIND_TYPES.includes(ctx.parsing.pair);

  return windTriplets === 3 && windPair;
}

export function checkDaisuushii(ctx: YakuCheckContext): boolean {
  const allGroups = getAllGroups(ctx);
  return WIND_TYPES.every((wind) => allGroups.some((g) => isTripletOf(g, wind)));
}

export function checkTsuuiisou(ctx: YakuCheckContext): boolean {
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0 && !isHonor(t)) {
      return false;
    }
  }
  // Must have at least some tiles
  return ctx.allTiles.some((count) => count > 0);
}

export function checkChinroutou(ctx: YakuCheckContext): boolean {
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0 && !isTerminal(t)) {
      return false;
    }
  }
  return ctx.allTiles.some((count) => count > 0);
}

export function checkRyuuiisou(ctx: YakuCheckContext): boolean {
  for (let t = 0; t < 34; t++) {
    if (ctx.allTiles[t]! > 0 && !GREEN_TILES.has(t)) {
      return false;
    }
  }
  return ctx.allTiles.some((count) => count > 0);
}

export function checkChuurenPoutou(ctx: YakuCheckContext): boolean {
  if (!ctx.isConcealed) return false;

  // Must be all one suit, no honors
  let suitFound = -1;
  for (let t = 0; t < 34; t++) {
    if (ctx.closedHand[t]! > 0) {
      if (isHonor(t)) return false;
      const s = suitOf(t);
      if (suitFound === -1) {
        suitFound = s;
      } else if (s !== suitFound) {
        return false;
      }
    }
  }

  if (suitFound === -1) return false;

  // Pattern: 1112345678999 + any tile of the suit
  // That means: tile values 1 and 9 must have >= 3, tiles 2-8 must have >= 1
  const base = suitFound * 9;
  // Check: 1(3+), 2(1+), 3(1+), 4(1+), 5(1+), 6(1+), 7(1+), 8(1+), 9(3+)
  const required = [3, 1, 1, 1, 1, 1, 1, 1, 3];
  for (let i = 0; i < 9; i++) {
    if (ctx.closedHand[base + i]! < required[i]!) return false;
  }

  // Total tiles should be 14
  let total = 0;
  for (let t = 0; t < 34; t++) {
    total += ctx.closedHand[t]!;
  }
  if (total !== 14) return false;

  return true;
}

export function checkTenhou(ctx: YakuCheckContext): boolean {
  // Dealer wins on very first draw (tsumo on first turn, must be dealer = East wind seat)
  return (
    ctx.winContext.isFirstTurn &&
    ctx.winContext.isTsumo &&
    ctx.winContext.seatWind === (0 as Wind) // East = dealer
  );
}

export function checkChiihou(ctx: YakuCheckContext): boolean {
  // Non-dealer wins on first turn (tsumo, before any calls)
  return (
    ctx.winContext.isFirstTurn &&
    ctx.winContext.isTsumo &&
    ctx.winContext.seatWind !== (0 as Wind)
  );
}

// ── Main Yaku Detection ──

interface YakuCheck {
  yaku: Yaku;
  checker: (ctx: YakuCheckContext) => boolean;
}

const YAKUMAN_CHECKS: YakuCheck[] = [
  { yaku: YAKU.kokushi, checker: checkKokushi },
  { yaku: YAKU.suuankou, checker: checkSuuankou },
  { yaku: YAKU.daisangen, checker: checkDaisangen },
  { yaku: YAKU.shousuushii, checker: checkShousuushii },
  { yaku: YAKU.daisuushii, checker: checkDaisuushii },
  { yaku: YAKU.tsuuiisou, checker: checkTsuuiisou },
  { yaku: YAKU.chinroutou, checker: checkChinroutou },
  { yaku: YAKU.ryuuiisou, checker: checkRyuuiisou },
  { yaku: YAKU.chuurenPoutou, checker: checkChuurenPoutou },
  { yaku: YAKU.tenhou, checker: checkTenhou },
  { yaku: YAKU.chiihou, checker: checkChiihou },
];

const REGULAR_CHECKS: YakuCheck[] = [
  // 1-han
  { yaku: YAKU.riichi, checker: checkRiichi },
  { yaku: YAKU.ippatsu, checker: checkIppatsu },
  { yaku: YAKU.menzenTsumo, checker: checkMenzenTsumo },
  { yaku: YAKU.tanyao, checker: checkTanyao },
  { yaku: YAKU.pinfu, checker: checkPinfu },
  { yaku: YAKU.iipeiko, checker: checkIipeiko },
  { yaku: YAKU.yakuhaiHaku, checker: checkYakuhaiHaku },
  { yaku: YAKU.yakuhaiHatsu, checker: checkYakuhaiHatsu },
  { yaku: YAKU.yakuhaiChun, checker: checkYakuhaiChun },
  { yaku: YAKU.yakuhaiSeatWind, checker: checkYakuhaiSeatWind },
  { yaku: YAKU.yakuhaiRoundWind, checker: checkYakuhaiRoundWind },
  { yaku: YAKU.haitei, checker: checkHaitei },
  { yaku: YAKU.houtei, checker: checkHoutei },
  { yaku: YAKU.rinshan, checker: checkRinshan },
  { yaku: YAKU.chankan, checker: checkChankan },
  // 2-han
  { yaku: YAKU.doubleRiichi, checker: checkDoubleRiichi },
  { yaku: YAKU.chanta, checker: checkChanta },
  { yaku: YAKU.ittsu, checker: checkIttsu },
  { yaku: YAKU.sanshokuDoujun, checker: checkSanshokuDoujun },
  { yaku: YAKU.sanshokuDoukou, checker: checkSanshokuDoukou },
  { yaku: YAKU.toitoi, checker: checkToitoi },
  { yaku: YAKU.sanAnkou, checker: checkSanAnkou },
  { yaku: YAKU.honroutou, checker: checkHonroutou },
  { yaku: YAKU.shousangen, checker: checkShousangen },
  { yaku: YAKU.chiitoitsu, checker: checkChiitoitsu },
  // 3-han
  { yaku: YAKU.honitsu, checker: checkHonitsu },
  { yaku: YAKU.junchan, checker: checkJunchan },
  { yaku: YAKU.ryanpeiko, checker: checkRyanpeiko },
  // 6-han
  { yaku: YAKU.chinitsu, checker: checkChinitsu },
];

/**
 * Find all applicable yaku for a winning hand.
 * Evaluates all yaku checkers against the given context.
 * Returns the list of matched yaku with correct han values (open vs closed).
 *
 * If yakuman is found, only return yakuman (they override everything).
 * If no yaku found, return empty array (hand cannot win).
 */
export function findYaku(ctx: YakuCheckContext): Yaku[] {
  // First check yakuman
  const yakumanResults: Yaku[] = [];
  for (const { yaku, checker } of YAKUMAN_CHECKS) {
    // Skip closed-only yakuman if hand is open
    if (!ctx.isConcealed && yaku.hanOpen === -1) continue;
    if (checker(ctx)) {
      yakumanResults.push(yaku);
    }
  }

  // If any yakuman found, only return yakuman
  if (yakumanResults.length > 0) {
    return yakumanResults;
  }

  // Check regular yaku
  const results: Yaku[] = [];
  for (const { yaku, checker } of REGULAR_CHECKS) {
    // Skip closed-only yaku if hand is open
    if (!ctx.isConcealed && yaku.hanOpen === -1) continue;
    if (checker(ctx)) {
      results.push(yaku);
    }
  }

  // Apply mutual exclusion rules:
  // Chanta and Junchan: if junchan present, remove chanta
  const hasJunchan = results.some((y) => y.name === YAKU.junchan.name);
  const hasChanta = results.some((y) => y.name === YAKU.chanta.name);
  if (hasJunchan && hasChanta) {
    const idx = results.findIndex((y) => y.name === YAKU.chanta.name);
    if (idx !== -1) results.splice(idx, 1);
  }

  // Honitsu and Chinitsu: if chinitsu present, remove honitsu
  const hasChinitsu = results.some((y) => y.name === YAKU.chinitsu.name);
  const hasHonitsu = results.some((y) => y.name === YAKU.honitsu.name);
  if (hasChinitsu && hasHonitsu) {
    const idx = results.findIndex((y) => y.name === YAKU.honitsu.name);
    if (idx !== -1) results.splice(idx, 1);
  }

  // Iipeiko and Ryanpeiko: if ryanpeiko present, remove iipeiko
  const hasRyanpeiko = results.some((y) => y.name === YAKU.ryanpeiko.name);
  const hasIipeiko = results.some((y) => y.name === YAKU.iipeiko.name);
  if (hasRyanpeiko && hasIipeiko) {
    const idx = results.findIndex((y) => y.name === YAKU.iipeiko.name);
    if (idx !== -1) results.splice(idx, 1);
  }

  // Double riichi supersedes riichi
  const hasDoubleRiichi = results.some((y) => y.name === YAKU.doubleRiichi.name);
  const hasRiichi = results.some((y) => y.name === YAKU.riichi.name);
  if (hasDoubleRiichi && hasRiichi) {
    const idx = results.findIndex((y) => y.name === YAKU.riichi.name);
    if (idx !== -1) results.splice(idx, 1);
  }

  return results;
}

/**
 * Calculate total han from yaku list.
 * Does NOT include dora (that's added separately in scoring).
 */
export function calculateHan(yaku: Yaku[], isConcealed: boolean): number {
  let total = 0;
  for (const y of yaku) {
    if (y.isYakuman) {
      total += 13;
    } else if (isConcealed) {
      total += y.hanClosed;
    } else {
      // hanOpen should not be -1 if hand is open (those yaku should have been filtered)
      total += y.hanOpen === -1 ? 0 : y.hanOpen;
    }
  }
  return total;
}
