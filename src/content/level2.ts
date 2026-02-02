// Level 2: Sets and Basic Hands
// Learn to combine tiles into valid sets (Pung, Kong, Chow) and basic winning hands

import {Lesson, QuizQuestion, Level} from './level1';

export const Level2: Level = {
  id: 2,
  title: "Sets & Basic Hands",
  description: "Learn to combine tiles into Pungs, Chows, and Kongs to build winning hands",
  unlockRequirement: "Complete Level 1",
  lessons: [
    // LESSON 1: Introduction to Sets
    {
      id: "2-1",
      title: "Building Blocks",
      subtitle: "The three types of sets",
      content: [
        "In mahjong, you win by collecting tiles into valid combinations called 'sets'.",
        "There are only THREE types of sets you need to learn:",
        "",
        "1. PUNG (碰) — Three identical tiles",
        "2. CHOW (吃) — Three consecutive numbers in the same suit",
        "3. KONG (槓) — Four identical tiles (basically a Pung + 1)",
        "",
        "A winning hand needs 4 sets + 1 pair (2 identical tiles).",
        "That's it! Every winning hand follows this pattern.",
        "Let's look at each set type in detail..."
      ]
    },

    // LESSON 2: PUNG (Three of a Kind)
    {
      id: "2-2",
      title: "PUNG (碰)",
      subtitle: "Three identical tiles",
      content: [
        "A PUNG is simply three copies of the same tile.",
        "",
        "Examples:",
        "• Three 5-Dot tiles = a Pung of 5-Dots",
        "• Three Red Dragons = a Pung of Red Dragons",
        "• Three East Winds = a Pung of East Winds",
        "",
        "You can make a Pung from ANY tile:",
        "• Suit tiles (Dots, Bamboo, Characters)",
        "• Honor tiles (Winds, Dragons)",
        "• But NOT Bonus tiles (Flowers/Seasons)",
        "",
        "Pungs are the easiest sets to spot — just look for three of the same!"
      ],
      tiles: ["dot-5", "dot-5", "dot-5", "dragon-red", "dragon-red", "dragon-red"],
      quiz: [
        {
          id: "q2-2-1",
          type: "multiple-choice",
          question: "How many identical tiles make a Pung?",
          options: ["2", "3", "4", "5"],
          correctAnswer: "3",
          explanation: "A Pung is exactly 3 identical tiles. 2 is just a pair, 4 is a Kong."
        },
        {
          id: "q2-2-2",
          type: "multiple-choice",
          question: "Which of these CANNOT form a Pung?",
          options: ["Three 7-Bamboo tiles", "Three North Winds", "Three Flower tiles", "Three White Dragons"],
          correctAnswer: "Three Flower tiles",
          explanation: "Flower tiles (and Seasons) are bonus tiles — you can't make sets with them. They're set aside when drawn."
        }
      ]
    },

    // LESSON 3: CHOW (Sequence)
    {
      id: "2-3",
      title: "CHOW (吃)",
      subtitle: "Three consecutive numbers",
      content: [
        "A CHOW is a sequence of three consecutive numbers in the same suit.",
        "",
        "Examples:",
        "• 1-2-3 of Dots ✓",
        "• 4-5-6 of Bamboo ✓",
        "• 7-8-9 of Characters ✓",
        "",
        "Important rules:",
        "• Must be the SAME suit (can't mix Dot + Bamboo)",
        "• Must be CONSECUTIVE (3-4-5 works, 3-5-7 doesn't)",
        "• Only works with SUIT tiles (Dots, Bamboo, Characters)",
        "• Winds and Dragons CANNOT form Chows",
        "",
        "Think of it like a straight in poker — sequential cards in the same suit."
      ],
      tiles: ["dot-1", "dot-2", "dot-3", "bamboo-4", "bamboo-5", "bamboo-6"],
      quiz: [
        {
          id: "q2-3-1",
          type: "multiple-choice",
          question: "Which is a valid Chow?",
          options: ["2-3-4 of Dots", "1-3-5 of Bamboo", "East-South-West Winds", "Red-Green-White Dragons"],
          correctAnswer: "2-3-4 of Dots",
          explanation: "2-3-4 are consecutive numbers in the same suit. Winds and Dragons can't form Chows."
        },
        {
          id: "q2-3-2",
          type: "multiple-choice",
          question: "Can you make a Chow with East, South, and West winds?",
          options: ["Yes, they're consecutive", "No, winds can't form Chows", "Only in some variants", "Yes, if the dealer is East"],
          correctAnswer: "No, winds can't form Chows",
          explanation: "Only suit tiles (Dots, Bamboo, Characters) can form Chows. Winds and Dragons are Honors — they can only form Pungs/Kongs."
        }
      ]
    },

    // LESSON 4: KONG (Four of a Kind)
    {
      id: "2-4",
      title: "KONG (槓)",
      subtitle: "Four identical tiles = bonus",
      content: [
        "A KONG is four identical tiles — basically a Pung with an extra copy.",
        "",
        "Examples:",
        "• Four 3-Character tiles",
        "• Four Green Dragons",
        "• Four North Winds",
        "",
        "Why make a Kong?",
        "• It's worth more points than a Pung",
        "• You draw a replacement tile (extra chance to improve your hand)",
        "• In some variants, it affects the Dora (bonus tile)",
        "",
        "Kong rule:",
        "If you have 3 tiles and someone discards the 4th, you can call 'Kong!'",
        "Set the 4 tiles face-up and draw a replacement from the back of the wall."
      ],
      tiles: ["character-3", "character-3", "character-3", "character-3", "dragon-green", "dragon-green", "dragon-green", "dragon-green"],
      quiz: [
        {
          id: "q2-4-1",
          type: "multiple-choice",
          question: "How many tiles are in a Kong?",
          options: ["2", "3", "4", "5"],
          correctAnswer: "4",
          explanation: "Kong = 4 identical tiles. Pung = 3. Remember: Kong has 4 letters, Pung has 4 letters... wait, that doesn't help. Just remember Kong = 4!"
        },
        {
          id: "q2-4-2",
          type: "multiple-choice",
          question: "What happens when you declare a Kong?",
          options: ["You win immediately", "You draw a replacement tile", "The round ends", "You lose points"],
          correctAnswer: "You draw a replacement tile",
          explanation: "When you Kong, you set the 4 tiles aside and draw a replacement from the back of the wall. Free extra tile!"
        }
      ]
    },

    // LESSON 5: The Pair (Eyes)
    {
      id: "2-5",
      title: "The Pair (將 / 眼)",
      subtitle: "You need a pair to win",
      content: [
        "A winning hand = 4 sets + 1 pair.",
        "",
        "The pair (also called 'eyes' or 'head') is two identical tiles.",
        "",
        "Examples:",
        "• Two 8-Dots",
        "• Two South Winds",
        "• Two Red Dragons",
        "",
        "Rules for the pair:",
        "• Must be exactly 2 tiles (not 1, not 3)",
        "• Can be ANY tile except Bonus tiles",
        "• Some special hands don't need a pair (rare)",
        "",
        "Finding your pair is crucial — once you have 4 sets, you just need to complete the pair to win!"
      ],
      tiles: ["dot-8", "dot-8", "wind-south", "wind-south"],
      quiz: [
        {
          id: "q2-5-1",
          type: "multiple-choice",
          question: "A winning hand needs how many sets + pair?",
          options: ["3 sets + 1 pair", "4 sets + 1 pair", "5 sets + 1 pair", "4 sets + 2 pairs"],
          correctAnswer: "4 sets + 1 pair",
          explanation: "Standard mahjong hand: 4 sets (Pungs, Chows, or Kongs) + 1 pair. Total: 14 tiles."
        }
      ]
    },

    // LESSON 6: Set Builder Practice
    {
      id: "2-6",
      title: "Build Your First Sets",
      subtitle: "Interactive practice",
      content: [
        "Time to practice building sets!",
        "",
        "Tap tiles to select them, then tap 'Check Set' to validate.",
        "",
        "Try building:",
        "• A PUNG (3 identical tiles)",
        "• A CHOW (3 consecutive suit tiles)",
        "• A KONG (4 identical tiles)",
        "• A PAIR (2 identical tiles)",
        "",
        "Tips:",
        "• Look for Pungs first (easiest to spot)",
        "• Then look for Chows (sequences)",
        "• Honor tiles can only be Pungs/Kongs (not Chows)",
        "• Only suit tiles can form Chows"
      ],
      interactiveType: 'set-builder',
      interactiveData: {
        availableTileIds: [
          // Dots 1-9
          "dot-1", "dot-2", "dot-3", "dot-4", "dot-5", "dot-6", "dot-7", "dot-8", "dot-9",
          // Bamboo 1-9
          "bamboo-1", "bamboo-2", "bamboo-3", "bamboo-4", "bamboo-5", "bamboo-6", "bamboo-7", "bamboo-8", "bamboo-9",
          // Characters 1-9
          "character-1", "character-2", "character-3", "character-4", "character-5", "character-6", "character-7", "character-8", "character-9",
          // Winds
          "wind-east", "wind-south", "wind-west", "wind-north",
          // Dragons
          "dragon-red", "dragon-green", "dragon-white",
        ]
      }
    },

    // LESSON 7: Winning Hand Structure
    {
      id: "2-7",
      title: "Complete Hand Example",
      subtitle: "Putting it all together",
      content: [
        "Here's a complete winning hand breakdown:",
        "",
        "Sets:",
        "1. Pung: Three Red Dragons 🔴🔴🔴",
        "2. Chow: 2-3-4 of Characters",
        "3. Chow: 5-6-7 of Dots",
        "4. Pung: Three North Winds",
        "",
        "Pair:",
        "• Two 8-Bamboo",
        "",
        "That's 4 sets + 1 pair = 14 tiles = WIN!",
        "",
        "This hand has:",
        "• 2 Pungs (honor tiles)",
        "• 2 Chows (suit sequences)",
        "• 1 Pair (suit tiles)",
        "",
        "Most winning hands are some mix of Pungs and Chows."
      ],
      tiles: ["dragon-red", "dragon-red", "dragon-red", "character-2", "character-3", "character-4", "dot-5", "dot-6", "dot-7", "wind-north", "wind-north", "wind-north", "bamboo-8", "bamboo-8"]
    },

    // LESSON 8: Summary & Next Steps
    {
      id: "2-8",
      title: "Level 2 Complete!",
      subtitle: "You know the building blocks",
      content: [
        "🎉 You now understand how mahjong hands are built!",
        "",
        "Quick recap:",
        "• PUNG = 3 identical tiles",
        "• CHOW = 3 consecutive suit tiles",
        "• KONG = 4 identical tiles (bonus!)",
        "• PAIR = 2 identical tiles (the 'eyes')",
        "• Winning hand = 4 sets + 1 pair (14 tiles)",
        "",
        "Up next in Level 3: Scoring and special hands.",
        "Learn which hands are worth more points and why!"
      ],
      quiz: [
        {
          id: "q2-8-1",
          type: "multiple-choice",
          question: "Which set type can ONLY be made with suit tiles?",
          options: ["Pung", "Kong", "Chow", "Pair"],
          correctAnswer: "Chow",
          explanation: "Only suit tiles (Dots, Bamboo, Characters) can form Chows. Winds and Dragons can only be Pungs/Kongs."
        },
        {
          id: "q2-8-2",
          type: "multiple-choice",
          question: "How many tiles total in a winning hand?",
          options: ["12", "13", "14", "16"],
          correctAnswer: "14",
          explanation: "4 sets × 3 tiles = 12, plus 1 pair × 2 tiles = 2, total 14 tiles."
        },
        {
          id: "q2-8-3",
          type: "multiple-choice",
          question: "What do you get when you declare a Kong?",
          options: ["You win the game", "A replacement tile", "Double points", "The round ends"],
          correctAnswer: "A replacement tile",
          explanation: "Declaring a Kong lets you draw a replacement tile from the back of the wall. It's a bonus!"
        }
      ]
    }
  ]
};

export default Level2;
