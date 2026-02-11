import '../../models/meld.dart';
import '../../models/tile.dart';

/// Represents a winning pattern with its faan value
class ScoringPattern {
  final String name;
  final String chineseName;
  final int faan;
  final String description;

  const ScoringPattern({
    required this.name,
    required this.chineseName,
    required this.faan,
    required this.description,
  });
}

/// All Hong Kong Mahjong scoring patterns
class HongKongPatterns {
  HongKongPatterns._();

  // ===== 1 FAAN PATTERNS =====

  static const allChows = ScoringPattern(
    name: 'All Chows',
    chineseName: '平和',
    faan: 1,
    description: 'Hand consists entirely of chows (sequences) and a pair',
  );

  static const concealedHand = ScoringPattern(
    name: 'Concealed Hand',
    chineseName: '門前清',
    faan: 1,
    description: 'No exposed melds, win by self-draw',
  );

  static const selfDrawn = ScoringPattern(
    name: 'Self-Drawn',
    chineseName: '自摸',
    faan: 1,
    description: 'Win by drawing the winning tile yourself',
  );

  static const noFlowers = ScoringPattern(
    name: 'No Flowers',
    chineseName: '無花',
    faan: 1,
    description: 'No flower or season tiles',
  );

  static const seatWind = ScoringPattern(
    name: 'Seat Wind',
    chineseName: '門風',
    faan: 1,
    description: 'Pong/Kong of your seat wind',
  );

  static const prevailingWind = ScoringPattern(
    name: 'Prevailing Wind',
    chineseName: '圈風',
    faan: 1,
    description: 'Pong/Kong of the round wind',
  );

  static const dragonPong = ScoringPattern(
    name: 'Dragon Pong',
    chineseName: '番牌',
    faan: 1,
    description: 'Pong/Kong of any dragon',
  );

  static const flowerBonus = ScoringPattern(
    name: 'Flower Bonus',
    chineseName: '花牌',
    faan: 1,
    description: 'Each flower or season matching your seat',
  );

  // ===== 2 FAAN PATTERNS =====

  static const allFlowers = ScoringPattern(
    name: 'All Flowers',
    chineseName: '一台花',
    faan: 2,
    description: 'Complete set of 4 flowers',
  );

  static const allSeasons = ScoringPattern(
    name: 'All Seasons',
    chineseName: '一台季',
    faan: 2,
    description: 'Complete set of 4 seasons',
  );

  // ===== 3 FAAN PATTERNS =====

  static const allPongs = ScoringPattern(
    name: 'All Pongs',
    chineseName: '對對和',
    faan: 3,
    description: 'Hand consists entirely of pongs/kongs and a pair',
  );

  static const halfFlush = ScoringPattern(
    name: 'Half Flush',
    chineseName: '混一色',
    faan: 3,
    description: 'One suit plus honors',
  );

  static const smallDragons = ScoringPattern(
    name: 'Small Dragons',
    chineseName: '小三元',
    faan: 3,
    description: 'Two dragon pongs and a dragon pair',
  );

  // ===== 5 FAAN PATTERNS =====

  static const smallWinds = ScoringPattern(
    name: 'Small Winds',
    chineseName: '小四喜',
    faan: 5,
    description: 'Three wind pongs and a wind pair',
  );

  // ===== 6 FAAN PATTERNS =====

  static const fullFlush = ScoringPattern(
    name: 'Full Flush',
    chineseName: '清一色',
    faan: 6,
    description: 'Entire hand in one suit, no honors',
  );

  // ===== 8 FAAN PATTERNS =====

  static const bigDragons = ScoringPattern(
    name: 'Big Dragons',
    chineseName: '大三元',
    faan: 8,
    description: 'Pong/Kong of all three dragons',
  );

  // ===== 10 FAAN PATTERNS =====

  static const allHonors = ScoringPattern(
    name: 'All Honors',
    chineseName: '字一色',
    faan: 10,
    description: 'Entire hand consists of honor tiles only',
  );

  static const allTerminals = ScoringPattern(
    name: 'All Terminals',
    chineseName: '清老頭',
    faan: 10,
    description: 'Entire hand consists of 1s and 9s only',
  );

  // ===== 13 FAAN (LIMIT) PATTERNS =====

  static const thirteenOrphans = ScoringPattern(
    name: 'Thirteen Orphans',
    chineseName: '十三幺',
    faan: 13,
    description: 'All 13 terminals and honors, plus one duplicate',
  );

  static const nineGates = ScoringPattern(
    name: 'Nine Gates',
    chineseName: '九蓮寶燈',
    faan: 13,
    description: '1112345678999 in one suit plus any tile of that suit',
  );

  static const bigWinds = ScoringPattern(
    name: 'Big Winds',
    chineseName: '大四喜',
    faan: 13,
    description: 'Pong/Kong of all four winds',
  );

  static const allKongs = ScoringPattern(
    name: 'All Kongs',
    chineseName: '十八羅漢',
    faan: 13,
    description: 'Four kongs and a pair',
  );

  static const heavenlyHand = ScoringPattern(
    name: 'Heavenly Hand',
    chineseName: '天和',
    faan: 13,
    description: 'Dealer wins on initial deal',
  );

  static const earthlyHand = ScoringPattern(
    name: 'Earthly Hand',
    chineseName: '地和',
    faan: 13,
    description: 'Non-dealer wins on first draw',
  );

  /// Maximum faan (limit)
  static const int maxFaan = 13;

  /// Minimum faan required to win
  static const int minFaan = 3;
}
