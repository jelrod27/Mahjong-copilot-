import { describe, it, expect } from 'vitest';
import {
  TileFactory, TileSuit, TileType, WindTile, DragonTile,
  tileKey, tilesMatch, getTileById, tileToJson, tileFromJson, getAllTiles,
} from '../Tile';

describe('TileFactory.getAllTiles', () => {
  it('returns exactly 144 tiles', () => {
    expect(TileFactory.getAllTiles()).toHaveLength(144);
  });

  it('has correct suit tile count (108)', () => {
    const tiles = TileFactory.getAllTiles();
    const suitTiles = tiles.filter(t => t.type === TileType.SUIT);
    expect(suitTiles).toHaveLength(108);
  });

  it('has correct honor tile count (28)', () => {
    const tiles = TileFactory.getAllTiles();
    const honorTiles = tiles.filter(t => t.type === TileType.HONOR);
    expect(honorTiles).toHaveLength(28); // 4 winds×4 + 3 dragons×4
  });

  it('has correct bonus tile count (8)', () => {
    const tiles = TileFactory.getAllTiles();
    const bonusTiles = tiles.filter(t => t.type === TileType.BONUS);
    expect(bonusTiles).toHaveLength(8); // 4 flowers + 4 seasons
  });
});

describe('tileKey', () => {
  it('returns correct key for suit tile', () => {
    const tile = TileFactory.getAllTiles().find(t => t.suit === TileSuit.BAMBOO && t.number === 5);
    expect(tileKey(tile!)).toBe('bamboo_5');
  });

  it('returns correct key for wind tile', () => {
    const tile = TileFactory.getAllTiles().find(t => t.wind === WindTile.EAST);
    expect(tileKey(tile!)).toBe('wind_east');
  });

  it('returns same key for different copies', () => {
    const tiles = TileFactory.getAllTiles().filter(t => t.suit === TileSuit.DOT && t.number === 1);
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tileKey(tiles[0])).toBe(tileKey(tiles[1]));
  });
});

describe('tilesMatch', () => {
  it('returns true for same-type different-copy tiles', () => {
    const tiles = TileFactory.getAllTiles().filter(t => t.suit === TileSuit.DOT && t.number === 5);
    expect(tilesMatch(tiles[0], tiles[1])).toBe(true);
  });

  it('returns false for different tiles', () => {
    const dot5 = TileFactory.getAllTiles().find(t => t.suit === TileSuit.DOT && t.number === 5)!;
    const dot6 = TileFactory.getAllTiles().find(t => t.suit === TileSuit.DOT && t.number === 6)!;
    expect(tilesMatch(dot5, dot6)).toBe(false);
  });
});

describe('getTileById', () => {
  it('finds suit tiles by simple ID', () => {
    const tile = getTileById('dot-5');
    expect(tile).toBeDefined();
    expect(tile!.suit).toBe(TileSuit.DOT);
    expect(tile!.number).toBe(5);
  });

  it('finds wind tiles by simple ID', () => {
    const tile = getTileById('wind-east');
    expect(tile).toBeDefined();
    expect(tile!.wind).toBe(WindTile.EAST);
  });

  it('returns undefined for nonexistent ID', () => {
    expect(getTileById('nonexistent')).toBeUndefined();
  });
});

describe('JSON round-trip', () => {
  it('preserves all fields through tileToJson and tileFromJson', () => {
    const original = TileFactory.getAllTiles()[0];
    const json = tileToJson(original);
    const restored = tileFromJson(json);
    expect(restored.id).toBe(original.id);
    expect(restored.suit).toBe(original.suit);
    expect(restored.type).toBe(original.type);
    expect(restored.number).toBe(original.number);
    expect(restored.nameEnglish).toBe(original.nameEnglish);
  });
});
