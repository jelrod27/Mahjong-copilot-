// Tile-related types and enums
export enum TileSuit {
  BAMBOO = 'bamboo',
  CHARACTER = 'character',
  DOT = 'dot',
  WIND = 'wind',
  DRAGON = 'dragon',
  FLOWER = 'flower',
  SEASON = 'season',
}

export enum TileType {
  SUIT = 'suit',
  HONOR = 'honor',
  BONUS = 'bonus',
}

export enum WindTile {
  EAST = 'east',
  SOUTH = 'south',
  WEST = 'west',
  NORTH = 'north',
}

export enum DragonTile {
  RED = 'red',
  GREEN = 'green',
  WHITE = 'white',
}

export interface Tile {
  id: string;
  suit: TileSuit;
  type: TileType;
  number?: number;
  wind?: WindTile;
  dragon?: DragonTile;
  flower?: string;
  season?: string;
  nameEnglish: string;
  nameChinese: string;
  nameJapanese: string;
  assetPath: string;
}

export class TileFactory {
  static getAllTiles(): Tile[] {
    const tiles: Tile[] = [];
    
    // Suit tiles (1-9, 4 copies each)
    [TileSuit.BAMBOO, TileSuit.CHARACTER, TileSuit.DOT].forEach(suit => {
      for (let i = 1; i <= 9; i++) {
        const name = this.getSuitTileName(suit, i);
        for (let copy = 1; copy <= 4; copy++) {
          tiles.push({
            id: `${suit}_${i}_${copy}`,
            suit,
            type: TileType.SUIT,
            number: i,
            nameEnglish: name.en,
            nameChinese: name.zh,
            nameJapanese: name.ja,
            assetPath: `assets/tiles/${suit}_${i}.svg`,
          });
        }
      }
    });
    
    // Wind tiles (4 copies each)
    Object.values(WindTile).forEach(wind => {
      const name = this.getWindTileName(wind);
      for (let copy = 1; copy <= 4; copy++) {
        tiles.push({
          id: `wind_${wind}_${copy}`,
          suit: TileSuit.WIND,
          type: TileType.HONOR,
          wind,
          nameEnglish: name.en,
          nameChinese: name.zh,
          nameJapanese: name.ja,
          assetPath: `assets/tiles/wind_${wind}.svg`,
        });
      }
    });
    
    // Dragon tiles (4 copies each)
    Object.values(DragonTile).forEach(dragon => {
      const name = this.getDragonTileName(dragon);
      for (let copy = 1; copy <= 4; copy++) {
        tiles.push({
          id: `dragon_${dragon}_${copy}`,
          suit: TileSuit.DRAGON,
          type: TileType.HONOR,
          dragon,
          nameEnglish: name.en,
          nameChinese: name.zh,
          nameJapanese: name.ja,
          assetPath: `assets/tiles/dragon_${dragon}.svg`,
        });
      }
    });
    
    // Flower tiles (1 copy each)
    const flowers = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
    flowers.forEach((flower, i) => {
      tiles.push({
        id: `flower_${i + 1}`,
        suit: TileSuit.FLOWER,
        type: TileType.BONUS,
        flower,
        nameEnglish: `${flower} Flower`,
        nameChinese: `${flower}花`,
        nameJapanese: `${flower}の花`,
        assetPath: `assets/tiles/flower_${i + 1}.svg`,
      });
    });
    
    // Season tiles (1 copy each)
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    seasons.forEach((season, i) => {
      tiles.push({
        id: `season_${i + 1}`,
        suit: TileSuit.SEASON,
        type: TileType.BONUS,
        season,
        nameEnglish: `${season} Season`,
        nameChinese: `${season}季`,
        nameJapanese: `${season}の季節`,
        assetPath: `assets/tiles/season_${i + 1}.svg`,
      });
    });
    
    return tiles;
  }

  private static getSuitTileName(suit: TileSuit, number: number): {en: string; zh: string; ja: string} {
    const suitNames = {
      [TileSuit.BAMBOO]: {en: 'Bamboo', zh: '索', ja: '索'},
      [TileSuit.CHARACTER]: {en: 'Character', zh: '萬', ja: '萬'},
      [TileSuit.DOT]: {en: 'Dot', zh: '筒', ja: '筒'},
    };
    
    const numbers = {
      1: {en: 'One', zh: '一', ja: '一'},
      2: {en: 'Two', zh: '二', ja: '二'},
      3: {en: 'Three', zh: '三', ja: '三'},
      4: {en: 'Four', zh: '四', ja: '四'},
      5: {en: 'Five', zh: '五', ja: '五'},
      6: {en: 'Six', zh: '六', ja: '六'},
      7: {en: 'Seven', zh: '七', ja: '七'},
      8: {en: 'Eight', zh: '八', ja: '八'},
      9: {en: 'Nine', zh: '九', ja: '九'},
    };
    
    return {
      en: `${numbers[number].en} ${suitNames[suit].en}`,
      zh: `${numbers[number].zh}${suitNames[suit].zh}`,
      ja: `${numbers[number].ja}${suitNames[suit].ja}`,
    };
  }

  private static getWindTileName(wind: WindTile): {en: string; zh: string; ja: string} {
    const names = {
      [WindTile.EAST]: {en: 'East Wind', zh: '東風', ja: '東'},
      [WindTile.SOUTH]: {en: 'South Wind', zh: '南風', ja: '南'},
      [WindTile.WEST]: {en: 'West Wind', zh: '西風', ja: '西'},
      [WindTile.NORTH]: {en: 'North Wind', zh: '北風', ja: '北'},
    };
    return names[wind];
  }

  private static getDragonTileName(dragon: DragonTile): {en: string; zh: string; ja: string} {
    const names = {
      [DragonTile.RED]: {en: 'Red Dragon', zh: '中', ja: '中'},
      [DragonTile.GREEN]: {en: 'Green Dragon', zh: '發', ja: '發'},
      [DragonTile.WHITE]: {en: 'White Dragon', zh: '白', ja: '白'},
    };
    return names[dragon];
  }
}

// Tile lookup cache
let _allTiles: Tile[] | null = null;
let _tileMap: Map<string, Tile> | null = null;

/**
 * Get a tile by a simplified ID format used in lessons
 * Formats: "dot-5", "bamboo-1", "character-9", "wind-east", "dragon-red", etc.
 */
export const getTileById = (simpleId: string): Tile | undefined => {
  if (!_allTiles) {
    _allTiles = TileFactory.getAllTiles();
  }
  if (!_tileMap) {
    _tileMap = new Map();
    _allTiles.forEach(tile => {
      // Create simple lookup keys
      if (tile.number) {
        // Suit tiles: dot-1, bamboo-5, character-9
        _tileMap!.set(`${tile.suit}-${tile.number}`, tile);
      } else if (tile.wind) {
        // Wind tiles: wind-east, wind-south
        _tileMap!.set(`wind-${tile.wind}`, tile);
      } else if (tile.dragon) {
        // Dragon tiles: dragon-red, dragon-green
        _tileMap!.set(`dragon-${tile.dragon}`, tile);
      } else if (tile.flower) {
        // Flower tiles: flower-1, flower-2
        const flowerNum = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'].indexOf(tile.flower) + 1;
        _tileMap!.set(`flower-${flowerNum}`, tile);
      } else if (tile.season) {
        // Season tiles: season-1, season-2
        const seasonNum = ['Spring', 'Summer', 'Autumn', 'Winter'].indexOf(tile.season) + 1;
        _tileMap!.set(`season-${seasonNum}`, tile);
      }
    });
  }
  return _tileMap.get(simpleId);
};

/**
 * Get all tiles (cached)
 */
export const getAllTiles = (): Tile[] => {
  if (!_allTiles) {
    _allTiles = TileFactory.getAllTiles();
  }
  return _allTiles;
};

// JSON conversion helpers
export const tileToJson = (tile: Tile): Record<string, any> => {
  return {
    id: tile.id,
    suit: tile.suit,
    type: tile.type,
    number: tile.number,
    wind: tile.wind,
    dragon: tile.dragon,
    flower: tile.flower,
    season: tile.season,
    nameEnglish: tile.nameEnglish,
    nameChinese: tile.nameChinese,
    nameJapanese: tile.nameJapanese,
    assetPath: tile.assetPath,
  };
};

export const tileFromJson = (json: Record<string, any>): Tile => {
  return {
    id: json.id as string,
    suit: json.suit as TileSuit,
    type: json.type as TileType,
    number: json.number as number | undefined,
    wind: json.wind as WindTile | undefined,
    dragon: json.dragon as DragonTile | undefined,
    flower: json.flower as string | undefined,
    season: json.season as string | undefined,
    nameEnglish: json.nameEnglish as string,
    nameChinese: json.nameChinese as string,
    nameJapanese: json.nameJapanese as string,
    assetPath: json.assetPath as string,
  };
};

