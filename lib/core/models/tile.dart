import 'package:equatable/equatable.dart';

/// Represents the suit/category of a mahjong tile
enum TileSuit {
  bamboo('Bamboo', '索'),
  character('Character', '萬'),
  dot('Dot', '筒'),
  wind('Wind', '風'),
  dragon('Dragon', '三元'),
  flower('Flower', '花'),
  season('Season', '季');

  final String english;
  final String chinese;
  const TileSuit(this.english, this.chinese);
}

/// Represents the type category of a tile
enum TileType {
  suit,   // Bamboo, Character, Dot (1-9)
  honor,  // Wind, Dragon
  bonus,  // Flower, Season
}

/// Wind directions for wind tiles
enum Wind {
  east('East', '東', '東'),
  south('South', '南', '南'),
  west('West', '西', '西'),
  north('North', '北', '北');

  final String english;
  final String chinese;
  final String japanese;
  const Wind(this.english, this.chinese, this.japanese);
}

/// Dragon types
enum Dragon {
  red('Red Dragon', '中', '中'),
  green('Green Dragon', '發', '發'),
  white('White Dragon', '白', '白');

  final String english;
  final String chinese;
  final String japanese;
  const Dragon(this.english, this.chinese, this.japanese);
}

/// Represents a single mahjong tile
class Tile extends Equatable {
  final String id;
  final TileSuit suit;
  final TileType type;
  final int? number;      // 1-9 for suit tiles
  final Wind? wind;       // For wind tiles
  final Dragon? dragon;   // For dragon tiles
  final String? bonus;    // Flower or Season name
  final int copyIndex;    // Which copy (1-4) of this tile

  const Tile({
    required this.id,
    required this.suit,
    required this.type,
    this.number,
    this.wind,
    this.dragon,
    this.bonus,
    required this.copyIndex,
  });

  /// Get the English name of the tile
  String get nameEnglish {
    if (number != null) {
      return '${_numberToWord(number!)} ${suit.english}';
    }
    if (wind != null) return wind!.english;
    if (dragon != null) return dragon!.english;
    if (bonus != null) return bonus!;
    return suit.english;
  }

  /// Get the Chinese name of the tile
  String get nameChinese {
    if (number != null) {
      return '${_numberToChinese(number!)}${suit.chinese}';
    }
    if (wind != null) return '${wind!.chinese}風';
    if (dragon != null) return dragon!.chinese;
    if (bonus != null) return bonus!;
    return suit.chinese;
  }

  /// Get the Japanese name of the tile
  String get nameJapanese {
    if (number != null) {
      return '${_numberToJapanese(number!)}${_suitToJapanese(suit)}';
    }
    if (wind != null) return wind!.japanese;
    if (dragon != null) return dragon!.japanese;
    if (bonus != null) return bonus!;
    return suit.english;
  }

  /// Get the asset path for the tile SVG
  String get assetPath {
    if (number != null) {
      return 'assets/tiles/${suit.name}_$number.svg';
    }
    if (wind != null) {
      return 'assets/tiles/wind_${wind!.name}.svg';
    }
    if (dragon != null) {
      return 'assets/tiles/dragon_${dragon!.name}.svg';
    }
    if (suit == TileSuit.flower) {
      return 'assets/tiles/flower_$copyIndex.svg';
    }
    if (suit == TileSuit.season) {
      return 'assets/tiles/season_$copyIndex.svg';
    }
    return 'assets/tiles/unknown.svg';
  }

  /// Check if this tile can form a sequence with others (only suit tiles 1-9)
  bool get canFormSequence => type == TileType.suit && number != null;

  /// Check if this is a terminal tile (1 or 9 of any suit)
  bool get isTerminal => number == 1 || number == 9;

  /// Check if this is an honor tile (wind or dragon)
  bool get isHonor => type == TileType.honor;

  /// Check if this is a bonus tile (flower or season)
  bool get isBonus => type == TileType.bonus;

  /// Check if two tiles match (same suit and number/type, ignoring copy index)
  bool matches(Tile other) {
    if (suit != other.suit) return false;
    if (number != null) return number == other.number;
    if (wind != null) return wind == other.wind;
    if (dragon != null) return dragon == other.dragon;
    if (bonus != null) return bonus == other.bonus;
    return false;
  }

  /// Get a unique key for this tile type (ignoring copy index)
  /// Used for grouping and comparing tiles
  String get tileKey {
    if (number != null) {
      return '${suit.name}-$number';
    }
    if (wind != null) {
      return 'wind-${wind!.name}';
    }
    if (dragon != null) {
      return 'dragon-${dragon!.name}';
    }
    if (bonus != null) {
      return '${suit.name}-$bonus';
    }
    return suit.name;
  }

  /// Create a suit tile (bamboo, character, or dot with a number 1-9)
  static Tile suit(TileSuit tileSuit, int tileNumber, {int copyIndex = 1}) {
    assert(tileNumber >= 1 && tileNumber <= 9);
    assert(tileSuit == TileSuit.bamboo ||
           tileSuit == TileSuit.character ||
           tileSuit == TileSuit.dot);
    return Tile(
      id: '${tileSuit.name}_${tileNumber}_$copyIndex',
      suit: tileSuit,
      type: TileType.suit,
      number: tileNumber,
      copyIndex: copyIndex,
    );
  }

  /// Create a wind tile
  static Tile wind(Wind tileWind, {int copyIndex = 1}) {
    return Tile(
      id: 'wind_${tileWind.name}_$copyIndex',
      suit: TileSuit.wind,
      type: TileType.honor,
      wind: tileWind,
      copyIndex: copyIndex,
    );
  }

  /// Create a dragon tile
  static Tile dragon(Dragon tileDragon, {int copyIndex = 1}) {
    return Tile(
      id: 'dragon_${tileDragon.name}_$copyIndex',
      suit: TileSuit.dragon,
      type: TileType.honor,
      dragon: tileDragon,
      copyIndex: copyIndex,
    );
  }

  @override
  List<Object?> get props => [id, suit, type, number, wind, dragon, bonus, copyIndex];

  static String _numberToWord(int n) {
    const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    return words[n];
  }

  static String _numberToChinese(int n) {
    const chinese = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return chinese[n];
  }

  static String _numberToJapanese(int n) {
    const japanese = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return japanese[n];
  }

  static String _suitToJapanese(TileSuit suit) {
    switch (suit) {
      case TileSuit.bamboo: return '索';
      case TileSuit.character: return '萬';
      case TileSuit.dot: return '筒';
      default: return '';
    }
  }
}

/// Factory to generate all 144 tiles
class TileFactory {
  TileFactory._();

  /// Generate the complete set of 144 mahjong tiles
  static List<Tile> createFullSet() {
    final tiles = <Tile>[];

    // Suit tiles: 3 suits x 9 numbers x 4 copies = 108 tiles
    for (final suit in [TileSuit.bamboo, TileSuit.character, TileSuit.dot]) {
      for (var number = 1; number <= 9; number++) {
        for (var copy = 1; copy <= 4; copy++) {
          tiles.add(Tile(
            id: '${suit.name}_${number}_$copy',
            suit: suit,
            type: TileType.suit,
            number: number,
            copyIndex: copy,
          ));
        }
      }
    }

    // Wind tiles: 4 winds x 4 copies = 16 tiles
    for (final wind in Wind.values) {
      for (var copy = 1; copy <= 4; copy++) {
        tiles.add(Tile(
          id: 'wind_${wind.name}_$copy',
          suit: TileSuit.wind,
          type: TileType.honor,
          wind: wind,
          copyIndex: copy,
        ));
      }
    }

    // Dragon tiles: 3 dragons x 4 copies = 12 tiles
    for (final dragon in Dragon.values) {
      for (var copy = 1; copy <= 4; copy++) {
        tiles.add(Tile(
          id: 'dragon_${dragon.name}_$copy',
          suit: TileSuit.dragon,
          type: TileType.honor,
          dragon: dragon,
          copyIndex: copy,
        ));
      }
    }

    // Flower tiles: 4 unique flowers = 4 tiles
    const flowers = ['Plum Blossom', 'Orchid', 'Chrysanthemum', 'Bamboo'];
    for (var i = 0; i < flowers.length; i++) {
      tiles.add(Tile(
        id: 'flower_${i + 1}',
        suit: TileSuit.flower,
        type: TileType.bonus,
        bonus: flowers[i],
        copyIndex: i + 1,
      ));
    }

    // Season tiles: 4 unique seasons = 4 tiles
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    for (var i = 0; i < seasons.length; i++) {
      tiles.add(Tile(
        id: 'season_${i + 1}',
        suit: TileSuit.season,
        type: TileType.bonus,
        bonus: seasons[i],
        copyIndex: i + 1,
      ));
    }

    assert(tiles.length == 144, 'Expected 144 tiles, got ${tiles.length}');
    return tiles;
  }

  /// Create a shuffled set of tiles for a new game
  static List<Tile> createShuffledSet() {
    final tiles = createFullSet();
    tiles.shuffle();
    return tiles;
  }
}
