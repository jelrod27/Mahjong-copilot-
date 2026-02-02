enum TileSuit {
  bamboo, // 索子
  character, // 萬子
  dot, // 筒子
  wind, // 風牌
  dragon, // 三元牌
  flower, // 花牌
  season, // 季牌
}

enum TileType {
  suit, // Numbered tiles (1-9)
  honor, // Winds and dragons
  bonus, // Flowers and seasons
}

enum WindTile {
  east, // 東
  south, // 南
  west, // 西
  north, // 北
}

enum DragonTile {
  red, // 中
  green, // 發
  white, // 白
}

class Tile {
  final String id;
  final TileSuit suit;
  final TileType type;
  final int? number; // 1-9 for suit tiles, null for honors/bonus
  final WindTile? wind; // For wind tiles
  final DragonTile? dragon; // For dragon tiles
  final String? flower; // For flower tiles
  final String? season; // For season tiles
  final String nameEnglish;
  final String nameChinese;
  final String nameJapanese;
  final String assetPath; // SVG asset path

  const Tile({
    required this.id,
    required this.suit,
    required this.type,
    this.number,
    this.wind,
    this.dragon,
    this.flower,
    this.season,
    required this.nameEnglish,
    required this.nameChinese,
    required this.nameJapanese,
    required this.assetPath,
  });

  String get displayName => nameEnglish;
  
  String get category {
    switch (suit) {
      case TileSuit.bamboo:
        return 'bamboo';
      case TileSuit.character:
        return 'character';
      case TileSuit.dot:
        return 'dot';
      case TileSuit.wind:
        return 'wind';
      case TileSuit.dragon:
        return 'dragon';
      case TileSuit.flower:
        return 'flower';
      case TileSuit.season:
        return 'season';
    }
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'suit': suit.name,
        'type': type.name,
        'number': number,
        'wind': wind?.name,
        'dragon': dragon?.name,
        'flower': flower,
        'season': season,
        'nameEnglish': nameEnglish,
        'nameChinese': nameChinese,
        'nameJapanese': nameJapanese,
        'assetPath': assetPath,
      };

  factory Tile.fromJson(Map<String, dynamic> json) => Tile(
        id: json['id'] as String,
        suit: TileSuit.values.firstWhere((e) => e.name == json['suit']),
        type: TileType.values.firstWhere((e) => e.name == json['type']),
        number: json['number'] as int?,
        wind: json['wind'] != null
            ? WindTile.values.firstWhere((e) => e.name == json['wind'])
            : null,
        dragon: json['dragon'] != null
            ? DragonTile.values.firstWhere((e) => e.name == json['dragon'])
            : null,
        flower: json['flower'] as String?,
        season: json['season'] as String?,
        nameEnglish: json['nameEnglish'] as String,
        nameChinese: json['nameChinese'] as String,
        nameJapanese: json['nameJapanese'] as String,
        assetPath: json['assetPath'] as String,
      );
}

// Tile factory for creating all 144 tiles
class TileFactory {
  static List<Tile> getAllTiles() {
    final tiles = <Tile>[];
    
    // Suit tiles (1-9, 4 copies each)
    for (final suit in [TileSuit.bamboo, TileSuit.character, TileSuit.dot]) {
      for (int i = 1; i <= 9; i++) {
        final name = _getSuitTileName(suit, i);
        for (int copy = 1; copy <= 4; copy++) {
          tiles.add(Tile(
            id: '${suit.name}_${i}_$copy',
            suit: suit,
            type: TileType.suit,
            number: i,
            nameEnglish: name['en']!,
            nameChinese: name['zh']!,
            nameJapanese: name['ja']!,
            assetPath: 'assets/tiles/${suit.name}_$i.svg',
          ));
        }
      }
    }
    
    // Wind tiles (4 copies each)
    for (final wind in WindTile.values) {
      final name = _getWindTileName(wind);
      for (int copy = 1; copy <= 4; copy++) {
        tiles.add(Tile(
          id: 'wind_${wind.name}_$copy',
          suit: TileSuit.wind,
          type: TileType.honor,
          wind: wind,
          nameEnglish: name['en']!,
          nameChinese: name['zh']!,
          nameJapanese: name['ja']!,
          assetPath: 'assets/tiles/wind_${wind.name}.svg',
        ));
      }
    }
    
    // Dragon tiles (4 copies each)
    for (final dragon in DragonTile.values) {
      final name = _getDragonTileName(dragon);
      for (int copy = 1; copy <= 4; copy++) {
        tiles.add(Tile(
          id: 'dragon_${dragon.name}_$copy',
          suit: TileSuit.dragon,
          type: TileType.honor,
          dragon: dragon,
          nameEnglish: name['en']!,
          nameChinese: name['zh']!,
          nameJapanese: name['ja']!,
          assetPath: 'assets/tiles/dragon_${dragon.name}.svg',
        ));
      }
    }
    
    // Flower tiles (1 copy each)
    final flowers = ['Plum', 'Orchid', 'Chrysanthemum', 'Bamboo'];
    for (int i = 0; i < flowers.length; i++) {
      tiles.add(Tile(
        id: 'flower_${i + 1}',
        suit: TileSuit.flower,
        type: TileType.bonus,
        flower: flowers[i],
        nameEnglish: '${flowers[i]} Flower',
        nameChinese: '${flowers[i]}花',
        nameJapanese: '${flowers[i]}の花',
        assetPath: 'assets/tiles/flower_${i + 1}.svg',
      ));
    }
    
    // Season tiles (1 copy each)
    final seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    for (int i = 0; i < seasons.length; i++) {
      tiles.add(Tile(
        id: 'season_${i + 1}',
        suit: TileSuit.season,
        type: TileType.bonus,
        season: seasons[i],
        nameEnglish: '${seasons[i]} Season',
        nameChinese: '${seasons[i]}季',
        nameJapanese: '${seasons[i]}の季節',
        assetPath: 'assets/tiles/season_${i + 1}.svg',
      ));
    }
    
    return tiles;
  }

  static Map<String, String> _getSuitTileName(TileSuit suit, int number) {
    final suitNames = {
      TileSuit.bamboo: {'en': 'Bamboo', 'zh': '索', 'ja': '索'},
      TileSuit.character: {'en': 'Character', 'zh': '萬', 'ja': '萬'},
      TileSuit.dot: {'en': 'Dot', 'zh': '筒', 'ja': '筒'},
    };
    
    final numbers = {
      1: {'en': 'One', 'zh': '一', 'ja': '一'},
      2: {'en': 'Two', 'zh': '二', 'ja': '二'},
      3: {'en': 'Three', 'zh': '三', 'ja': '三'},
      4: {'en': 'Four', 'zh': '四', 'ja': '四'},
      5: {'en': 'Five', 'zh': '五', 'ja': '五'},
      6: {'en': 'Six', 'zh': '六', 'ja': '六'},
      7: {'en': 'Seven', 'zh': '七', 'ja': '七'},
      8: {'en': 'Eight', 'zh': '八', 'ja': '八'},
      9: {'en': 'Nine', 'zh': '九', 'ja': '九'},
    };
    
    return {
      'en': '${numbers[number]!['en']} ${suitNames[suit]!['en']}',
      'zh': '${numbers[number]!['zh']}${suitNames[suit]!['zh']}',
      'ja': '${numbers[number]!['ja']}${suitNames[suit]!['ja']}',
    };
  }

  static Map<String, String> _getWindTileName(WindTile wind) {
    final names = {
      WindTile.east: {'en': 'East Wind', 'zh': '東風', 'ja': '東'},
      WindTile.south: {'en': 'South Wind', 'zh': '南風', 'ja': '南'},
      WindTile.west: {'en': 'West Wind', 'zh': '西風', 'ja': '西'},
      WindTile.north: {'en': 'North Wind', 'zh': '北風', 'ja': '北'},
    };
    return names[wind]!;
  }

  static Map<String, String> _getDragonTileName(DragonTile dragon) {
    final names = {
      DragonTile.red: {'en': 'Red Dragon', 'zh': '中', 'ja': '中'},
      DragonTile.green: {'en': 'Green Dragon', 'zh': '發', 'ja': '發'},
      DragonTile.white: {'en': 'White Dragon', 'zh': '白', 'ja': '白'},
    };
    return names[dragon]!;
  }
}

