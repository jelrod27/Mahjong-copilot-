import { describe, it, expect } from 'vitest';
import type {
  TileType,
  HandArray,
  HandGroup,
  HandParsing,
  WinContext,
  WaitType,
  Meld,
  Wind,
} from '../src/types.js';
import {
  YAKU,
  findYaku,
  calculateHan,
  checkRiichi,
  checkIppatsu,
  checkMenzenTsumo,
  checkTanyao,
  checkPinfu,
  checkIipeiko,
  checkYakuhaiHaku,
  checkYakuhaiHatsu,
  checkYakuhaiChun,
  checkYakuhaiSeatWind,
  checkYakuhaiRoundWind,
  checkHaitei,
  checkHoutei,
  checkRinshan,
  checkChankan,
  checkDoubleRiichi,
  checkChanta,
  checkIttsu,
  checkSanshokuDoujun,
  checkSanshokuDoukou,
  checkToitoi,
  checkSanAnkou,
  checkHonroutou,
  checkShousangen,
  checkChiitoitsu,
  checkHonitsu,
  checkJunchan,
  checkRyanpeiko,
  checkChinitsu,
  checkKokushi,
  checkSuuankou,
  checkDaisangen,
  checkShousuushii,
  checkDaisuushii,
  checkTsuuiisou,
  checkChinroutou,
  checkRyuuiisou,
  checkChuurenPoutou,
  checkTenhou,
  checkChiihou,
  type YakuCheckContext,
} from '../src/yaku.js';

// ── Test Helpers ──

function makeHand(...tiles: TileType[]): HandArray {
  const hand = new Array(34).fill(0);
  for (const t of tiles) hand[t]++;
  return hand;
}

function makeParsing(groups: HandGroup[], pair: TileType): HandParsing {
  return { groups, pair, isValid: true };
}

function seq(t1: TileType, t2: TileType, t3: TileType, open = false): HandGroup {
  return { type: 'sequence', tiles: [t1, t2, t3], isOpen: open };
}

function tri(t: TileType, open = false): HandGroup {
  return { type: 'triplet', tiles: [t, t, t], isOpen: open };
}

function kan(t: TileType, open = false): HandGroup {
  return { type: 'kan', tiles: [t, t, t, t], isOpen: open };
}

function pair(t: TileType): HandGroup {
  return { type: 'pair', tiles: [t, t], isOpen: false };
}

/** Default win context - concealed hand, tsumo, East seat, East round */
function defaultWinContext(overrides: Partial<WinContext> = {}): WinContext {
  return {
    winningTile: 0,
    isTsumo: true,
    isRiichi: false,
    isDoubleRiichi: false,
    isIppatsu: false,
    isFirstTurn: false,
    isLastTile: false,
    isAfterKan: false,
    isRobbedKan: false,
    seatWind: 0 as Wind,   // East
    roundWind: 0 as Wind,  // East
    doraCount: 0,
    uraDoraCount: 0,
    redDoraCount: 0,
    ...overrides,
  };
}

/** Build a full YakuCheckContext from parts */
function makeCtx(opts: {
  parsing?: HandParsing;
  closedHand?: HandArray;
  allTiles?: HandArray;
  openMelds?: Meld[];
  closedKans?: Meld[];
  winContext?: Partial<WinContext>;
  waitType?: WaitType;
  isConcealed?: boolean;
}): YakuCheckContext {
  const closedHand = opts.closedHand ?? new Array(34).fill(0);
  const allTiles = opts.allTiles ?? closedHand;
  return {
    parsing: opts.parsing ?? makeParsing([], 0),
    closedHand,
    allTiles,
    openMelds: opts.openMelds ?? [],
    closedKans: opts.closedKans ?? [],
    winContext: defaultWinContext(opts.winContext),
    waitType: opts.waitType ?? ('ryanmen' as WaitType),
    isConcealed: opts.isConcealed ?? true,
  };
}

// ── 1-han Yaku Tests ──

describe('Riichi', () => {
  it('should detect riichi', () => {
    const ctx = makeCtx({ winContext: { isRiichi: true } });
    expect(checkRiichi(ctx)).toBe(true);
  });

  it('should not detect riichi when not declared', () => {
    const ctx = makeCtx({ winContext: { isRiichi: false } });
    expect(checkRiichi(ctx)).toBe(false);
  });

  it('should not detect riichi when double riichi is declared', () => {
    const ctx = makeCtx({ winContext: { isRiichi: true, isDoubleRiichi: true } });
    expect(checkRiichi(ctx)).toBe(false);
  });
});

describe('Ippatsu', () => {
  it('should detect ippatsu', () => {
    const ctx = makeCtx({ winContext: { isIppatsu: true } });
    expect(checkIppatsu(ctx)).toBe(true);
  });

  it('should not detect ippatsu when not applicable', () => {
    const ctx = makeCtx({ winContext: { isIppatsu: false } });
    expect(checkIppatsu(ctx)).toBe(false);
  });
});

describe('Menzen Tsumo', () => {
  it('should detect menzen tsumo for concealed tsumo win', () => {
    const ctx = makeCtx({ isConcealed: true, winContext: { isTsumo: true } });
    expect(checkMenzenTsumo(ctx)).toBe(true);
  });

  it('should not detect menzen tsumo for ron', () => {
    const ctx = makeCtx({ isConcealed: true, winContext: { isTsumo: false } });
    expect(checkMenzenTsumo(ctx)).toBe(false);
  });

  it('should not detect menzen tsumo for open hand', () => {
    const ctx = makeCtx({ isConcealed: false, winContext: { isTsumo: true } });
    expect(checkMenzenTsumo(ctx)).toBe(false);
  });
});

describe('Tanyao', () => {
  it('should detect tanyao with all simples', () => {
    // All tiles are 2-8 of some suit
    // 2m 2m 2m 3m 4m 5m 5p 6p 7p 3s 4s 5s 6s 6s
    const allTiles = makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 20, 21, 22, 23, 23);
    const ctx = makeCtx({
      allTiles,
      closedHand: allTiles,
      parsing: makeParsing(
        [tri(1), seq(2, 3, 4), seq(13, 14, 15), seq(20, 21, 22)],
        23,
      ),
    });
    expect(checkTanyao(ctx)).toBe(true);
  });

  it('should not detect tanyao with a terminal (1m)', () => {
    const allTiles = makeHand(0, 0, 0, 1, 2, 3, 13, 14, 15, 20, 21, 22, 23, 23);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkTanyao(ctx)).toBe(false);
  });

  it('should not detect tanyao with a terminal (9s)', () => {
    const allTiles = makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 20, 21, 26, 26, 26);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkTanyao(ctx)).toBe(false);
  });

  it('should not detect tanyao with an honor', () => {
    const allTiles = makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 20, 21, 22, 27, 27);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkTanyao(ctx)).toBe(false);
  });

  it('should detect tanyao even when open (kuitan)', () => {
    const allTiles = makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 20, 21, 22, 23, 23);
    const ctx = makeCtx({
      allTiles,
      closedHand: makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 23, 23),
      isConcealed: false,
      openMelds: [{ type: 'chi', tiles: [80, 84, 88], calledFrom: 3 }], // 3s 4s 5s
    });
    expect(checkTanyao(ctx)).toBe(true);
  });
});

describe('Pinfu', () => {
  it('should detect pinfu with all sequences, non-yakuhai pair, ryanmen wait', () => {
    // 1m2m3m 4m5m6m 1p2p3p 4p5p6p pair:8s
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        25, // 8s - not yakuhai
      ),
      isConcealed: true,
      waitType: 'ryanmen' as WaitType,
      winContext: { seatWind: 0 as Wind, roundWind: 0 as Wind },
    });
    expect(checkPinfu(ctx)).toBe(true);
  });

  it('should not detect pinfu with a triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(1), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      isConcealed: true,
      waitType: 'ryanmen' as WaitType,
    });
    expect(checkPinfu(ctx)).toBe(false);
  });

  it('should not detect pinfu with dragon pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        31, // Haku - dragon
      ),
      isConcealed: true,
      waitType: 'ryanmen' as WaitType,
    });
    expect(checkPinfu(ctx)).toBe(false);
  });

  it('should not detect pinfu with seat wind pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        27, // East wind = seat wind
      ),
      isConcealed: true,
      waitType: 'ryanmen' as WaitType,
      winContext: { seatWind: 0 as Wind }, // East
    });
    expect(checkPinfu(ctx)).toBe(false);
  });

  it('should not detect pinfu with kanchan wait', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      isConcealed: true,
      waitType: 'kanchan' as WaitType,
    });
    expect(checkPinfu(ctx)).toBe(false);
  });

  it('should not detect pinfu when open', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      isConcealed: false,
      waitType: 'ryanmen' as WaitType,
    });
    expect(checkPinfu(ctx)).toBe(false);
  });

  it('should allow non-seat, non-round wind pair', () => {
    // Seat wind = East, Round wind = East, pair = West (29)
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        29, // West wind - not seat wind or round wind
      ),
      isConcealed: true,
      waitType: 'ryanmen' as WaitType,
      winContext: { seatWind: 0 as Wind, roundWind: 0 as Wind },
    });
    expect(checkPinfu(ctx)).toBe(true);
  });
});

describe('Iipeiko', () => {
  it('should detect iipeiko with two identical sequences', () => {
    // Two 1m2m3m sequences
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      isConcealed: true,
    });
    expect(checkIipeiko(ctx)).toBe(true);
  });

  it('should not detect iipeiko when open', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      isConcealed: false,
    });
    expect(checkIipeiko(ctx)).toBe(false);
  });

  it('should not detect iipeiko with no identical sequences', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      isConcealed: true,
    });
    expect(checkIipeiko(ctx)).toBe(false);
  });

  it('should not detect iipeiko when it is actually ryanpeiko', () => {
    // Two pairs of identical sequences: 1m2m3m x2, 4m5m6m x2
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(3, 4, 5), seq(3, 4, 5)],
        25,
      ),
      isConcealed: true,
    });
    // iipeiko counts exactly 1 pair, ryanpeiko would have 2
    // With our implementation, iipeiko finds pairCount=2, so returns false
    // (since it checks pairCount === 1)
    expect(checkIipeiko(ctx)).toBe(false);
  });
});

describe('Yakuhai', () => {
  it('should detect Haku triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
    });
    expect(checkYakuhaiHaku(ctx)).toBe(true);
  });

  it('should not detect Haku without triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(32), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        31, // Haku as pair, not triplet
      ),
    });
    expect(checkYakuhaiHaku(ctx)).toBe(false);
  });

  it('should detect Hatsu triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(32), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
    });
    expect(checkYakuhaiHatsu(ctx)).toBe(true);
  });

  it('should not detect Hatsu without triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
    });
    expect(checkYakuhaiHatsu(ctx)).toBe(false);
  });

  it('should detect Chun triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(33), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
    });
    expect(checkYakuhaiChun(ctx)).toBe(true);
  });

  it('should not detect Chun without triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
    });
    expect(checkYakuhaiChun(ctx)).toBe(false);
  });

  it('should detect seat wind triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(28), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      winContext: { seatWind: 1 as Wind }, // South = 28
    });
    expect(checkYakuhaiSeatWind(ctx)).toBe(true);
  });

  it('should not detect seat wind when triplet is different wind', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(28), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)], // South triplet
        25,
      ),
      winContext: { seatWind: 0 as Wind }, // East
    });
    expect(checkYakuhaiSeatWind(ctx)).toBe(false);
  });

  it('should detect round wind triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      winContext: { roundWind: 0 as Wind }, // East = 27
    });
    expect(checkYakuhaiRoundWind(ctx)).toBe(true);
  });

  it('should not detect round wind when triplet is different wind', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(28), seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)], // South triplet
        25,
      ),
      winContext: { roundWind: 0 as Wind }, // East
    });
    expect(checkYakuhaiRoundWind(ctx)).toBe(false);
  });

  it('should detect yakuhai from open melds', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      openMelds: [
        { type: 'pon', tiles: [124, 125, 126] }, // Haku (TileId/4 = 31)
      ],
      isConcealed: false,
    });
    expect(checkYakuhaiHaku(ctx)).toBe(true);
  });
});

describe('Haitei', () => {
  it('should detect haitei (last tile tsumo)', () => {
    const ctx = makeCtx({ winContext: { isLastTile: true, isTsumo: true } });
    expect(checkHaitei(ctx)).toBe(true);
  });

  it('should not detect haitei on ron', () => {
    const ctx = makeCtx({ winContext: { isLastTile: true, isTsumo: false } });
    expect(checkHaitei(ctx)).toBe(false);
  });

  it('should not detect haitei when not last tile', () => {
    const ctx = makeCtx({ winContext: { isLastTile: false, isTsumo: true } });
    expect(checkHaitei(ctx)).toBe(false);
  });
});

describe('Houtei', () => {
  it('should detect houtei (last tile ron)', () => {
    const ctx = makeCtx({ winContext: { isLastTile: true, isTsumo: false } });
    expect(checkHoutei(ctx)).toBe(true);
  });

  it('should not detect houtei on tsumo', () => {
    const ctx = makeCtx({ winContext: { isLastTile: true, isTsumo: true } });
    expect(checkHoutei(ctx)).toBe(false);
  });

  it('should not detect houtei when not last tile', () => {
    const ctx = makeCtx({ winContext: { isLastTile: false, isTsumo: false } });
    expect(checkHoutei(ctx)).toBe(false);
  });
});

describe('Rinshan Kaihou', () => {
  it('should detect rinshan (after kan, tsumo)', () => {
    const ctx = makeCtx({ winContext: { isAfterKan: true, isTsumo: true } });
    expect(checkRinshan(ctx)).toBe(true);
  });

  it('should not detect rinshan without kan', () => {
    const ctx = makeCtx({ winContext: { isAfterKan: false, isTsumo: true } });
    expect(checkRinshan(ctx)).toBe(false);
  });

  it('should not detect rinshan on ron', () => {
    const ctx = makeCtx({ winContext: { isAfterKan: true, isTsumo: false } });
    expect(checkRinshan(ctx)).toBe(false);
  });
});

describe('Chankan', () => {
  it('should detect chankan (robbed kan)', () => {
    const ctx = makeCtx({ winContext: { isRobbedKan: true } });
    expect(checkChankan(ctx)).toBe(true);
  });

  it('should not detect chankan without robbed kan', () => {
    const ctx = makeCtx({ winContext: { isRobbedKan: false } });
    expect(checkChankan(ctx)).toBe(false);
  });
});

// ── 2-han Yaku Tests ──

describe('Double Riichi', () => {
  it('should detect double riichi', () => {
    const ctx = makeCtx({ winContext: { isDoubleRiichi: true } });
    expect(checkDoubleRiichi(ctx)).toBe(true);
  });

  it('should not detect double riichi when not declared', () => {
    const ctx = makeCtx({ winContext: { isDoubleRiichi: false } });
    expect(checkDoubleRiichi(ctx)).toBe(false);
  });
});

describe('Chanta', () => {
  it('should detect chanta with terminals/honors in every group and pair', () => {
    // 1m2m3m 7m8m9m EEE NNN pair:Haku
    const allTiles = makeHand(0, 1, 2, 6, 7, 8, 27, 27, 27, 30, 30, 30, 31, 31);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(6, 7, 8), tri(27), tri(30)],
        31,
      ),
      allTiles,
      closedHand: allTiles,
    });
    expect(checkChanta(ctx)).toBe(true);
  });

  it('should not detect chanta when a group has no terminal/honor', () => {
    // 1m2m3m 4m5m6m EEE SSS pair:Haku
    const allTiles = makeHand(0, 1, 2, 3, 4, 5, 27, 27, 27, 28, 28, 28, 31, 31);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), tri(27), tri(28)],
        31,
      ),
      allTiles,
      closedHand: allTiles,
    });
    // 4m5m6m has no terminal or honor
    expect(checkChanta(ctx)).toBe(false);
  });

  it('should not detect chanta when no honors (that is junchan)', () => {
    // 1m2m3m 7m8m9m 1p2p3p 7p8p9p pair:1s
    const allTiles = makeHand(0, 1, 2, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 18);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(6, 7, 8), seq(9, 10, 11), seq(15, 16, 17)],
        18,
      ),
      allTiles,
      closedHand: allTiles,
    });
    expect(checkChanta(ctx)).toBe(false);
  });

  it('should not detect chanta for all-triplets hand (no sequences)', () => {
    // 1m1m1m 9m9m9m EEE NNN pair:Haku
    const allTiles = makeHand(0, 0, 0, 8, 8, 8, 27, 27, 27, 30, 30, 30, 31, 31);
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(8), tri(27), tri(30)],
        31,
      ),
      allTiles,
      closedHand: allTiles,
    });
    // All groups have terminal/honor but no sequence => not chanta (it would be honroutou)
    expect(checkChanta(ctx)).toBe(false);
  });
});

describe('Ittsu', () => {
  it('should detect ittsu with 1-2-3, 4-5-6, 7-8-9 of same suit', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(6, 7, 8), tri(27)],
        25,
      ),
    });
    expect(checkIttsu(ctx)).toBe(true);
  });

  it('should detect ittsu in pin suit', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(9, 10, 11), seq(12, 13, 14), seq(15, 16, 17), tri(27)],
        25,
      ),
    });
    expect(checkIttsu(ctx)).toBe(true);
  });

  it('should not detect ittsu with incomplete straight', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), tri(27)],
        25,
      ),
    });
    expect(checkIttsu(ctx)).toBe(false);
  });

  it('should not detect ittsu across different suits', () => {
    // 1m2m3m 4p5p6p 7s8s9s - different suits
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(12, 13, 14), seq(24, 25, 26), tri(27)],
        31,
      ),
    });
    expect(checkIttsu(ctx)).toBe(false);
  });
});

describe('Sanshoku Doujun', () => {
  it('should detect sanshoku doujun (same sequence in 3 suits)', () => {
    // 1m2m3m 1p2p3p 1s2s3s
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(9, 10, 11), seq(18, 19, 20), tri(27)],
        25,
      ),
    });
    expect(checkSanshokuDoujun(ctx)).toBe(true);
  });

  it('should detect sanshoku doujun with 4-5-6', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(3, 4, 5), seq(12, 13, 14), seq(21, 22, 23), tri(27)],
        25,
      ),
    });
    expect(checkSanshokuDoujun(ctx)).toBe(true);
  });

  it('should not detect sanshoku doujun with only 2 suits', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(9, 10, 11), seq(3, 4, 5), tri(27)],
        25,
      ),
    });
    expect(checkSanshokuDoujun(ctx)).toBe(false);
  });

  it('should not detect sanshoku doujun with different values', () => {
    // 1m2m3m 2p3p4p 3s4s5s - different starting values
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(10, 11, 12), seq(20, 21, 22), tri(27)],
        25,
      ),
    });
    expect(checkSanshokuDoujun(ctx)).toBe(false);
  });
});

describe('Sanshoku Doukou', () => {
  it('should detect sanshoku doukou (same triplet in 3 suits)', () => {
    // 1m1m1m 1p1p1p 1s1s1s
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), seq(3, 4, 5)],
        25,
      ),
    });
    expect(checkSanshokuDoukou(ctx)).toBe(true);
  });

  it('should not detect sanshoku doukou with only 2 suits', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(27), seq(3, 4, 5)],
        25,
      ),
    });
    expect(checkSanshokuDoukou(ctx)).toBe(false);
  });

  it('should not detect sanshoku doukou with different values', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(10), tri(20), seq(3, 4, 5)],
        25,
      ),
    });
    expect(checkSanshokuDoukou(ctx)).toBe(false);
  });
});

describe('Toitoi', () => {
  it('should detect toitoi with all triplets', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), tri(27)],
        31,
      ),
    });
    expect(checkToitoi(ctx)).toBe(true);
  });

  it('should detect toitoi with kan', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), kan(27)],
        31,
      ),
    });
    expect(checkToitoi(ctx)).toBe(true);
  });

  it('should not detect toitoi with a sequence', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), seq(3, 4, 5)],
        31,
      ),
    });
    expect(checkToitoi(ctx)).toBe(false);
  });

  it('should not detect toitoi with fewer than 4 groups', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18)],
        31,
      ),
    });
    expect(checkToitoi(ctx)).toBe(false);
  });
});

describe('San Ankou', () => {
  it('should detect san ankou with 3 concealed triplets on tsumo', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), seq(3, 4, 5)],
        25,
      ),
      winContext: { isTsumo: true },
      isConcealed: true,
    });
    expect(checkSanAnkou(ctx)).toBe(true);
  });

  it('should detect san ankou with 3 closed + 1 open triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), tri(27, true)],
        25,
      ),
      winContext: { isTsumo: true },
      isConcealed: false,
      openMelds: [],
    });
    expect(checkSanAnkou(ctx)).toBe(true);
  });

  it('should not detect san ankou with only 2 concealed triplets', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18, true), seq(3, 4, 5)],
        25,
      ),
      winContext: { isTsumo: true },
    });
    expect(checkSanAnkou(ctx)).toBe(false);
  });

  it('should not count triplet completed by ron on shanpon as concealed', () => {
    // Won by ron on tile type 18 with shanpon wait
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), seq(3, 4, 5)],
        25,
      ),
      winContext: { isTsumo: false, winningTile: 72 }, // TileId 72 / 4 = 18
      waitType: 'shanpon' as WaitType,
    });
    // tri(18) was completed by ron on shanpon, so NOT concealed
    // Only 2 concealed triplets (0, 9)
    expect(checkSanAnkou(ctx)).toBe(false);
  });
});

describe('Honroutou', () => {
  it('should detect honroutou with terminals and honors', () => {
    // 1m1m1m 9m9m9m EEE NNN pair:Haku
    const allTiles = makeHand(0, 0, 0, 8, 8, 8, 27, 27, 27, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonroutou(ctx)).toBe(true);
  });

  it('should not detect honroutou with simples', () => {
    const allTiles = makeHand(0, 0, 0, 1, 1, 1, 27, 27, 27, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonroutou(ctx)).toBe(false);
  });

  it('should not detect honroutou with only terminals (that is chinroutou)', () => {
    const allTiles = makeHand(0, 0, 0, 8, 8, 8, 9, 9, 9, 17, 17, 17, 18, 18);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonroutou(ctx)).toBe(false);
  });

  it('should not detect honroutou with only honors (that is tsuuiisou)', () => {
    const allTiles = makeHand(27, 27, 27, 28, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonroutou(ctx)).toBe(false);
  });
});

describe('Shousangen', () => {
  it('should detect shousangen (2 dragon triplets + dragon pair)', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), seq(0, 1, 2), seq(9, 10, 11)],
        33, // Chun pair
      ),
    });
    expect(checkShousangen(ctx)).toBe(true);
  });

  it('should not detect shousangen with 3 dragon triplets (that is daisangen)', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), tri(33), seq(0, 1, 2)],
        25,
      ),
    });
    expect(checkShousangen(ctx)).toBe(false);
  });

  it('should not detect shousangen with only 1 dragon triplet + dragon pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(27), seq(0, 1, 2), seq(9, 10, 11)],
        33, // Chun pair
      ),
    });
    expect(checkShousangen(ctx)).toBe(false);
  });

  it('should not detect shousangen without dragon pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), seq(0, 1, 2), seq(9, 10, 11)],
        25, // Non-dragon pair
      ),
    });
    expect(checkShousangen(ctx)).toBe(false);
  });
});

describe('Chiitoitsu', () => {
  it('should detect chiitoitsu with 7 pairs', () => {
    const closedHand = makeHand(0, 0, 1, 1, 9, 9, 18, 18, 27, 27, 31, 31, 33, 33);
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      openMelds: [],
    });
    expect(checkChiitoitsu(ctx)).toBe(true);
  });

  it('should not detect chiitoitsu with a triplet', () => {
    // 6 pairs + a triplet does not give exactly 7 pairs of 2
    const closedHand = makeHand(0, 0, 1, 1, 9, 9, 18, 18, 27, 27, 31, 31, 33, 33, 33);
    // This has 33 appearing 3 times, 31 appearing 2, etc.
    // Actually let me be more careful
    const hand = new Array(34).fill(0);
    hand[0] = 2; hand[1] = 2; hand[9] = 2; hand[18] = 2; hand[27] = 2; hand[31] = 2;
    hand[33] = 3; // a triplet
    const ctx = makeCtx({
      closedHand: hand,
      allTiles: hand,
      openMelds: [],
    });
    expect(checkChiitoitsu(ctx)).toBe(false);
  });

  it('should not detect chiitoitsu with open melds', () => {
    const closedHand = makeHand(0, 0, 1, 1, 9, 9, 18, 18, 27, 27);
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      openMelds: [{ type: 'pon', tiles: [124, 125, 126] }],
    });
    expect(checkChiitoitsu(ctx)).toBe(false);
  });

  it('should not detect chiitoitsu with only 6 pairs', () => {
    const hand = new Array(34).fill(0);
    hand[0] = 2; hand[1] = 2; hand[9] = 2; hand[18] = 2; hand[27] = 2; hand[31] = 2;
    const ctx = makeCtx({
      closedHand: hand,
      allTiles: hand,
      openMelds: [],
    });
    expect(checkChiitoitsu(ctx)).toBe(false);
  });
});

// ── 3-han Yaku Tests ──

describe('Honitsu', () => {
  it('should detect honitsu with one suit + honors', () => {
    // All man tiles + honors
    const allTiles = makeHand(0, 1, 2, 3, 4, 5, 6, 7, 8, 27, 27, 27, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonitsu(ctx)).toBe(true);
  });

  it('should not detect honitsu with two suits', () => {
    const allTiles = makeHand(0, 1, 2, 9, 10, 11, 3, 4, 5, 27, 27, 27, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonitsu(ctx)).toBe(false);
  });

  it('should not detect honitsu with one suit only (no honors = chinitsu)', () => {
    const allTiles = makeHand(0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 8, 8);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonitsu(ctx)).toBe(false);
  });

  it('should not detect honitsu with honors only (no suited tiles)', () => {
    const allTiles = makeHand(27, 27, 27, 28, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkHonitsu(ctx)).toBe(false);
  });
});

describe('Junchan', () => {
  it('should detect junchan with terminals in every group, no honors', () => {
    // 1m2m3m 7m8m9m 1p2p3p 7s8s9s pair:1s
    const allTiles = makeHand(0, 1, 2, 6, 7, 8, 9, 10, 11, 24, 25, 26, 18, 18);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(6, 7, 8), seq(9, 10, 11), seq(24, 25, 26)],
        18,
      ),
      allTiles,
      closedHand: allTiles,
    });
    expect(checkJunchan(ctx)).toBe(true);
  });

  it('should not detect junchan with honors', () => {
    // 1m2m3m 7m8m9m EEE NNN pair:1s
    const allTiles = makeHand(0, 1, 2, 6, 7, 8, 27, 27, 27, 30, 30, 30, 18, 18);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(6, 7, 8), tri(27), tri(30)],
        18,
      ),
      allTiles,
      closedHand: allTiles,
    });
    expect(checkJunchan(ctx)).toBe(false);
  });

  it('should not detect junchan when pair is not terminal', () => {
    const allTiles = makeHand(0, 1, 2, 6, 7, 8, 9, 10, 11, 24, 25, 26, 22, 22);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(6, 7, 8), seq(9, 10, 11), seq(24, 25, 26)],
        22, // 5s - not terminal
      ),
      allTiles,
      closedHand: allTiles,
    });
    expect(checkJunchan(ctx)).toBe(false);
  });

  it('should not detect junchan with only triplets (that is chinroutou territory)', () => {
    const allTiles = makeHand(0, 0, 0, 8, 8, 8, 9, 9, 9, 17, 17, 17, 18, 18);
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(8), tri(9), tri(17)],
        18,
      ),
      allTiles,
      closedHand: allTiles,
    });
    expect(checkJunchan(ctx)).toBe(false);
  });
});

describe('Ryanpeiko', () => {
  it('should detect ryanpeiko with 2 pairs of identical sequences', () => {
    // 1m2m3m 1m2m3m 4p5p6p 4p5p6p pair:8s
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(12, 13, 14), seq(12, 13, 14)],
        25,
      ),
      isConcealed: true,
    });
    expect(checkRyanpeiko(ctx)).toBe(true);
  });

  it('should not detect ryanpeiko when open', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(12, 13, 14), seq(12, 13, 14)],
        25,
      ),
      isConcealed: false,
    });
    expect(checkRyanpeiko(ctx)).toBe(false);
  });

  it('should not detect ryanpeiko with only 1 pair of identical sequences', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(12, 13, 14), seq(3, 4, 5)],
        25,
      ),
      isConcealed: true,
    });
    expect(checkRyanpeiko(ctx)).toBe(false);
  });

  it('should not detect ryanpeiko with fewer than 4 sequences', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), tri(27), seq(12, 13, 14)],
        25,
      ),
      isConcealed: true,
    });
    expect(checkRyanpeiko(ctx)).toBe(false);
  });
});

// ── 6-han Yaku Tests ──

describe('Chinitsu', () => {
  it('should detect chinitsu with all one suit, no honors', () => {
    // All man tiles
    const allTiles = makeHand(0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 8, 8);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinitsu(ctx)).toBe(true);
  });

  it('should detect chinitsu in pin suit', () => {
    const allTiles = makeHand(9, 9, 9, 10, 11, 12, 13, 14, 15, 16, 16, 16, 17, 17);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinitsu(ctx)).toBe(true);
  });

  it('should not detect chinitsu with mixed suits', () => {
    const allTiles = makeHand(0, 0, 0, 1, 2, 3, 9, 10, 11, 7, 7, 7, 8, 8);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinitsu(ctx)).toBe(false);
  });

  it('should not detect chinitsu with honors (that is honitsu)', () => {
    const allTiles = makeHand(0, 0, 0, 1, 2, 3, 4, 5, 6, 27, 27, 27, 8, 8);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinitsu(ctx)).toBe(false);
  });
});

// ── Yakuman Tests ──

describe('Kokushi Musou', () => {
  it('should detect kokushi with all 13 orphans + one duplicate', () => {
    // 1m 9m 1p 9p 1s 9s E S W N Haku Hatsu Chun + duplicate 1m
    const closedHand = makeHand(0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 0);
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkKokushi(ctx)).toBe(true);
  });

  it('should detect kokushi with duplicate on Chun', () => {
    const closedHand = makeHand(0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 33);
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkKokushi(ctx)).toBe(true);
  });

  it('should not detect kokushi with missing orphan', () => {
    // Missing Chun(33), extra 1m
    const closedHand = makeHand(0, 0, 0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32);
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkKokushi(ctx)).toBe(false);
  });

  it('should not detect kokushi when open', () => {
    const closedHand = makeHand(0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33, 0);
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: false,
    });
    expect(checkKokushi(ctx)).toBe(false);
  });
});

describe('Suuankou', () => {
  it('should detect suuankou with 4 concealed triplets on tsumo', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), tri(27)],
        31,
      ),
      isConcealed: true,
      winContext: { isTsumo: true },
    });
    expect(checkSuuankou(ctx)).toBe(true);
  });

  it('should detect suuankou by ron on tanki wait (pair completion)', () => {
    // Ron on the pair tile (tanki), so all 4 triplets were already concealed
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), tri(27)],
        31,
      ),
      isConcealed: true,
      winContext: { isTsumo: false, winningTile: 124 }, // Haku (31*4=124)
      waitType: 'tanki' as WaitType,
    });
    expect(checkSuuankou(ctx)).toBe(true);
  });

  it('should not detect suuankou by ron on shanpon (triplet completion)', () => {
    // Ron on tile type 27 with shanpon wait
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), tri(27)],
        31,
      ),
      isConcealed: true,
      winContext: { isTsumo: false, winningTile: 108 }, // East (27*4=108)
      waitType: 'shanpon' as WaitType,
    });
    // The East triplet was completed by ron on shanpon, not concealed
    expect(checkSuuankou(ctx)).toBe(false);
  });

  it('should not detect suuankou when open', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), tri(9), tri(18), tri(27)],
        31,
      ),
      isConcealed: false,
    });
    expect(checkSuuankou(ctx)).toBe(false);
  });
});

describe('Daisangen', () => {
  it('should detect daisangen with 3 dragon triplets', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), tri(33), seq(0, 1, 2)],
        25,
      ),
    });
    expect(checkDaisangen(ctx)).toBe(true);
  });

  it('should detect daisangen with dragon kan', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), kan(33), seq(0, 1, 2)],
        25,
      ),
    });
    expect(checkDaisangen(ctx)).toBe(true);
  });

  it('should not detect daisangen with only 2 dragon triplets', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), tri(27), seq(0, 1, 2)],
        33,
      ),
    });
    expect(checkDaisangen(ctx)).toBe(false);
  });

  it('should not detect daisangen with dragon pair instead of triplet', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), seq(0, 1, 2), seq(9, 10, 11)],
        33, // Chun as pair
      ),
    });
    expect(checkDaisangen(ctx)).toBe(false);
  });
});

describe('Shousuushii', () => {
  it('should detect shousuushii with 3 wind triplets + wind pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(29), seq(0, 1, 2)],
        30, // North pair
      ),
    });
    expect(checkShousuushii(ctx)).toBe(true);
  });

  it('should not detect shousuushii with 4 wind triplets (that is daisuushii)', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(29), tri(30)],
        31,
      ),
    });
    expect(checkShousuushii(ctx)).toBe(false);
  });

  it('should not detect shousuushii with 2 wind triplets + wind pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(31), seq(0, 1, 2)],
        29,
      ),
    });
    expect(checkShousuushii(ctx)).toBe(false);
  });

  it('should not detect shousuushii without wind pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(29), seq(0, 1, 2)],
        31, // Haku pair, not wind
      ),
    });
    expect(checkShousuushii(ctx)).toBe(false);
  });
});

describe('Daisuushii', () => {
  it('should detect daisuushii with 4 wind triplets', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(29), tri(30)],
        31,
      ),
    });
    expect(checkDaisuushii(ctx)).toBe(true);
  });

  it('should detect daisuushii with wind kans', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), kan(28), tri(29), tri(30)],
        31,
      ),
    });
    expect(checkDaisuushii(ctx)).toBe(true);
  });

  it('should not detect daisuushii with only 3 wind triplets', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(29), seq(0, 1, 2)],
        30,
      ),
    });
    expect(checkDaisuushii(ctx)).toBe(false);
  });

  it('should not detect daisuushii when wind is only pair', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(27), tri(28), tri(29), tri(31)],
        30, // North as pair
      ),
    });
    expect(checkDaisuushii(ctx)).toBe(false);
  });
});

describe('Tsuuiisou', () => {
  it('should detect tsuuiisou with all honors', () => {
    const allTiles = makeHand(27, 27, 27, 28, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkTsuuiisou(ctx)).toBe(true);
  });

  it('should not detect tsuuiisou with any suited tile', () => {
    const allTiles = makeHand(0, 27, 27, 28, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkTsuuiisou(ctx)).toBe(false);
  });

  it('should not detect tsuuiisou with terminal tiles', () => {
    const allTiles = makeHand(0, 0, 0, 28, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkTsuuiisou(ctx)).toBe(false);
  });
});

describe('Chinroutou', () => {
  it('should detect chinroutou with all terminals', () => {
    // 1m1m1m 9m9m9m 1p1p1p 9p9p9p pair:1s
    const allTiles = makeHand(0, 0, 0, 8, 8, 8, 9, 9, 9, 17, 17, 17, 18, 18);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinroutou(ctx)).toBe(true);
  });

  it('should not detect chinroutou with honors', () => {
    const allTiles = makeHand(0, 0, 0, 8, 8, 8, 9, 9, 9, 27, 27, 27, 18, 18);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinroutou(ctx)).toBe(false);
  });

  it('should not detect chinroutou with simples', () => {
    const allTiles = makeHand(0, 0, 0, 1, 1, 1, 9, 9, 9, 17, 17, 17, 18, 18);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkChinroutou(ctx)).toBe(false);
  });
});

describe('Ryuuiisou', () => {
  it('should detect ryuuiisou with only green tiles', () => {
    // Green tiles: 2s(19), 3s(20), 4s(21), 6s(23), 8s(25), Hatsu(32)
    // 2s2s2s 3s4s(skip)... let's use triplets
    // 2s2s2s 3s3s3s 6s6s6s Hatsu*3 pair:8s
    const allTiles = makeHand(19, 19, 19, 20, 20, 20, 23, 23, 23, 32, 32, 32, 25, 25);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkRyuuiisou(ctx)).toBe(true);
  });

  it('should detect ryuuiisou with sequences of green tiles', () => {
    // 2s3s4s 2s3s4s 6s6s6s Hatsu*3 pair:8s
    const allTiles = makeHand(19, 19, 20, 20, 21, 21, 23, 23, 23, 32, 32, 32, 25, 25);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkRyuuiisou(ctx)).toBe(true);
  });

  it('should not detect ryuuiisou with non-green tile', () => {
    // Include 1s (TileType 18) which is not green
    const allTiles = makeHand(18, 19, 20, 20, 20, 21, 23, 23, 23, 32, 32, 32, 25, 25);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkRyuuiisou(ctx)).toBe(false);
  });

  it('should not detect ryuuiisou with 5s (not green)', () => {
    // 5s = TileType 22, which is NOT green
    const allTiles = makeHand(19, 19, 19, 20, 20, 20, 22, 22, 22, 32, 32, 32, 25, 25);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkRyuuiisou(ctx)).toBe(false);
  });

  it('should not detect ryuuiisou with 7s (not green)', () => {
    // 7s = TileType 24, which is NOT green
    const allTiles = makeHand(19, 19, 19, 20, 20, 20, 24, 24, 24, 32, 32, 32, 25, 25);
    const ctx = makeCtx({ allTiles, closedHand: allTiles });
    expect(checkRyuuiisou(ctx)).toBe(false);
  });
});

describe('Chuuren Poutou', () => {
  it('should detect chuuren poutou in man suit', () => {
    // 1112345678999 + extra 5m
    const closedHand = new Array(34).fill(0);
    closedHand[0] = 3; // 1m x3
    closedHand[1] = 1; // 2m
    closedHand[2] = 1; // 3m
    closedHand[3] = 1; // 4m
    closedHand[4] = 2; // 5m (extra)
    closedHand[5] = 1; // 6m
    closedHand[6] = 1; // 7m
    closedHand[7] = 1; // 8m
    closedHand[8] = 3; // 9m x3
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkChuurenPoutou(ctx)).toBe(true);
  });

  it('should detect chuuren poutou with extra 1', () => {
    // 1112345678999 + extra 1m (so 1m x4)
    const closedHand = new Array(34).fill(0);
    closedHand[0] = 4; // 1m x4
    closedHand[1] = 1;
    closedHand[2] = 1;
    closedHand[3] = 1;
    closedHand[4] = 1;
    closedHand[5] = 1;
    closedHand[6] = 1;
    closedHand[7] = 1;
    closedHand[8] = 3; // 9m x3
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkChuurenPoutou(ctx)).toBe(true);
  });

  it('should detect chuuren poutou in sou suit', () => {
    const closedHand = new Array(34).fill(0);
    closedHand[18] = 3; // 1s x3
    closedHand[19] = 1;
    closedHand[20] = 1;
    closedHand[21] = 1;
    closedHand[22] = 1;
    closedHand[23] = 1;
    closedHand[24] = 1;
    closedHand[25] = 2; // 8s (extra)
    closedHand[26] = 3; // 9s x3
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkChuurenPoutou(ctx)).toBe(true);
  });

  it('should not detect chuuren poutou when open', () => {
    const closedHand = new Array(34).fill(0);
    closedHand[0] = 3;
    closedHand[1] = 1;
    closedHand[2] = 1;
    closedHand[3] = 1;
    closedHand[4] = 2;
    closedHand[5] = 1;
    closedHand[6] = 1;
    closedHand[7] = 1;
    closedHand[8] = 3;
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: false,
    });
    expect(checkChuurenPoutou(ctx)).toBe(false);
  });

  it('should not detect chuuren poutou with mixed suits', () => {
    const closedHand = new Array(34).fill(0);
    closedHand[0] = 3;
    closedHand[1] = 1;
    closedHand[2] = 1;
    closedHand[3] = 1;
    closedHand[4] = 1;
    closedHand[5] = 1;
    closedHand[6] = 1;
    closedHand[7] = 1;
    closedHand[8] = 2;
    closedHand[9] = 1; // 1p - different suit!
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkChuurenPoutou(ctx)).toBe(false);
  });

  it('should not detect chuuren poutou without 3 copies of terminal', () => {
    const closedHand = new Array(34).fill(0);
    closedHand[0] = 2; // Only 2 copies of 1m
    closedHand[1] = 2;
    closedHand[2] = 1;
    closedHand[3] = 1;
    closedHand[4] = 2;
    closedHand[5] = 1;
    closedHand[6] = 1;
    closedHand[7] = 1;
    closedHand[8] = 3;
    const ctx = makeCtx({
      closedHand,
      allTiles: closedHand,
      isConcealed: true,
    });
    expect(checkChuurenPoutou(ctx)).toBe(false);
  });
});

describe('Tenhou', () => {
  it('should detect tenhou (dealer first draw win)', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: true,
        isTsumo: true,
        seatWind: 0 as Wind, // East = dealer
      },
      isConcealed: true,
    });
    expect(checkTenhou(ctx)).toBe(true);
  });

  it('should not detect tenhou for non-dealer', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: true,
        isTsumo: true,
        seatWind: 1 as Wind, // South = not dealer
      },
      isConcealed: true,
    });
    expect(checkTenhou(ctx)).toBe(false);
  });

  it('should not detect tenhou when not first turn', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: false,
        isTsumo: true,
        seatWind: 0 as Wind,
      },
    });
    expect(checkTenhou(ctx)).toBe(false);
  });

  it('should not detect tenhou on ron', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: true,
        isTsumo: false,
        seatWind: 0 as Wind,
      },
    });
    expect(checkTenhou(ctx)).toBe(false);
  });
});

describe('Chiihou', () => {
  it('should detect chiihou (non-dealer first draw win)', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: true,
        isTsumo: true,
        seatWind: 1 as Wind, // South
      },
      isConcealed: true,
    });
    expect(checkChiihou(ctx)).toBe(true);
  });

  it('should not detect chiihou for dealer', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: true,
        isTsumo: true,
        seatWind: 0 as Wind, // East = dealer
      },
    });
    expect(checkChiihou(ctx)).toBe(false);
  });

  it('should not detect chiihou when not first turn', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: false,
        isTsumo: true,
        seatWind: 1 as Wind,
      },
    });
    expect(checkChiihou(ctx)).toBe(false);
  });

  it('should not detect chiihou on ron', () => {
    const ctx = makeCtx({
      winContext: {
        isFirstTurn: true,
        isTsumo: false,
        seatWind: 2 as Wind,
      },
    });
    expect(checkChiihou(ctx)).toBe(false);
  });
});

// ── findYaku Integration Tests ──

describe('findYaku', () => {
  it('should return yakuman only when yakuman is detected', () => {
    // Daisangen hand that also has yakuhai
    const allTiles = makeHand(31, 31, 31, 32, 32, 32, 33, 33, 33, 0, 1, 2, 25, 25);
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(31), tri(32), tri(33), seq(0, 1, 2)],
        25,
      ),
      allTiles,
      closedHand: allTiles,
      isConcealed: true,
    });

    const result = findYaku(ctx);
    // Should only have yakuman
    expect(result.every((y) => y.isYakuman)).toBe(true);
    expect(result.some((y) => y.name === YAKU.daisangen.name)).toBe(true);
  });

  it('should return empty array for no-yaku hand', () => {
    // A hand with no yaku (not riichi, not tsumo, no special patterns)
    const allTiles = makeHand(0, 1, 2, 4, 5, 6, 9, 10, 11, 18, 18, 18, 25, 25);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(4, 5, 6), seq(9, 10, 11), tri(18, true)],
        25,
      ),
      allTiles,
      closedHand: makeHand(0, 1, 2, 4, 5, 6, 9, 10, 11, 25, 25),
      openMelds: [{ type: 'pon', tiles: [72, 73, 74] }], // 1s pon
      isConcealed: false,
      winContext: { isTsumo: false, seatWind: 1 as Wind, roundWind: 0 as Wind },
    });

    const result = findYaku(ctx);
    expect(result.length).toBe(0);
  });

  it('should exclude closed-only yaku for open hands', () => {
    // Open hand should not get riichi, pinfu, menzen tsumo, etc.
    const allTiles = makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 20, 21, 22, 23, 23);
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(1), seq(2, 3, 4), seq(13, 14, 15), seq(20, 21, 22)],
        23,
      ),
      allTiles,
      closedHand: makeHand(1, 1, 1, 2, 3, 4, 13, 14, 15, 23, 23),
      openMelds: [{ type: 'chi', tiles: [80, 84, 88] }],
      isConcealed: false,
      winContext: { isRiichi: true, isTsumo: true },
    });

    const result = findYaku(ctx);
    expect(result.some((y) => y.name === YAKU.riichi.name)).toBe(false);
    expect(result.some((y) => y.name === YAKU.menzenTsumo.name)).toBe(false);
    // Should still get tanyao (open OK)
    expect(result.some((y) => y.name === YAKU.tanyao.name)).toBe(true);
  });

  it('should handle mutual exclusion: junchan over chanta', () => {
    // Junchan hand (terminals in every group, no honors)
    const allTiles = makeHand(0, 1, 2, 6, 7, 8, 9, 10, 11, 24, 25, 26, 18, 18);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(6, 7, 8), seq(9, 10, 11), seq(24, 25, 26)],
        18,
      ),
      allTiles,
      closedHand: allTiles,
      isConcealed: true,
    });

    const result = findYaku(ctx);
    const hasJunchan = result.some((y) => y.name === YAKU.junchan.name);
    const hasChanta = result.some((y) => y.name === YAKU.chanta.name);
    // Junchan is stricter, chanta should not apply alongside it
    // Actually, chanta requires honors, so it won't fire for junchan anyway.
    // But the mutual exclusion logic handles it if both were detected.
    expect(hasJunchan).toBe(true);
    expect(hasChanta).toBe(false);
  });

  it('should handle mutual exclusion: chinitsu over honitsu', () => {
    // Chinitsu hand: all one suit, no honors
    const allTiles = makeHand(0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 7, 7, 8, 8);
    const ctx = makeCtx({
      parsing: makeParsing(
        [tri(0), seq(1, 2, 3), seq(4, 5, 6), tri(7)],
        8,
      ),
      allTiles,
      closedHand: allTiles,
      isConcealed: true,
    });

    const result = findYaku(ctx);
    const hasChinitsu = result.some((y) => y.name === YAKU.chinitsu.name);
    const hasHonitsu = result.some((y) => y.name === YAKU.honitsu.name);
    expect(hasChinitsu).toBe(true);
    expect(hasHonitsu).toBe(false);
  });

  it('should handle mutual exclusion: ryanpeiko over iipeiko', () => {
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(0, 1, 2), seq(0, 1, 2), seq(12, 13, 14), seq(12, 13, 14)],
        25,
      ),
      allTiles: makeHand(0, 0, 1, 1, 2, 2, 12, 12, 13, 13, 14, 14, 25, 25),
      closedHand: makeHand(0, 0, 1, 1, 2, 2, 12, 12, 13, 13, 14, 14, 25, 25),
      isConcealed: true,
    });

    const result = findYaku(ctx);
    const hasRyanpeiko = result.some((y) => y.name === YAKU.ryanpeiko.name);
    const hasIipeiko = result.some((y) => y.name === YAKU.iipeiko.name);
    expect(hasRyanpeiko).toBe(true);
    expect(hasIipeiko).toBe(false);
  });

  it('should handle mutual exclusion: double riichi over riichi', () => {
    const ctx = makeCtx({
      winContext: { isRiichi: true, isDoubleRiichi: true },
      isConcealed: true,
      parsing: makeParsing(
        [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
        25,
      ),
      allTiles: makeHand(0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 25, 25),
      closedHand: makeHand(0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 25, 25),
    });

    const result = findYaku(ctx);
    const hasDoubleRiichi = result.some((y) => y.name === YAKU.doubleRiichi.name);
    const hasRiichi = result.some((y) => y.name === YAKU.riichi.name);
    expect(hasDoubleRiichi).toBe(true);
    expect(hasRiichi).toBe(false);
  });

  it('should detect multiple yaku simultaneously', () => {
    // Riichi + Tsumo + Pinfu + Tanyao
    const allTiles = makeHand(1, 2, 3, 4, 5, 6, 10, 11, 12, 19, 20, 21, 22, 22);
    const ctx = makeCtx({
      parsing: makeParsing(
        [seq(1, 2, 3), seq(4, 5, 6), seq(10, 11, 12), seq(19, 20, 21)],
        22, // 5s - not yakuhai
      ),
      allTiles,
      closedHand: allTiles,
      isConcealed: true,
      winContext: {
        isRiichi: true,
        isTsumo: true,
        seatWind: 0 as Wind,
        roundWind: 0 as Wind,
      },
      waitType: 'ryanmen' as WaitType,
    });

    const result = findYaku(ctx);
    expect(result.some((y) => y.name === YAKU.riichi.name)).toBe(true);
    expect(result.some((y) => y.name === YAKU.menzenTsumo.name)).toBe(true);
    expect(result.some((y) => y.name === YAKU.pinfu.name)).toBe(true);
    expect(result.some((y) => y.name === YAKU.tanyao.name)).toBe(true);
  });
});

// ── calculateHan Tests ──

describe('calculateHan', () => {
  it('should calculate han for concealed hand', () => {
    const yaku = [YAKU.riichi, YAKU.menzenTsumo, YAKU.pinfu, YAKU.tanyao];
    expect(calculateHan(yaku, true)).toBe(4); // 1+1+1+1
  });

  it('should calculate han for open hand', () => {
    const yaku = [YAKU.tanyao, YAKU.yakuhaiHaku];
    expect(calculateHan(yaku, false)).toBe(2); // 1+1
  });

  it('should use hanOpen for open hand yaku', () => {
    const yaku = [YAKU.honitsu]; // hanClosed=3, hanOpen=2
    expect(calculateHan(yaku, false)).toBe(2);
    expect(calculateHan(yaku, true)).toBe(3);
  });

  it('should calculate han for yakuman', () => {
    const yaku = [YAKU.daisangen];
    expect(calculateHan(yaku, true)).toBe(13);
    expect(calculateHan(yaku, false)).toBe(13);
  });

  it('should sum multiple yakuman', () => {
    const yaku = [YAKU.daisangen, YAKU.tsuuiisou];
    expect(calculateHan(yaku, true)).toBe(26);
  });

  it('should return 0 for empty yaku list', () => {
    expect(calculateHan([], true)).toBe(0);
    expect(calculateHan([], false)).toBe(0);
  });

  it('should handle closed-only yaku as 0 han in open context', () => {
    // This shouldn't normally happen (findYaku filters them), but test the safety
    const yaku = [YAKU.pinfu]; // hanOpen = -1
    expect(calculateHan(yaku, false)).toBe(0);
  });

  it('should calculate chinitsu correctly for open vs closed', () => {
    const yaku = [YAKU.chinitsu]; // hanClosed=6, hanOpen=5
    expect(calculateHan(yaku, true)).toBe(6);
    expect(calculateHan(yaku, false)).toBe(5);
  });
});

// ── YAKU Constants Tests ──

describe('YAKU definitions', () => {
  it('should have correct han values for riichi', () => {
    expect(YAKU.riichi.hanClosed).toBe(1);
    expect(YAKU.riichi.hanOpen).toBe(-1);
    expect(YAKU.riichi.isYakuman).toBe(false);
  });

  it('should have correct han values for chinitsu', () => {
    expect(YAKU.chinitsu.hanClosed).toBe(6);
    expect(YAKU.chinitsu.hanOpen).toBe(5);
    expect(YAKU.chinitsu.isYakuman).toBe(false);
  });

  it('should mark kokushi as yakuman', () => {
    expect(YAKU.kokushi.isYakuman).toBe(true);
    expect(YAKU.kokushi.hanClosed).toBe(13);
    expect(YAKU.kokushi.hanOpen).toBe(-1);
  });

  it('should mark daisangen as yakuman with open support', () => {
    expect(YAKU.daisangen.isYakuman).toBe(true);
    expect(YAKU.daisangen.hanOpen).toBe(13);
    expect(YAKU.daisangen.hanClosed).toBe(13);
  });

  it('should have all expected yaku defined', () => {
    const expectedYaku = [
      'riichi', 'ippatsu', 'menzenTsumo', 'tanyao', 'pinfu', 'iipeiko',
      'yakuhaiHaku', 'yakuhaiHatsu', 'yakuhaiChun', 'yakuhaiSeatWind', 'yakuhaiRoundWind',
      'haitei', 'houtei', 'rinshan', 'chankan',
      'doubleRiichi', 'chanta', 'ittsu', 'sanshokuDoujun', 'sanshokuDoukou',
      'toitoi', 'sanAnkou', 'honroutou', 'shousangen', 'chiitoitsu',
      'honitsu', 'junchan', 'ryanpeiko',
      'chinitsu',
      'kokushi', 'suuankou', 'daisangen', 'shousuushii', 'daisuushii',
      'tsuuiisou', 'chinroutou', 'ryuuiisou', 'chuurenPoutou', 'tenhou', 'chiihou',
    ];

    for (const name of expectedYaku) {
      expect(YAKU).toHaveProperty(name);
    }
  });
});
