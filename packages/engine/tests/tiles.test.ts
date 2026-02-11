import { describe, it, expect } from 'vitest';
import {
  tileIdToType,
  tileIdToCopy,
  tileTypeToIds,
  getTileSuit,
  getTileValue,
  getTileDisplay,
  getTileInfo,
  isTerminal,
  isHonor,
  isSuited,
  isSimple,
  isRedDora,
  sortTileIds,
  tilesToHandArray,
  handArrayToTileTypes,
  countTileType,
  createAllTileIds,
  getDoraFromIndicator,
  countDora,
  countRedDora,
  TILE_TYPE_COUNT,
  TOTAL_TILES,
  TERMINAL_HONOR_TYPES,
} from '../src/tiles.js';
import { Suit } from '../src/types.js';

describe('Tile ID / Type Conversion', () => {
  it('converts TileId to TileType correctly', () => {
    expect(tileIdToType(0)).toBe(0);   // 1m copy 0
    expect(tileIdToType(3)).toBe(0);   // 1m copy 3
    expect(tileIdToType(4)).toBe(1);   // 2m copy 0
    expect(tileIdToType(35)).toBe(8);  // 9m copy 3
    expect(tileIdToType(36)).toBe(9);  // 1p copy 0
    expect(tileIdToType(135)).toBe(33); // Chun copy 3
  });

  it('converts TileId to copy index', () => {
    expect(tileIdToCopy(0)).toBe(0);
    expect(tileIdToCopy(1)).toBe(1);
    expect(tileIdToCopy(2)).toBe(2);
    expect(tileIdToCopy(3)).toBe(3);
    expect(tileIdToCopy(4)).toBe(0);
  });

  it('converts TileType to all 4 TileIds', () => {
    expect(tileTypeToIds(0)).toEqual([0, 1, 2, 3]);     // 1m
    expect(tileTypeToIds(9)).toEqual([36, 37, 38, 39]);  // 1p
    expect(tileTypeToIds(33)).toEqual([132, 133, 134, 135]); // Chun
  });

  it('tileIdToType and tileTypeToIds are consistent', () => {
    for (let type = 0; type < TILE_TYPE_COUNT; type++) {
      const ids = tileTypeToIds(type);
      for (const id of ids) {
        expect(tileIdToType(id)).toBe(type);
      }
    }
  });
});

describe('Tile Suit', () => {
  it('identifies Man tiles (0-8)', () => {
    for (let t = 0; t <= 8; t++) {
      expect(getTileSuit(t)).toBe(Suit.Man);
    }
  });

  it('identifies Pin tiles (9-17)', () => {
    for (let t = 9; t <= 17; t++) {
      expect(getTileSuit(t)).toBe(Suit.Pin);
    }
  });

  it('identifies Sou tiles (18-26)', () => {
    for (let t = 18; t <= 26; t++) {
      expect(getTileSuit(t)).toBe(Suit.Sou);
    }
  });

  it('identifies Wind tiles (27-30)', () => {
    for (let t = 27; t <= 30; t++) {
      expect(getTileSuit(t)).toBe(Suit.Wind);
    }
  });

  it('identifies Dragon tiles (31-33)', () => {
    for (let t = 31; t <= 33; t++) {
      expect(getTileSuit(t)).toBe(Suit.Dragon);
    }
  });
});

describe('Tile Value', () => {
  it('returns 1-9 for suited tiles', () => {
    for (let suit = 0; suit < 3; suit++) {
      for (let v = 1; v <= 9; v++) {
        expect(getTileValue(suit * 9 + v - 1)).toBe(v);
      }
    }
  });

  it('returns 1-4 for wind tiles', () => {
    expect(getTileValue(27)).toBe(1); // East
    expect(getTileValue(28)).toBe(2); // South
    expect(getTileValue(29)).toBe(3); // West
    expect(getTileValue(30)).toBe(4); // North
  });

  it('returns 1-3 for dragon tiles', () => {
    expect(getTileValue(31)).toBe(1); // Haku
    expect(getTileValue(32)).toBe(2); // Hatsu
    expect(getTileValue(33)).toBe(3); // Chun
  });
});

describe('Tile Display', () => {
  it('displays Man tiles as Nm', () => {
    expect(getTileDisplay(0)).toBe('1m');
    expect(getTileDisplay(4)).toBe('5m');
    expect(getTileDisplay(8)).toBe('9m');
  });

  it('displays Pin tiles as Np', () => {
    expect(getTileDisplay(9)).toBe('1p');
    expect(getTileDisplay(13)).toBe('5p');
    expect(getTileDisplay(17)).toBe('9p');
  });

  it('displays Sou tiles as Ns', () => {
    expect(getTileDisplay(18)).toBe('1s');
    expect(getTileDisplay(22)).toBe('5s');
    expect(getTileDisplay(26)).toBe('9s');
  });

  it('displays Wind tiles by name', () => {
    expect(getTileDisplay(27)).toBe('East');
    expect(getTileDisplay(28)).toBe('South');
    expect(getTileDisplay(29)).toBe('West');
    expect(getTileDisplay(30)).toBe('North');
  });

  it('displays Dragon tiles by name', () => {
    expect(getTileDisplay(31)).toBe('Haku');
    expect(getTileDisplay(32)).toBe('Hatsu');
    expect(getTileDisplay(33)).toBe('Chun');
  });
});

describe('Terminal / Honor / Suited', () => {
  it('identifies terminals as 1 and 9 of suited tiles', () => {
    // Terminals
    expect(isTerminal(0)).toBe(true);   // 1m
    expect(isTerminal(8)).toBe(true);   // 9m
    expect(isTerminal(9)).toBe(true);   // 1p
    expect(isTerminal(17)).toBe(true);  // 9p
    expect(isTerminal(18)).toBe(true);  // 1s
    expect(isTerminal(26)).toBe(true);  // 9s

    // Non-terminals
    expect(isTerminal(4)).toBe(false);  // 5m
    expect(isTerminal(13)).toBe(false); // 5p
    expect(isTerminal(27)).toBe(false); // East (honor, not terminal)
    expect(isTerminal(31)).toBe(false); // Haku (honor, not terminal)
  });

  it('identifies honors as winds and dragons', () => {
    for (let t = 27; t <= 33; t++) {
      expect(isHonor(t)).toBe(true);
    }
    for (let t = 0; t <= 26; t++) {
      expect(isHonor(t)).toBe(false);
    }
  });

  it('identifies suited tiles as man, pin, sou', () => {
    for (let t = 0; t <= 26; t++) {
      expect(isSuited(t)).toBe(true);
    }
    for (let t = 27; t <= 33; t++) {
      expect(isSuited(t)).toBe(false);
    }
  });

  it('identifies simples as 2-8 of any suit', () => {
    expect(isSimple(0)).toBe(false);  // 1m
    expect(isSimple(1)).toBe(true);   // 2m
    expect(isSimple(7)).toBe(true);   // 8m
    expect(isSimple(8)).toBe(false);  // 9m
    expect(isSimple(27)).toBe(false); // East
  });

  it('TERMINAL_HONOR_TYPES has all 13 required types', () => {
    expect(TERMINAL_HONOR_TYPES).toHaveLength(13);
    for (const t of TERMINAL_HONOR_TYPES) {
      expect(isTerminal(t) || isHonor(t)).toBe(true);
    }
  });
});

describe('Red Dora', () => {
  it('marks copy 0 of 5m, 5p, 5s as red dora', () => {
    expect(isRedDora(16)).toBe(true);  // 5m copy 0
    expect(isRedDora(52)).toBe(true);  // 5p copy 0
    expect(isRedDora(88)).toBe(true);  // 5s copy 0
  });

  it('does not mark other copies as red dora', () => {
    expect(isRedDora(17)).toBe(false); // 5m copy 1
    expect(isRedDora(18)).toBe(false); // 5m copy 2
    expect(isRedDora(19)).toBe(false); // 5m copy 3
    expect(isRedDora(53)).toBe(false); // 5p copy 1
    expect(isRedDora(89)).toBe(false); // 5s copy 1
  });

  it('does not mark non-5 tiles as red dora', () => {
    expect(isRedDora(0)).toBe(false);   // 1m
    expect(isRedDora(12)).toBe(false);  // 4m copy 0
    expect(isRedDora(108)).toBe(false); // East
  });
});

describe('Sorting', () => {
  it('sorts by type then copy', () => {
    const tiles = [135, 0, 36, 4, 108]; // Chun3, 1m0, 1p0, 2m0, East0
    const sorted = sortTileIds(tiles);
    expect(sorted).toEqual([0, 4, 36, 108, 135]);
  });

  it('sorts same-type tiles by copy index', () => {
    const tiles = [3, 1, 0, 2]; // All 1m, different copies
    expect(sortTileIds(tiles)).toEqual([0, 1, 2, 3]);
  });

  it('returns new array without mutating input', () => {
    const tiles = [4, 0];
    const sorted = sortTileIds(tiles);
    expect(tiles).toEqual([4, 0]); // unchanged
    expect(sorted).toEqual([0, 4]);
  });
});

describe('HandArray Conversion', () => {
  it('converts TileIds to a 34-element count array', () => {
    const tiles = [0, 1, 4]; // Two 1m + one 2m
    const hand = tilesToHandArray(tiles);
    expect(hand).toHaveLength(34);
    expect(hand[0]).toBe(2); // 1m: 2 copies
    expect(hand[1]).toBe(1); // 2m: 1 copy
    expect(hand[2]).toBe(0); // 3m: 0
  });

  it('converts HandArray back to TileTypes', () => {
    const hand = new Array(34).fill(0);
    hand[0] = 2;  // Two 1m
    hand[8] = 1;  // One 9m
    hand[33] = 3; // Three Chun
    const types = handArrayToTileTypes(hand);
    expect(types).toEqual([0, 0, 8, 33, 33, 33]);
  });

  it('countTileType reads from HandArray', () => {
    const hand = new Array(34).fill(0);
    hand[5] = 3;
    expect(countTileType(hand, 5)).toBe(3);
    expect(countTileType(hand, 0)).toBe(0);
  });
});

describe('createAllTileIds', () => {
  it('creates exactly 136 tile IDs', () => {
    const all = createAllTileIds();
    expect(all).toHaveLength(TOTAL_TILES);
  });

  it('creates IDs 0 through 135', () => {
    const all = createAllTileIds();
    for (let i = 0; i < 136; i++) {
      expect(all[i]).toBe(i);
    }
  });

  it('has no duplicates', () => {
    const all = createAllTileIds();
    expect(new Set(all).size).toBe(136);
  });
});

describe('getTileInfo', () => {
  it('returns complete info for a suited tile', () => {
    const info = getTileInfo(16); // 5m copy 0
    expect(info.id).toBe(16);
    expect(info.type).toBe(4);
    expect(info.suit).toBe(Suit.Man);
    expect(info.value).toBe(5);
    expect(info.isHonor).toBe(false);
    expect(info.isTerminal).toBe(false);
    expect(info.isSuited).toBe(true);
    expect(info.isRedDora).toBe(true);
    expect(info.display).toBe('5m');
  });

  it('returns complete info for a wind tile', () => {
    const info = getTileInfo(108); // East copy 0
    expect(info.type).toBe(27);
    expect(info.suit).toBe(Suit.Wind);
    expect(info.value).toBe(1);
    expect(info.isHonor).toBe(true);
    expect(info.isTerminal).toBe(false);
    expect(info.isSuited).toBe(false);
    expect(info.display).toBe('East');
  });

  it('returns complete info for a dragon tile', () => {
    const info = getTileInfo(132); // Haku copy 0 (but not red dora)
    expect(info.type).toBe(33);
    expect(info.suit).toBe(Suit.Dragon);
    expect(info.display).toBe('Chun');
    expect(info.isHonor).toBe(true);
  });
});

describe('Dora from Indicator', () => {
  it('wraps suited tiles: 9 → 1', () => {
    expect(getDoraFromIndicator(8)).toBe(0);   // 9m indicator → 1m dora
    expect(getDoraFromIndicator(17)).toBe(9);  // 9p indicator → 1p dora
    expect(getDoraFromIndicator(26)).toBe(18); // 9s indicator → 1s dora
  });

  it('increments suited tiles normally', () => {
    expect(getDoraFromIndicator(0)).toBe(1);   // 1m indicator → 2m dora
    expect(getDoraFromIndicator(4)).toBe(5);   // 5m indicator → 6m dora
    expect(getDoraFromIndicator(12)).toBe(13); // 4p indicator → 5p dora
  });

  it('wraps winds: North → East', () => {
    expect(getDoraFromIndicator(27)).toBe(28); // East → South
    expect(getDoraFromIndicator(28)).toBe(29); // South → West
    expect(getDoraFromIndicator(29)).toBe(30); // West → North
    expect(getDoraFromIndicator(30)).toBe(27); // North → East
  });

  it('wraps dragons: Chun → Haku', () => {
    expect(getDoraFromIndicator(31)).toBe(32); // Haku → Hatsu
    expect(getDoraFromIndicator(32)).toBe(33); // Hatsu → Chun
    expect(getDoraFromIndicator(33)).toBe(31); // Chun → Haku
  });
});

describe('Dora Counting', () => {
  it('counts dora in a set of tiles', () => {
    // Indicator is 4m (type 3) → dora is 5m (type 4)
    const tiles = [16, 17, 18, 0]; // 5m, 5m, 5m, 1m
    expect(countDora(tiles, [3])).toBe(3);
  });

  it('counts red dora', () => {
    const tiles = [16, 17, 52, 0]; // 5m(red), 5m, 5p(red), 1m
    expect(countRedDora(tiles)).toBe(2);
  });

  it('returns 0 when no dora present', () => {
    const tiles = [0, 4, 8]; // 1m, 2m, 3m
    expect(countDora(tiles, [20])).toBe(0); // indicator 3s → dora 4s
    expect(countRedDora(tiles)).toBe(0);
  });
});
