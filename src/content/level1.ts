// Level 1: Basic Tile Identification
// Learn to recognize the 144 tiles in a mahjong set

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  content: string[];
  tiles?: string[]; // tile IDs to display
  quiz?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  type: 'identify' | 'match' | 'multiple-choice';
  question: string;
  tileId?: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
  unlockRequirement?: string;
}

export const Level1: Level = {
  id: 1,
  title: "Know Your Tiles",
  description: "Learn to identify all 144 tiles in a mahjong set",
  lessons: [
    // LESSON 1: Introduction
    {
      id: "1-1",
      title: "Welcome to Mahjong",
      subtitle: "What you're getting into",
      content: [
        "Mahjong is a tile-based game that originated in China during the Qing dynasty.",
        "A standard set has 144 tiles, but don't panic — they follow simple patterns.",
        "Think of it like a deck of cards: once you know the suits, everything clicks.",
        "There are 3 main categories: Suits (numbers), Honors (winds & dragons), and Bonus tiles.",
        "Let's start with the suits — they're the bread and butter of every hand."
      ]
    },

    // LESSON 2: The Dot Suit (Circles/Pins)
    {
      id: "1-2",
      title: "Dots (筒子 / Pinzu)",
      subtitle: "The easiest suit to recognize",
      content: [
        "Dots are exactly what they sound like — circles on the tile.",
        "They're numbered 1-9, with the number shown as actual dots.",
        "1 Dot is a single large circle, often ornate.",
        "2-8 Dots show that many circles arranged in patterns.",
        "9 Dots has 9 circles in a 3x3 grid.",
        "There are 4 copies of each tile (36 Dot tiles total)."
      ],
      tiles: ["dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "dot-7", "dot-8", "dot-9"],
      quiz: [
        {
          id: "q1-2-1",
          type: "identify",
          question: "How many dots are on this tile?",
          tileId: "dot-5",
          options: ["3", "4", "5", "6"],
          correctAnswer: "5",
          explanation: "Count the circles! This tile shows 5 dots arranged in an X pattern."
        },
        {
          id: "q1-2-2",
          type: "multiple-choice",
          question: "How many copies of each Dot tile exist in a standard set?",
          options: ["2", "3", "4", "5"],
          correctAnswer: "4",
          explanation: "Every numbered tile (1-9) has exactly 4 copies in the set."
        }
      ]
    },

    // LESSON 3: The Bamboo Suit (Sticks/Sou)
    {
      id: "1-3",
      title: "Bamboo (索子 / Souzu)",
      subtitle: "Sticks that look like bamboo",
      content: [
        "Bamboo tiles show stick-like shapes, often green and/or red.",
        "They're also numbered 1-9.",
        "⚠️ IMPORTANT: The 1 Bamboo is special — it usually shows a bird (sparrow or peacock), not a stick!",
        "This confuses beginners. Remember: bird = 1 Bamboo.",
        "2-9 Bamboo show that many bamboo sticks.",
        "Like Dots, there are 4 copies of each (36 total)."
      ],
      tiles: ["bamboo-1", "bamboo-2", "bamboo-3", "bamboo-4", "bamboo-5", "bamboo-6", "bamboo-7", "bamboo-8", "bamboo-9"],
      quiz: [
        {
          id: "q1-3-1",
          type: "identify",
          question: "What does the 1 Bamboo tile typically show?",
          tileId: "bamboo-1",
          options: ["One bamboo stick", "A bird", "A flower", "The number 1"],
          correctAnswer: "A bird",
          explanation: "The 1 Bamboo traditionally shows a bird (sparrow or peacock). This catches many beginners off guard!"
        }
      ]
    },

    // LESSON 4: The Character Suit (Wan/Cracks)
    {
      id: "1-4",
      title: "Characters (萬子 / Wanzu)",
      subtitle: "Chinese numbers + 萬",
      content: [
        "Character tiles show Chinese numerals with the character 萬 (wan = 10,000).",
        "These are the hardest for non-Chinese speakers to read at first.",
        "The good news: you only need to memorize 9 symbols.",
        "一 (1), 二 (2), 三 (3) — just count the horizontal lines!",
        "四 (4), 五 (5), 六 (6), 七 (7), 八 (8), 九 (9)",
        "Each tile shows the number ABOVE the 萬 character.",
        "Pro tip: 1-2-3 are just horizontal lines. Learn those first."
      ],
      tiles: ["character-1", "character-2", "character-3", "character-4", "character-5", "character-6", "character-7", "character-8", "character-9"],
      quiz: [
        {
          id: "q1-4-1",
          type: "identify",
          question: "Which number is this Character tile?",
          tileId: "character-3",
          options: ["1", "2", "3", "4"],
          correctAnswer: "3",
          explanation: "三 has three horizontal lines. Easy pattern: count the lines for 1, 2, and 3!"
        },
        {
          id: "q1-4-2",
          type: "multiple-choice",
          question: "What does the 萬 character mean?",
          options: ["Hundred", "Thousand", "Ten thousand", "Million"],
          correctAnswer: "Ten thousand",
          explanation: "萬 means 10,000. So '3-wan' literally means '30,000' but in mahjong it's just the 3 of Characters."
        }
      ]
    },

    // LESSON 5: Wind Tiles
    {
      id: "1-5",
      title: "Wind Tiles (風牌)",
      subtitle: "East, South, West, North",
      content: [
        "Now we enter the Honor tiles. First up: the 4 Winds.",
        "東 (East) — Looks like a tree with the sun behind it",
        "南 (South) — Complex character, memorize by sight",
        "西 (West) — Looks like a bird in a nest (sort of)",
        "北 (North) — Two people standing back-to-back",
        "There are 4 copies of each Wind (16 total).",
        "Winds are important for scoring and determining the dealer."
      ],
      tiles: ["wind-east", "wind-south", "wind-west", "wind-north"],
      quiz: [
        {
          id: "q1-5-1",
          type: "identify",
          question: "Which wind is this?",
          tileId: "wind-east",
          options: ["East", "South", "West", "North"],
          correctAnswer: "East",
          explanation: "東 (East) — This character is important because East is always the dealer/first player."
        }
      ]
    },

    // LESSON 6: Dragon Tiles
    {
      id: "1-6",
      title: "Dragon Tiles (三元牌)",
      subtitle: "Red, Green, and White",
      content: [
        "The 3 Dragons are the other Honor tiles.",
        "🔴 Red Dragon (中 / Chun) — Red character meaning 'center' or 'hit'",
        "🟢 Green Dragon (發 / Hatsu) — Green character meaning 'prosperity'",
        "⬜ White Dragon (白 / Haku) — Usually blank or has a border/frame",
        "There are 4 copies of each Dragon (12 total).",
        "Dragons are valuable for scoring — a set of dragons (3 of a kind) is worth points!"
      ],
      tiles: ["dragon-red", "dragon-green", "dragon-white"],
      quiz: [
        {
          id: "q1-6-1",
          type: "identify",
          question: "A blank or plain framed tile is which dragon?",
          tileId: "dragon-white",
          options: ["Red Dragon", "Green Dragon", "White Dragon", "Not a dragon"],
          correctAnswer: "White Dragon",
          explanation: "The White Dragon (白板) is often blank or shows just a frame. Don't confuse it with a missing tile!"
        }
      ]
    },

    // LESSON 7: Bonus Tiles (Flowers & Seasons)
    {
      id: "1-7",
      title: "Bonus Tiles (花牌)",
      subtitle: "Flowers and Seasons — optional but fun",
      content: [
        "Many sets include 8 Bonus tiles: 4 Flowers and 4 Seasons.",
        "🌸 Flowers: Plum, Orchid, Chrysanthemum, Bamboo",
        "🍂 Seasons: Spring, Summer, Autumn, Winter",
        "These are optional in some variants (Japanese Riichi doesn't use them).",
        "When drawn, you usually set them aside and draw a replacement.",
        "They give bonus points at the end — free points!",
        "Only 1 copy of each exists (8 total)."
      ],
      tiles: ["flower-1", "flower-2", "flower-3", "flower-4", "season-1", "season-2", "season-3", "season-4"]
    },

    // LESSON 8: Summary & Practice
    {
      id: "1-8",
      title: "Level 1 Complete!",
      subtitle: "Let's make sure it stuck",
      content: [
        "🎉 You now know all 144 tiles!",
        "",
        "Quick recap:",
        "• 3 Suits × 9 numbers × 4 copies = 108 tiles",
        "• 4 Winds × 4 copies = 16 tiles",
        "• 3 Dragons × 4 copies = 12 tiles",
        "• 4 Flowers + 4 Seasons = 8 tiles",
        "• Total: 144 tiles",
        "",
        "Up next in Level 2: How to combine tiles into sets (Pungs, Chows, Kongs).",
        "But first, let's test what you've learned..."
      ],
      quiz: [
        {
          id: "q1-8-1",
          type: "multiple-choice",
          question: "How many tiles are in a standard mahjong set?",
          options: ["108", "126", "136", "144"],
          correctAnswer: "144",
          explanation: "A standard set has 144 tiles. Some variants use fewer (Japanese Riichi uses 136 — no flowers/seasons)."
        },
        {
          id: "q1-8-2",
          type: "multiple-choice",
          question: "Which suit tile shows a bird instead of its number?",
          options: ["1 Dot", "1 Bamboo", "1 Character", "East Wind"],
          correctAnswer: "1 Bamboo",
          explanation: "The 1 Bamboo traditionally shows a bird. Classic beginner trap!"
        },
        {
          id: "q1-8-3",
          type: "multiple-choice",
          question: "What does a blank or frame-only tile represent?",
          options: ["Missing tile", "White Dragon", "Wild card", "Joker"],
          correctAnswer: "White Dragon",
          explanation: "The White Dragon (白板) is often blank. It's not a missing tile — it's valuable!"
        }
      ]
    }
  ]
};

export default Level1;
