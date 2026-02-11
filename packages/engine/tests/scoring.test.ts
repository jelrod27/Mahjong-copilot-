import { describe, it, expect } from 'vitest';
import {
  calculateFu,
  calculateBasePoints,
  getLimitName,
  calculatePayment,
  calculateScore,
} from '../src/scoring.js';
import type {
  HandParsing,
  HandGroup,
  Meld,
  WinContext,
  WaitType,
  Wind,
  Yaku,
} from '../src/types.js';

// ── Helpers ──

function seq(t1: number, t2: number, t3: number, open = false): HandGroup {
  return { type: 'sequence', tiles: [t1, t2, t3], isOpen: open };
}

function tri(t: number, open = false): HandGroup {
  return { type: 'triplet', tiles: [t, t, t], isOpen: open };
}

function kanGroup(t: number, open = false): HandGroup {
  return { type: 'kan', tiles: [t, t, t, t], isOpen: open };
}

function makeParsing(groups: HandGroup[], pair: number): HandParsing {
  return { groups, pair, isValid: true };
}

function defaultWinCtx(overrides: Partial<WinContext> = {}): WinContext {
  return {
    winningTile: 0,
    isTsumo: false,
    isRiichi: false,
    isDoubleRiichi: false,
    isIppatsu: false,
    isFirstTurn: false,
    isLastTile: false,
    isAfterKan: false,
    isRobbedKan: false,
    seatWind: 1 as Wind, // South (non-dealer)
    roundWind: 0 as Wind, // East
    doraCount: 0,
    uraDoraCount: 0,
    redDoraCount: 0,
    ...overrides,
  };
}

const riichi: Yaku = {
  name: 'Riichi',
  japaneseName: '立直',
  hanOpen: -1,
  hanClosed: 1,
  isYakuman: false,
};

const tanyao: Yaku = {
  name: 'Tanyao',
  japaneseName: '断幺九',
  hanOpen: 1,
  hanClosed: 1,
  isYakuman: false,
};

const pinfu: Yaku = {
  name: 'Pinfu',
  japaneseName: '平和',
  hanOpen: -1,
  hanClosed: 1,
  isYakuman: false,
};

const menzenTsumo: Yaku = {
  name: 'Menzen Tsumo',
  japaneseName: '門前清自摸和',
  hanOpen: -1,
  hanClosed: 1,
  isYakuman: false,
};

const chinitsu: Yaku = {
  name: 'Chinitsu',
  japaneseName: '清一色',
  hanOpen: 5,
  hanClosed: 6,
  isYakuman: false,
};

const chiitoitsu: Yaku = {
  name: 'Chiitoitsu',
  japaneseName: '七対子',
  hanOpen: -1,
  hanClosed: 2,
  isYakuman: false,
};

const daisangen: Yaku = {
  name: 'Daisangen',
  japaneseName: '大三元',
  hanOpen: 13,
  hanClosed: 13,
  isYakuman: true,
};

// ── Fu Calculation ──

describe('calculateFu', () => {
  it('calculates 30 fu for concealed ron all-sequences hand', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType, true, false, false,
    );
    // Base 20 + 10 (concealed ron) + 0 (all sequences) + 0 (non-yakuhai pair) + 0 (ryanmen) = 30
    expect(fu).toBe(30);
  });

  it('calculates 20 fu for pinfu tsumo', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: true }),
      'ryanmen' as WaitType, true, true, false,
    );
    expect(fu).toBe(20);
  });

  it('calculates 25 fu for seven pairs', () => {
    const parsing = makeParsing([], 0);
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx(),
      'tanki' as WaitType, true, false, true,
    );
    expect(fu).toBe(25);
  });

  it('adds fu for closed triplet of simples', () => {
    // Closed triplet of 2m (type 1, simple): 4 fu
    const parsing = makeParsing(
      [tri(1), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 base + 10 concealed ron + 4 (closed triplet simples) = 34 -> rounds to 40
    expect(fu).toBe(40);
  });

  it('adds fu for closed triplet of terminals', () => {
    // Closed triplet of 1m (type 0, terminal): 8 fu
    const parsing = makeParsing(
      [tri(0), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 + 10 + 8 = 38 -> 40
    expect(fu).toBe(40);
  });

  it('adds fu for open triplet of simples from meld', () => {
    const parsing = makeParsing(
      [seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const openMelds: Meld[] = [
      { type: 'pon', tiles: [4, 5, 6] }, // 2m open pon (tile type 1, simple)
    ];
    const fu = calculateFu(
      parsing, openMelds, [], defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType, false, false, false,
    );
    // 20 base + 0 (open, no concealed ron bonus) + 2 (open triplet simple) = 22 -> 30 (open min)
    expect(fu).toBe(30);
  });

  it('adds fu for closed kan of terminals', () => {
    const parsing = makeParsing(
      [seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const closedKans: Meld[] = [
      { type: 'closedKan', tiles: [0, 1, 2, 3] }, // 1m closed kan (terminal)
    ];
    const fu = calculateFu(
      parsing, [], closedKans, defaultWinCtx({ isTsumo: true }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 base + 32 (closed kan terminal) + 2 (tsumo) = 54 -> 60
    expect(fu).toBe(60);
  });

  it('adds fu for dragon pair', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      31, // Haku pair
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 + 10 + 2 (dragon pair) = 32 -> 40
    expect(fu).toBe(40);
  });

  it('adds fu for seat wind pair', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      28, // South pair, seat wind = South
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false, seatWind: 1 as Wind }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 + 10 + 2 (seat wind pair) = 32 -> 40
    expect(fu).toBe(40);
  });

  it('adds double fu for seat+round wind pair', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      27, // East pair, both seat and round wind
    );
    const fu = calculateFu(
      parsing, [], [],
      defaultWinCtx({ isTsumo: false, seatWind: 0 as Wind, roundWind: 0 as Wind }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 + 10 + 4 (double wind pair) = 34 -> 40
    expect(fu).toBe(40);
  });

  it('adds fu for kanchan wait', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'kanchan' as WaitType, true, false, false,
    );
    // 20 + 10 + 2 (kanchan) = 32 -> 40
    expect(fu).toBe(40);
  });

  it('adds fu for penchan wait', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'penchan' as WaitType, true, false, false,
    );
    // 20 + 10 + 2 (penchan) = 32 -> 40
    expect(fu).toBe(40);
  });

  it('adds fu for tanki wait', () => {
    const parsing = makeParsing(
      [seq(0, 1, 2), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'tanki' as WaitType, true, false, false,
    );
    // 20 + 10 + 2 (tanki) = 32 -> 40
    expect(fu).toBe(40);
  });

  it('adds tsumo fu (non-pinfu)', () => {
    const parsing = makeParsing(
      [tri(1), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: true }),
      'ryanmen' as WaitType, true, false, false,
    );
    // 20 + 4 (closed triplet simples) + 2 (tsumo) = 26 -> 30
    expect(fu).toBe(30);
  });

  it('rounds up to nearest 10', () => {
    // 20 + 10 + 4 + 2 = 36 -> 40
    const parsing = makeParsing(
      [tri(1), seq(3, 4, 5), seq(9, 10, 11), seq(12, 13, 14)],
      25,
    );
    const fu = calculateFu(
      parsing, [], [], defaultWinCtx({ isTsumo: false }),
      'kanchan' as WaitType, true, false, false,
    );
    // 20 + 10 (concealed ron) + 4 (closed tri simple) + 2 (kanchan) = 36 -> 40
    expect(fu).toBe(40);
  });
});

// ── Base Points ──

describe('calculateBasePoints', () => {
  it('calculates standard base points for 1 han 30 fu', () => {
    // 30 * 2^3 = 240
    expect(calculateBasePoints(1, 30)).toBe(240);
  });

  it('calculates standard base points for 2 han 30 fu', () => {
    // 30 * 2^4 = 480
    expect(calculateBasePoints(2, 30)).toBe(480);
  });

  it('calculates standard base points for 3 han 30 fu', () => {
    // 30 * 2^5 = 960
    expect(calculateBasePoints(3, 30)).toBe(960);
  });

  it('calculates standard base points for 4 han 30 fu', () => {
    // 30 * 2^6 = 1920
    expect(calculateBasePoints(4, 30)).toBe(1920);
  });

  it('caps at mangan for 3 han 70 fu', () => {
    // 70 * 2^5 = 2240 > 2000, capped at mangan
    expect(calculateBasePoints(3, 70)).toBe(2000);
  });

  it('returns mangan for 5 han', () => {
    expect(calculateBasePoints(5, 30)).toBe(2000);
  });

  it('returns haneman for 6 han', () => {
    expect(calculateBasePoints(6, 30)).toBe(3000);
  });

  it('returns haneman for 7 han', () => {
    expect(calculateBasePoints(7, 30)).toBe(3000);
  });

  it('returns baiman for 8 han', () => {
    expect(calculateBasePoints(8, 30)).toBe(4000);
  });

  it('returns baiman for 10 han', () => {
    expect(calculateBasePoints(10, 30)).toBe(4000);
  });

  it('returns sanbaiman for 11 han', () => {
    expect(calculateBasePoints(11, 30)).toBe(6000);
  });

  it('returns sanbaiman for 12 han', () => {
    expect(calculateBasePoints(12, 30)).toBe(6000);
  });

  it('returns yakuman for 13 han', () => {
    expect(calculateBasePoints(13, 0)).toBe(8000);
  });

  it('returns yakuman for 26 han (double yakuman)', () => {
    expect(calculateBasePoints(26, 0)).toBe(8000);
  });
});

// ── Limit Names ──

describe('getLimitName', () => {
  it('returns undefined for sub-mangan', () => {
    expect(getLimitName(3, 960)).toBeUndefined();
  });

  it('returns mangan for 5 han', () => {
    expect(getLimitName(5, 2000)).toBe('mangan');
  });

  it('returns mangan for 4 han with mangan base', () => {
    expect(getLimitName(4, 2000)).toBe('mangan');
  });

  it('returns haneman for 6 han', () => {
    expect(getLimitName(6, 3000)).toBe('haneman');
  });

  it('returns baiman for 8 han', () => {
    expect(getLimitName(8, 4000)).toBe('baiman');
  });

  it('returns sanbaiman for 11 han', () => {
    expect(getLimitName(11, 6000)).toBe('sanbaiman');
  });

  it('returns yakuman for 13 han', () => {
    expect(getLimitName(13, 8000)).toBe('yakuman');
  });
});

// ── Payments ──

describe('calculatePayment', () => {
  describe('dealer ron', () => {
    it('calculates correct payment for dealer ron 1 han 30 fu', () => {
      // base=240, ron=240*6=1440, rounded=1500
      const result = calculatePayment(240, true, false, 0, 0);
      expect(result.ronPayment).toBe(1500);
      expect(result.totalPoints).toBe(1500);
    });

    it('adds honba bonus to dealer ron', () => {
      // base=240, ron=1500 + 300*1 honba = 1800
      const result = calculatePayment(240, true, false, 1, 0);
      expect(result.ronPayment).toBe(1800);
    });

    it('adds riichi sticks to total', () => {
      const result = calculatePayment(240, true, false, 0, 2);
      expect(result.totalPoints).toBe(1500 + 2000); // 1500 ron + 2*1000 riichi
    });
  });

  describe('dealer tsumo', () => {
    it('calculates correct payment for dealer tsumo 1 han 30 fu', () => {
      // base=240, each=240*2=480->500
      const result = calculatePayment(240, true, true, 0, 0);
      expect(result.dealerTsumoPayment!.all).toBe(500);
      expect(result.totalPoints).toBe(1500); // 500*3
    });

    it('adds honba to dealer tsumo per player', () => {
      // each = 500 + 100*1 = 600
      const result = calculatePayment(240, true, true, 1, 0);
      expect(result.dealerTsumoPayment!.all).toBe(600);
      expect(result.totalPoints).toBe(1800); // 600*3
    });
  });

  describe('non-dealer ron', () => {
    it('calculates correct payment for non-dealer ron 1 han 30 fu', () => {
      // base=240, ron=240*4=960->1000
      const result = calculatePayment(240, false, false, 0, 0);
      expect(result.ronPayment).toBe(1000);
      expect(result.totalPoints).toBe(1000);
    });

    it('adds honba bonus', () => {
      const result = calculatePayment(240, false, false, 2, 0);
      expect(result.ronPayment).toBe(1000 + 600); // 1000 + 300*2
    });
  });

  describe('non-dealer tsumo', () => {
    it('calculates correct payment for non-dealer tsumo 1 han 30 fu', () => {
      // base=240
      // dealer pays: 240*2=480->500
      // non-dealer: 240*1=240->300
      const result = calculatePayment(240, false, true, 0, 0);
      expect(result.nonDealerTsumoPayment!.dealer).toBe(500);
      expect(result.nonDealerTsumoPayment!.nonDealer).toBe(300);
      expect(result.totalPoints).toBe(500 + 300 * 2); // 1100
    });

    it('adds honba to tsumo per player', () => {
      // dealer: 500 + 100 = 600
      // non-dealer: 300 + 100 = 400
      const result = calculatePayment(240, false, true, 1, 0);
      expect(result.nonDealerTsumoPayment!.dealer).toBe(600);
      expect(result.nonDealerTsumoPayment!.nonDealer).toBe(400);
    });
  });

  describe('mangan payments', () => {
    it('calculates dealer ron mangan', () => {
      // base=2000, ron=2000*6=12000
      const result = calculatePayment(2000, true, false, 0, 0);
      expect(result.ronPayment).toBe(12000);
    });

    it('calculates non-dealer ron mangan', () => {
      // base=2000, ron=2000*4=8000
      const result = calculatePayment(2000, false, false, 0, 0);
      expect(result.ronPayment).toBe(8000);
    });

    it('calculates dealer tsumo mangan', () => {
      // base=2000, each=2000*2=4000
      const result = calculatePayment(2000, true, true, 0, 0);
      expect(result.dealerTsumoPayment!.all).toBe(4000);
      expect(result.totalPoints).toBe(12000);
    });

    it('calculates non-dealer tsumo mangan', () => {
      // base=2000
      // dealer: 2000*2=4000
      // non-dealer: 2000*1=2000
      const result = calculatePayment(2000, false, true, 0, 0);
      expect(result.nonDealerTsumoPayment!.dealer).toBe(4000);
      expect(result.nonDealerTsumoPayment!.nonDealer).toBe(2000);
      expect(result.totalPoints).toBe(8000);
    });
  });

  describe('yakuman payments', () => {
    it('calculates dealer ron yakuman', () => {
      // base=8000, ron=8000*6=48000
      const result = calculatePayment(8000, true, false, 0, 0);
      expect(result.ronPayment).toBe(48000);
    });

    it('calculates non-dealer ron yakuman', () => {
      // base=8000, ron=8000*4=32000
      const result = calculatePayment(8000, false, false, 0, 0);
      expect(result.ronPayment).toBe(32000);
    });

    it('calculates dealer tsumo yakuman', () => {
      // base=8000, each=8000*2=16000
      const result = calculatePayment(8000, true, true, 0, 0);
      expect(result.dealerTsumoPayment!.all).toBe(16000);
      expect(result.totalPoints).toBe(48000);
    });

    it('calculates non-dealer tsumo yakuman', () => {
      // dealer: 8000*2=16000, non-dealer: 8000*1=8000
      const result = calculatePayment(8000, false, true, 0, 0);
      expect(result.nonDealerTsumoPayment!.dealer).toBe(16000);
      expect(result.nonDealerTsumoPayment!.nonDealer).toBe(8000);
      expect(result.totalPoints).toBe(32000);
    });
  });
});

// ── Full Scoring ──

describe('calculateScore', () => {
  it('calculates riichi pinfu ron (1+1=2 han, 30 fu)', () => {
    const parsing = makeParsing(
      [seq(1, 2, 3), seq(4, 5, 6), seq(10, 11, 12), seq(19, 20, 21)],
      22,
    );
    const result = calculateScore(
      [riichi, pinfu],
      parsing, [], [],
      defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType,
      true, 0, 0,
    );
    expect(result.han).toBe(2);
    expect(result.fu).toBe(30);
    // base = 30 * 2^4 = 480
    expect(result.basePoints).toBe(480);
    // non-dealer ron: 480*4=1920->2000
    expect(result.ronPayment).toBe(2000);
  });

  it('calculates pinfu tsumo (1+1=2 han, 20 fu)', () => {
    const parsing = makeParsing(
      [seq(1, 2, 3), seq(4, 5, 6), seq(10, 11, 12), seq(19, 20, 21)],
      22,
    );
    const result = calculateScore(
      [pinfu, menzenTsumo],
      parsing, [], [],
      defaultWinCtx({ isTsumo: true }),
      'ryanmen' as WaitType,
      true, 0, 0,
    );
    expect(result.han).toBe(2);
    expect(result.fu).toBe(20);
    // base = 20 * 2^4 = 320
    expect(result.basePoints).toBe(320);
  });

  it('includes dora in han count', () => {
    const parsing = makeParsing(
      [seq(1, 2, 3), seq(4, 5, 6), seq(10, 11, 12), seq(19, 20, 21)],
      22,
    );
    const result = calculateScore(
      [tanyao],
      parsing, [], [],
      defaultWinCtx({ doraCount: 2, isTsumo: false }),
      'ryanmen' as WaitType,
      false, 0, 0,
    );
    expect(result.han).toBe(3); // 1 tanyao + 2 dora
  });

  it('returns empty result for no yaku', () => {
    const result = calculateScore(
      [],
      makeParsing([], 0), [], [],
      defaultWinCtx(),
      'ryanmen' as WaitType,
      true, 0, 0,
    );
    expect(result.han).toBe(0);
    expect(result.totalPoints).toBe(0);
  });

  it('handles yakuman scoring', () => {
    const parsing = makeParsing(
      [tri(31), tri(32), tri(33), seq(0, 1, 2)],
      25,
    );
    const result = calculateScore(
      [daisangen],
      parsing, [], [],
      defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType,
      true, 0, 0,
    );
    expect(result.isYakuman).toBe(true);
    expect(result.han).toBe(13);
    expect(result.basePoints).toBe(8000);
    // non-dealer ron yakuman: 8000*4=32000
    expect(result.ronPayment).toBe(32000);
  });

  it('correctly identifies mangan', () => {
    const result = calculateScore(
      [chinitsu],
      makeParsing([tri(0), seq(1, 2, 3), seq(4, 5, 6), tri(7)], 8),
      [], [],
      defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType,
      true, 0, 0,
    );
    expect(result.isMangan).toBe(true);
    expect(result.han).toBe(6);
    expect(result.limitName).toBe('haneman');
  });

  it('handles honba bonus', () => {
    const parsing = makeParsing(
      [seq(1, 2, 3), seq(4, 5, 6), seq(10, 11, 12), seq(19, 20, 21)],
      22,
    );
    const resultNoHonba = calculateScore(
      [riichi, pinfu],
      parsing, [], [],
      defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType,
      true, 0, 0,
    );
    const resultWithHonba = calculateScore(
      [riichi, pinfu],
      parsing, [], [],
      defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType,
      true, 2, 0,
    );
    expect(resultWithHonba.totalPoints).toBe(resultNoHonba.totalPoints + 600);
  });

  it('handles riichi sticks collection', () => {
    const parsing = makeParsing(
      [seq(1, 2, 3), seq(4, 5, 6), seq(10, 11, 12), seq(19, 20, 21)],
      22,
    );
    const result = calculateScore(
      [tanyao],
      parsing, [], [],
      defaultWinCtx({ isTsumo: false }),
      'ryanmen' as WaitType,
      false, 0, 3,
    );
    // totalPoints includes ronPayment + 3000 (riichi sticks)
    expect(result.totalPoints).toBe(result.ronPayment! + 3000);
  });

  it('calculates chiitoitsu scoring (25 fu)', () => {
    const parsing = makeParsing([], 0);
    const result = calculateScore(
      [chiitoitsu],
      parsing, [], [],
      defaultWinCtx({ isTsumo: false }),
      'tanki' as WaitType,
      true, 0, 0,
    );
    expect(result.fu).toBe(25);
    expect(result.han).toBe(2);
    // base = 25 * 2^4 = 400
    expect(result.basePoints).toBe(400);
  });
});
