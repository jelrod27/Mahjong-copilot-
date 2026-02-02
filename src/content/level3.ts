// Level 3: Hand Combinations & Scoring Fundamentals
// Learn common winning hand patterns and basic scoring concepts

import {Lesson, QuizQuestion, Level} from './level1';

export const Level3: Level = {
  id: 3,
  title: "Hand Combinations & Scoring",
  description: "Learn common winning patterns and how hands are scored",
  unlockRequirement: "Complete Level 2",
  lessons: [
    // LESSON 1: Winning Hand Structure
    {
      id: "3-1",
      title: "The Winning Formula",
      subtitle: "4 sets + 1 pair = win",
      content: [
        "Every winning mahjong hand follows the same formula:",
        "",
        "4 SETS + 1 PAIR = 14 TILES",
        "",
        "The 4 sets can be any combination of:",
        "• Pungs (3 identical tiles)",
        "• Chows (3 consecutive tiles)",
        "• Kongs (4 identical tiles — counts as 1 set)",
        "",
        "The pair (2 identical tiles) is called the 'eyes' or 'head'.",
        "",
        "Example winning hand:",
        "• Pung of Red Dragons",
        "• Chow: 2-3-4 of Characters",
        "• Chow: 5-6-7 of Dots",
        "• Pung of North Winds",
        "• Pair of 8-Bamboo",
        "",
        "That's 3+3+3+3+2 = 14 tiles. WIN!"
      ],
      quiz: [
        {
          id: "q3-1-1",
          type: "multiple-choice",
          question: "How many tiles are in a winning hand?",
          options: ["12", "13", "14", "16"],
          correctAnswer: "14",
          explanation: "4 sets (12 tiles) + 1 pair (2 tiles) = 14 tiles total."
        },
        {
          id: "q3-1-2",
          type: "multiple-choice",
          question: "Which of these is NOT required for a winning hand?",
          options: ["4 sets", "1 pair", "At least 1 Kong", "Exactly 14 tiles"],
          correctAnswer: "At least 1 Kong",
          explanation: "Kongs are optional! You can win with 4 Pungs, or 4 Chows, or any mix. No Kong required."
        }
      ]
    },

    // LESSON 2: All Pungs Hand
    {
      id: "3-2",
      title: "All Pungs (對對和)",
      subtitle: "When you love triplets",
      content: [
        "An ALL PUNGS hand (also called All Triplets) is exactly what it sounds like:",
        "",
        "4 Pungs + 1 Pair",
        "",
        "Example:",
        "• Pung of 3-Dots",
        "• Pung of 7-Bamboo",
        "• Pung of White Dragons",
        "• Pung of East Winds",
        "• Pair of South Winds",
        "",
        "All Pungs hands are worth extra points in most scoring systems.",
        "They're harder to get because you need so many identical tiles.",
        "",
        "Pro tip: If you have 2-3 pairs early, consider going for All Pungs!"
      ],
      tiles: ["dot-3", "dot-3", "dot-3", "bamboo-7", "bamboo-7", "bamboo-7", "dragon-white", "dragon-white", "dragon-white", "wind-east", "wind-east", "wind-east", "wind-south", "wind-south"],
      quiz: [
        {
          id: "q3-2-1",
          type: "multiple-choice",
          question: "An All Pungs hand contains how many Pungs?",
          options: ["2", "3", "4", "5"],
          correctAnswer: "4",
          explanation: "All Pungs = 4 Pungs + 1 Pair. The 4 Pungs give you 12 tiles, the pair gives you 2, totaling 14."
        }
      ]
    },

    // LESSON 3: All Chows Hand
    {
      id: "3-3",
      title: "All Chows (平和)",
      subtitle: "The smooth hand",
      content: [
        "An ALL CHOWS hand (called Pinfu in Japanese) uses only sequences:",
        "",
        "4 CHOWS + 1 PAIR",
        "",
        "Example:",
        "• Chow: 1-2-3 of Dots",
        "• Chow: 4-5-6 of Dots",
        "• Chow: 2-3-4 of Bamboo",
        "• Chow: 6-7-8 of Characters",
        "• Pair of 5-Bamboo",
        "",
        "Important rules for All Chows:",
        "• The pair cannot be honor tiles (Winds/Dragons) in many variants",
        "• The hand must be 'open' (no Kongs)",
        "• Usually needs to be completed on a specific tile (not self-drawn)",
        "",
        "All Chows is a common, flexible hand pattern."
      ],
      tiles: ["dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "bamboo-2", "bamboo-3", "bamboo-4", "character-6", "character-7", "character-8", "bamboo-5", "bamboo-5"],
      quiz: [
        {
          id: "q3-3-1",
          type: "multiple-choice",
          question: "Can an All Chows hand contain a Pung?",
          options: ["Yes, one Pung is allowed", "No, only Chows allowed", "Yes, if it's a Kong", "Only in Chinese variants"],
          correctAnswer: "No, only Chows allowed",
          explanation: "All Chows means ALL sequences. No Pungs, no Kongs — just Chows and a pair."
        }
      ]
    },

    // LESSON 4: Mixed Hand
    {
      id: "3-4",
      title: "Mixed Hand",
      subtitle: "The most common pattern",
      content: [
        "Most winning hands are MIXED — some Pungs, some Chows.",
        "",
        "Examples:",
        "",
        "Hand A (2 Pungs, 2 Chows):",
        "• Pung of Red Dragons",
        "• Pung of East Winds",
        "• Chow: 2-3-4 of Bamboo",
        "• Chow: 6-7-8 of Dots",
        "• Pair of 9-Characters",
        "",
        "Hand B (1 Pung, 3 Chows):",
        "• Pung of Green Dragons",
        "• Chow: 1-2-3 of Characters",
        "• Chow: 4-5-6 of Characters",
        "• Chow: 7-8-9 of Bamboo",
        "• Pair of North Winds",
        "",
        "Mixed hands are easier to achieve than All Pungs or All Chows."
      ],
      quiz: [
        {
          id: "q3-4-1",
          type: "multiple-choice",
          question: "Which hand configuration is most common?",
          options: ["All Pungs", "All Chows", "Mixed (Pungs + Chows)", "Seven Pairs"],
          correctAnswer: "Mixed (Pungs + Chows)",
          explanation: "Mixed hands are most flexible and easiest to build. All Pungs and All Chows are special patterns that are harder to achieve."
        }
      ]
    },

    // LESSON 5: Honors & Suit Mix
    {
      id: "3-5",
      title: "Using Honor Tiles",
      subtitle: "Winds and Dragons in your hand",
      content: [
        "Honor tiles (Winds and Dragons) can only form Pungs or Kongs — NOT Chows.",
        "",
        "This makes them predictable but valuable.",
        "",
        "Example hand with honors:",
        "• Pung of Red Dragons (honor)",
        "• Pung of East Winds (honor)",
        "• Chow: 3-4-5 of Dots (suit)",
        "• Chow: 6-7-8 of Bamboo (suit)",
        "• Pair of White Dragons (honor)",
        "",
        "This hand has:",
        "• 3 Honor sets (2 Pungs + 1 Pair)",
        "• 2 Suit sets (2 Chows)",
        "",
        "Honor tiles are worth points in most scoring systems.",
        "Dragon Pungs and Wind Pungs add value to your hand!"
      ],
      tiles: ["dragon-red", "dragon-red", "dragon-red", "wind-east", "wind-east", "wind-east", "dot-3", "dot-4", "dot-5", "bamboo-6", "bamboo-7", "bamboo-8", "dragon-white", "dragon-white"],
      quiz: [
        {
          id: "q3-5-1",
          type: "multiple-choice",
          question: "Can Winds form a Chow?",
          options: ["Yes: East-South-West", "Yes: East-South-North", "No, Winds can only be Pungs", "Only in Hong Kong rules"],
          correctAnswer: "No, Winds can only be Pungs",
          explanation: "Honor tiles (Winds and Dragons) cannot form sequences. They can only be Pungs (3) or Kongs (4)."
        }
      ]
    },

    // LESSON 6: Basic Scoring Concepts
    {
      id: "3-6",
      title: "How Scoring Works",
      subtitle: "Points, doubles, and limits",
      content: [
        "Scoring in mahjong varies by region, but the basics are similar:",
        "",
        "1. BASE POINTS",
        "Every hand has a base value based on:",
        "• What sets it contains (Pungs of Dragons are worth more)",
        "• How the hand was won (self-drawn vs discard)",
        "• Whether the hand was 'concealed' (no open sets)",
        "",
        "2. DOUBLES (FAN)",
        "Special patterns multiply the score:",
        "• All Pungs: 2-3 doubles",
        "• All Chows: 1 double",
        "• Hand with all 3 Dragons: Big limit hand!",
        "",
        "3. LIMIT HANDS",
        "Rare hands score maximum points:",
        "• All Honors (all tiles are Winds/Dragons)",
        "• All Terminals (all 1s and 9s)",
        "• Nine Gates (specific 1-9 pattern)",
        "",
        "Don't worry about exact numbers yet — just know that special patterns = more points!"
      ],
      quiz: [
        {
          id: "q3-6-1",
          type: "multiple-choice",
          question: "What increases a hand's score?",
          options: ["Having more Chows than Pungs", "Including Dragon Pungs", "Using only Bamboo tiles", "Winning on the first turn"],
          correctAnswer: "Including Dragon Pungs",
          explanation: "Dragon Pungs (and Wind Pungs) add value. Chows are neutral. Special honor tiles = more points!"
        }
      ]
    },

    // LESSON 7: Hand Building Practice
    {
      id: "3-7",
      title: "Build a Winning Hand",
      subtitle: "Interactive practice",
      content: [
        "Time to practice building complete winning hands!",
        "",
        "Remember the formula: 4 SETS + 1 PAIR",
        "",
        "Try building:",
        "• An All Pungs hand",
        "• An All Chows hand",
        "• A Mixed hand",
        "• A hand with multiple honor Pungs",
        "",
        "Tips:",
        "• Start by picking your pair (2 identical tiles)",
        "• Then build 4 sets around it",
        "• Remember: Chows only work with suit tiles",
        "• Honors can only be Pungs/Kongs"
      ],
      interactiveType: 'set-builder',
      interactiveData: {
        availableTileIds: [
          // Full set for hand building
          "dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "dot-7", "dot-8", "dot-9",
          "dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "dot-7", "dot-8", "dot-9",
          "bamboo-1", "bamboo-2", "bamboo-3", "bamboo-4", "bamboo-5", "bamboo-6", "bamboo-7", "bamboo-8", "bamboo-9",
          "bamboo-1", "bamboo-2", "bamboo-3", "bamboo-4", "bamboo-5", "bamboo-6", "bamboo-7", "bamboo-8", "bamboo-9",
          "character-1", "character-2", "character-3", "character-4", "character-5", "character-6", "character-7", "character-8", "character-9",
          "character-1", "character-2", "character-3", "character-4", "character-5", "character-6", "character-7", "character-8", "character-9",
          // Multiple copies of honors
          "wind-east", "wind-east", "wind-east", "wind-east",
          "wind-south", "wind-south", "wind-south", "wind-south",
          "wind-west", "wind-west", "wind-west", "wind-west",
          "wind-north", "wind-north", "wind-north", "wind-north",
          "dragon-red", "dragon-red", "dragon-red", "dragon-red",
          "dragon-green", "dragon-green", "dragon-green", "dragon-green",
          "dragon-white", "dragon-white", "dragon-white", "dragon-white",
        ]
      }
    },

    // LESSON 8: Summary
    {
      id: "3-8",
      title: "Level 3 Complete!",
      subtitle: "You know hand patterns",
      content: [
        "🎉 You now understand how winning hands are built!",
        "",
        "Quick recap:",
        "• Winning hand = 4 sets + 1 pair (14 tiles)",
        "• All Pungs = 4 Pungs + pair (worth more)",
        "• All Chows = 4 Chows + pair (flexible)",
        "• Mixed = any combo of Pungs/Chows + pair",
        "• Honors add value (Dragons/Winds score points)",
        "• Special hands = special scores",
        "",
        "Up next in Level 4: Advanced scoring and special hands!"
      ],
      quiz: [
        {
          id: "q3-8-1",
          type: "multiple-choice",
          question: "An All Pungs hand scores more than a Mixed hand because:",
          options: ["It has more tiles", "It's harder to achieve", "It uses only red tiles", "It's required for winning"],
          correctAnswer: "It's harder to achieve",
          explanation: "All Pungs is harder (need many identical tiles) so it's worth more points. Rarity = value!"
        },
        {
          id: "q3-8-2",
          type: "multiple-choice",
          question: "Which tiles can form a Chow?",
          options: ["Only Dots", "Any suit tiles (Dots/Bamboo/Characters)", "Only Winds", "Any tile"],
          correctAnswer: "Any suit tiles (Dots/Bamboo/Characters)",
          explanation: "Chows need consecutive numbers, so only suit tiles work. Winds and Dragons can't form sequences."
        }
      ]
    }
  ]
};

export default Level3;
