// Level 5: Advanced Hands & Limit Hands
// Learn rare and valuable hand patterns

import {Lesson, QuizQuestion, Level} from './level1';

export const Level5: Level = {
  id: 5,
  title: "Advanced Hands & Limit Hands",
  description: "Master rare and valuable hand patterns worth maximum points",
  recommendedAction: "Aim for the high-value hands that score limit points.",
  unlockRequirement: "Complete Level 4",
  lessons: [
    // LESSON 1: Introduction to Limit Hands
    {
      id: "5-1",
      title: "What are Limit Hands?",
      subtitle: "The holy grails of mahjong",
      content: [
        "Limit hands (also called Yakuman in Japanese) are extremely rare patterns.",
        "",
        "They're worth MAXIMUM points — often the entire game's stake.",
        "",
        "Characteristics:",
        "• Extremely specific requirements",
        "• Nearly impossible to get intentionally",
        "• Most players never see one in their lifetime",
        "• Instant game-winners when achieved",
        "",
        "But knowing them matters because:",
        "• You might accidentally be one tile away",
        "• You'll recognize when opponents are building one",
        "• They're fun to dream about!",
        "",
        "Let's explore the most famous limit hands..."
      ],
      quiz: [
        {
          id: "q5-1-1",
          type: "multiple-choice",
          question: "Why learn limit hands if they're so rare?",
          options: ["To win every game", "To recognize near-misses and opponent threats", "They're required for basic play", "They make the game longer"],
          correctAnswer: "To recognize near-misses and opponent threats",
          explanation: "Knowing limit hands helps you spot when you're close or when an opponent might be building one. Knowledge is power!"
        }
      ]
    },

    // LESSON 2: All Honors (字一色)
    {
      id: "5-2",
      title: "All Honors (字一色)",
      subtitle: "Every tile is a Wind or Dragon",
      content: [
        "ALL HONORS: The entire hand (all 14 tiles) consists of Winds and Dragons.",
        "",
        "Requirements:",
        "• 4 Pungs/Kongs of Winds/Dragons",
        "• 1 Pair of Winds/Dragons",
        "• NO suit tiles at all",
        "",
        "Example hand:",
        "• Pung of East Winds",
        "• Pung of South Winds",
        "• Kong of Red Dragons",
        "• Pung of White Dragons",
        "• Pair of Green Dragons",
        "",
        "This is a YAKUMAN (limit hand) in Riichi Mahjong.",
        "",
        "The odds? About 1 in 20,000+ hands.",
        "If you see someone collecting honor tiles like crazy... watch out!"
      ],
      tiles: ["wind-east", "wind-east", "wind-east", "wind-south", "wind-south", "wind-south", "dragon-red", "dragon-red", "dragon-red", "dragon-red", "dragon-white", "dragon-white", "dragon-white", "dragon-green", "dragon-green"],
      quiz: [
        {
          id: "q5-2-1",
          type: "multiple-choice",
          question: "Can an All Honors hand contain a 5-Dot tile?",
          options: ["Yes, one is allowed", "No, only Winds and Dragons", "Yes, if it's the pair", "Only in Chinese rules"],
          correctAnswer: "No, only Winds and Dragons",
          explanation: "All Honors means ALL tiles are honors. Zero suit tiles allowed. It's what makes it so rare!"
        }
      ]
    },

    // LESSON 3: All Terminals (清老頭 / 混老頭)
    {
      id: "5-3",
      title: "All Terminals (清老頭 / 混老頭)",
      subtitle: "Only 1s and 9s",
      content: [
        "ALL TERMINALS: Every tile is a 1 or 9 (the ends of each suit).",
        "",
        "There are two versions:",
        "",
        "PURE TERMINALS (清老頭 / Chinroutou):",
        "• Only 1s and 9s of suits",
        "• No honor tiles",
        "",
        "MIXED TERMINALS (混老頭 / Honroutou):",
        "• 1s, 9s, AND honor tiles",
        "• No 2-8 tiles",
        "",
        "Example (Pure):",
        "• Pung of 1-Dots",
        "• Pung of 9-Dots",
        "• Pung of 1-Bamboo",
        "• Kong of 9-Characters",
        "• Pair of 9-Bamboo",
        "",
        "This hand is very hard because:",
        "• Only 6 tile types exist (1s and 9s of 3 suits)",
        "• You need multiple copies of each",
        "• Everyone wants terminal tiles!"
      ],
      tiles: ["dot-1", "dot-1", "dot-1", "dot-9", "dot-9", "dot-9", "bamboo-1", "bamboo-1", "bamboo-1", "character-9", "character-9", "character-9", "character-9", "bamboo-9", "bamboo-9"],
      quiz: [
        {
          id: "q5-3-1",
          type: "multiple-choice",
          question: "Which tiles can be in an All Terminals hand?",
          options: ["Any 1s, 9s, and honors", "Only 1s and 9s (no honors)", "Any terminals and winds", "Only 1s, 5s, and 9s"],
          correctAnswer: "Any 1s, 9s, and honors",
          explanation: "Mixed Terminals allows 1s, 9s, AND honors. Pure Terminals is 1s and 9s only. The question asked generally, so Mixed is the broader answer."
        }
      ]
    },

    // LESSON 4: Nine Gates (九蓮宝燈)
    {
      id: "5-4",
      title: "Nine Gates (九蓮宝燈)",
      subtitle: "The ultimate suit hand",
      content: [
        "NINE GATES: The rarest non-honor limit hand.",
        "",
        "Requirements (ALL in ONE suit):",
        "• 1-1-1 of the suit",
        "• 9-9-9 of the suit",
        "• 2-3-4-5-6-7-8 (every middle number once)",
        "• Plus ONE MORE of any tile in that suit",
        "",
        "This creates a 'gate' where ANY tile in that suit completes the hand.",
        "",
        "Example (Dots):",
        "• 1-Dot, 1-Dot, 1-Dot",
        "• 2,3,4,5,6,7,8 of Dots (one each)",
        "• 9-Dot, 9-Dot, 9-Dot",
        "• Plus one extra (say, another 5-Dot)",
        "",
        "If you have this, you can win on ANY Dot tile!",
        "• Draw 1? Make a Kong of 1s",
        "• Draw 5? Make a Pung of 5s",
        "• Draw 9? Make a Kong of 9s",
        "",
        "Odds: About 1 in 25,000+ hands.",
        "The holy grail of suit hands!"
      ],
      quiz: [
        {
          id: "q5-4-1",
          type: "multiple-choice",
          question: "Why is it called 'Nine Gates'?",
          options: ["You need 9 Kongs", "Any of the 9 tiles in the suit completes it", "It has 9 Pungs", "You win after 9 turns"],
          correctAnswer: "Any of the 9 tiles in the suit completes it",
          explanation: "The 'gates' are open for any tile in that suit (1-9). Whichever you draw, you can form a valid winning hand!"
        }
      ]
    },

    // LESSON 5: Thirteen Orphans (国士無双)
    {
      id: "5-5",
      title: "Thirteen Orphans (国士無双)",
      subtitle: "The most beautiful hand",
      content: [
        "THIRTEEN ORPHANS: The most famous limit hand.",
        "",
        "Requirements:",
        "• One of each terminal (1 and 9 of each suit) = 6 tiles",
        "• One of each Wind (East, South, West, North) = 4 tiles",
        "• One of each Dragon (Red, Green, White) = 3 tiles",
        "• Plus a PAIR of any ONE of those 13 tiles",
        "",
        "That's 13 unique tiles + 1 duplicate = 14 tiles.",
        "",
        "Example:",
        "• 1-Dot, 9-Dot",
        "• 1-Bamboo, 9-Bamboo",
        "• 1-Char, 9-Char",
        "• East, South, West, North",
        "• Red, Green, White",
        "• PLUS another White Dragon (the pair)",
        "",
        "This hand is beautiful because:",
        "• It uses exactly one of every 'orphan' tile",
        "• It's recognizable even to non-players",
        "• It appears in every mahjong anime ever!",
        "",
        "Odds: About 1 in 15,000+ hands.",
        "The crown jewel of mahjong hands."
      ],
      tiles: ["dot-1", "dot-9", "bamboo-1", "bamboo-9", "character-1", "character-9", "wind-east", "wind-south", "wind-west", "wind-north", "dragon-red", "dragon-green", "dragon-white", "dragon-white"],
      quiz: [
        {
          id: "q5-5-1",
          type: "multiple-choice",
          question: "How many unique tile types are in Thirteen Orphans?",
          options: ["12", "13", "14", "16"],
          correctAnswer: "13",
          explanation: "13 unique tiles (6 terminals + 4 winds + 3 dragons) plus ONE duplicate makes 14 total tiles."
        }
      ]
    },

    // LESSON 6: Four Concealed Pungs (四暗刻)
    {
      id: "5-6",
      title: "Four Concealed Pungs (四暗刻)",
      subtitle: "Secret triplets",
      content: [
        "FOUR CONCEALED PUNGS: All Pungs hand... but harder.",
        "",
        "Requirements:",
        "• 4 Pungs + 1 Pair",
        "• ALL 4 Pungs must be 'concealed' (self-drawn)",
        "• No Pung can be claimed from another player's discard",
        "",
        "The pair can be completed on a discard, but the 4 Pungs must be self-drawn.",
        "",
        "Why is this hard?",
        "• You need to draw 3 copies of 4 different tiles yourself",
        "• You can't rely on claiming discards",
        "• Pure luck + patience required",
        "",
        "This is one of the most common Yakuman hands.",
        "Still rare (1 in 5,000+), but achievable with good play!"
      ],
      quiz: [
        {
          id: "q5-6-1",
          type: "multiple-choice",
          question: "What makes a Pung 'concealed'?",
          options: ["It's face-down", "You drew all 3 tiles yourself", "It's made of honor tiles", "It's hidden from opponents"],
          correctAnswer: "You drew all 3 tiles yourself",
          explanation: "A concealed Pung means you didn't claim any tile from another player's discard. All 3 were self-drawn from the wall."
        }
      ]
    },

    // LESSON 7: Big Three Dragons (大三元)
    {
      id: "5-7",
      title: "Big Three Dragons (大三元)",
      subtitle: "Collect them all",
      content: [
        "BIG THREE DRAGONS: Pungs of all 3 Dragons.",
        "",
        "Requirements:",
        "• Pung of Red Dragons",
        "• Pung of Green Dragons",
        "• Pung of White Dragons",
        "• Plus 1 set and 1 pair of anything",
        "",
        "Example hand:",
        "• Pung of Red Dragons",
        "• Pung of Green Dragons",
        "• Pung of White Dragons",
        "• Chow: 2-3-4 of Dots",
        "• Pair of 8-Bamboo",
        "",
        "This is the EASIEST limit hand to achieve!",
        "• Odds: About 1 in 1,500 hands",
        "• You can claim dragon tiles from discards",
        "• Everyone discards dragons early (usually safe)",
        "",
        "Pro tip: If you have 2 pairs of dragons early, consider going for this!"
      ],
      tiles: ["dragon-red", "dragon-red", "dragon-red", "dragon-green", "dragon-green", "dragon-green", "dragon-white", "dragon-white", "dragon-white", "dot-2", "dot-3", "dot-4", "bamboo-8", "bamboo-8"],
      quiz: [
        {
          id: "q5-7-1",
          type: "multiple-choice",
          question: "Why is Big Three Dragons easier than other limit hands?",
          options: ["You can claim discards", "Dragons are often discarded early", "You only need 3 Pungs", "All of the above"],
          correctAnswer: "All of the above",
          explanation: "Big Three Dragons is easiest because you can claim discards, dragons are commonly discarded, and you only need those 3 specific Pungs."
        }
      ]
    },

    // LESSON 8: Summary & Recognition
    {
      id: "5-8",
      title: "Level 5 Complete!",
      subtitle: "You know the legends",
      content: [
        "🎉 You now know the most famous limit hands!",
        "",
        "Quick Reference:",
        "• All Honors — Only Winds/Dragons",
        "• All Terminals — Only 1s, 9s, maybe honors",
        "• Nine Gates — One suit, specific 1-9 pattern",
        "• Thirteen Orphans — One of every terminal/honor + pair",
        "• Four Concealed Pungs — Self-drawn Pungs only",
        "• Big Three Dragons — Pungs of all 3 Dragons",
        "",
        "Key Takeaways:",
        "• Limit hands are rare but worth knowing",
        "• Watch for opponents collecting unusual tiles",
        "• Big Three Dragons is the 'achievable' Yakuman",
        "• Thirteen Orphans is the most famous",
        "",
        "Up next in Level 6: Strategy and gameplay!"
      ],
      quiz: [
        {
          id: "q5-8-1",
          type: "multiple-choice",
          question: "Which limit hand is considered the 'easiest' to achieve?",
          options: ["Thirteen Orphans", "Nine Gates", "Big Three Dragons", "Four Concealed Pungs"],
          correctAnswer: "Big Three Dragons",
          explanation: "Big Three Dragons is easiest because you can claim discards, dragons are commonly discarded, and everyone discards them early as 'safe' tiles."
        },
        {
          id: "q5-8-2",
          type: "multiple-choice",
          question: "How many tiles are in a Thirteen Orphans hand?",
          options: ["13", "14", "16", "12"],
          correctAnswer: "14",
          explanation: "13 unique tiles + 1 duplicate = 14 tiles total. The pair is a duplicate of one of the 13 unique types."
        }
      ]
    }
  ]
};

export default Level5;
