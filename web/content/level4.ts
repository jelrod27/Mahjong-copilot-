// Level 4: Scoring Fundamentals
// Learn how Hong Kong Mahjong scoring works — fans, payments, and common hands

import {Lesson, Level} from './level1';

export const Level4: Level = {
  id: 4,
  title: "Scoring Fundamentals",
  description: "Master fan counting, payment calculation, and common scoring patterns",
  recommendedAction: "Get fluent with fan, the currency of mahjong scoring.",
  unlockRequirement: "Complete Level 3",
  lessons: [
    {
      id: "4-1",
      title: "What is a Fan?",
      subtitle: "The currency of mahjong scoring",
      content: [
        "In Hong Kong Mahjong, scoring is based on FANS (番).",
        "",
        "A fan is a scoring element — think of fans like multipliers.",
        "The more fans your hand has, the more points it's worth.",
        "",
        "How it works:",
        "• Each winning hand has a BASE value of 8 points",
        "• Each fan DOUBLES your payment",
        "• Formula: Payment = 8 × 2^(number of fans)",
        "",
        "Example:",
        "• 0 fan = 8 points (a 'chicken hand' — the lowest possible score)",
        "• 1 fan = 16 points",
        "• 2 fan = 32 points",
        "• 3 fan = 64 points",
        "",
        "Most tables also require a MINIMUM of 3 fan to declare a win at all.",
        "A 0-fan chicken hand can't actually be called — 3 fan is the real floor.",
        "",
        "The doubling adds up FAST. A 7-fan hand is worth 1,024 points!",
        "",
        "There's a cap at 10 fan — called a LIMIT HAND — worth 8,192 points maximum.",
        "Any hand with 10+ fans pays the limit."
      ],
      quiz: [
        {
          id: "q4-1-1",
          type: "multiple-choice",
          question: "What is the base payment in Hong Kong Mahjong?",
          options: ["4 points", "8 points", "16 points", "32 points"],
          correctAnswer: "8 points",
          explanation: "The base payment is 8 points. A 0-fan winning hand (Chicken Hand) pays exactly 8."
        },
        {
          id: "q4-1-2",
          type: "multiple-choice",
          question: "A hand with 3 fans is worth how many points?",
          options: ["24 points", "32 points", "48 points", "64 points"],
          correctAnswer: "64 points",
          explanation: "Payment = 8 × 2^3 = 8 × 8 = 64 points. Each fan doubles!"
        },
        {
          id: "q4-1-3",
          type: "multiple-choice",
          question: "What happens when a hand reaches 10 or more fans?",
          options: ["It keeps doubling", "It's capped at 8,192 points", "The game ends immediately", "You get bonus tiles"],
          correctAnswer: "It's capped at 8,192 points",
          explanation: "10+ fans = limit hand = maximum payment of 8,192 points. No matter how many extra fans you stack up."
        }
      ]
    },
    {
      id: "4-2",
      title: "Dragon Fans",
      subtitle: "Red, Green, and White power",
      content: [
        "DRAGON PUNGS are one of the easiest fans to earn.",
        "",
        "Each pung (or kong) of a dragon is worth 1 fan:",
        "• Red Dragon pung/kong = 1 fan",
        "• Green Dragon pung/kong = 1 fan",
        "• White Dragon pung/kong = 1 fan",
        "",
        "These stack! If you have pungs of two different dragons,",
        "that's 2 fans from dragons alone.",
        "",
        "If you manage to get pungs of ALL THREE dragons...",
        "that's a special limit hand called Big Three Dragons!",
        "",
        "Dragons are always valuable because:",
        "• Any player can claim them (no position restriction like chows)",
        "• They contribute to Mixed One Suit hands",
        "• They're honor tiles — useful for All Honors"
      ],
      tiles: ["dragon-red", "dragon-red", "dragon-red", "dragon-green", "dragon-green", "dragon-green", "dragon-white", "dragon-white", "dragon-white"],
      quiz: [
        {
          id: "q4-2-1",
          type: "multiple-choice",
          question: "How many fans is a pung of Green Dragons worth?",
          options: ["0 fan", "1 fan", "2 fan", "3 fan"],
          correctAnswer: "1 fan",
          explanation: "Each dragon pung is worth exactly 1 fan. Simple and consistent."
        },
        {
          id: "q4-2-2",
          type: "multiple-choice",
          question: "You have pungs of Red Dragon AND White Dragon. How many dragon fans?",
          options: ["1 fan", "2 fan", "3 fan", "It's a limit hand"],
          correctAnswer: "2 fan",
          explanation: "Each dragon pung is 1 fan, and they stack. Two dragon pungs = 2 fan."
        }
      ]
    },
    {
      id: "4-3",
      title: "Wind Fans",
      subtitle: "Seat wind and prevailing wind bonuses",
      content: [
        "Wind tiles can earn you fans, but the rules are context-dependent.",
        "",
        "There are two wind bonuses:",
        "",
        "1. SEAT WIND (1 fan)",
        "Your seat wind is assigned at the start of the game.",
        "If you have a pung/kong of YOUR seat wind, that's 1 fan.",
        "Example: You're sitting East. A pung of East Wind = 1 fan.",
        "",
        "2. PREVAILING WIND (1 fan)",
        "The prevailing (round) wind is shared by all players.",
        "A pung/kong of the prevailing wind = 1 fan.",
        "",
        "DOUBLE WIND BONUS:",
        "If your seat wind IS the prevailing wind (e.g., East round and you're East),",
        "then a pung of East Wind is worth 2 fan (seat + prevailing)!",
        "",
        "Other wind pungs that aren't your seat or prevailing wind = 0 fan.",
        "They're still useful for All Pungs or other patterns though."
      ],
      tiles: ["wind-east", "wind-east", "wind-east", "wind-south", "wind-south", "wind-south", "wind-west", "wind-west", "wind-west", "wind-north", "wind-north", "wind-north"],
      quiz: [
        {
          id: "q4-3-1",
          type: "multiple-choice",
          question: "You're sitting South. The prevailing wind is East. How much is a pung of South Wind?",
          options: ["0 fan", "1 fan (seat wind)", "1 fan (prevailing wind)", "2 fan"],
          correctAnswer: "1 fan (seat wind)",
          explanation: "South is your seat wind, so a pung of South = 1 fan. It's not the prevailing wind (East), so no extra."
        },
        {
          id: "q4-3-2",
          type: "multiple-choice",
          question: "It's the East round and you're sitting East. How much is a pung of East Wind worth?",
          options: ["0 fan", "1 fan", "2 fan", "3 fan"],
          correctAnswer: "2 fan",
          explanation: "East is both your seat wind (1 fan) AND the prevailing wind (1 fan). That's 2 fan total!"
        }
      ]
    },
    {
      id: "4-4",
      title: "Concealed & Self-Drawn",
      subtitle: "Bonus fans for how you win",
      content: [
        "You can earn extra fans based on HOW you win, not just WHAT you win with.",
        "",
        "CONCEALED HAND (1 fan)",
        "If you win without exposing any melds — meaning you never claimed",
        "chow, pung, or kong from another player's discard — your hand",
        "is 'concealed' and worth 1 extra fan.",
        "",
        "SELF-DRAWN WIN (1 fan)",
        "If you win by drawing the winning tile yourself (instead of",
        "claiming another player's discard), that's worth 1 extra fan.",
        "",
        "These two often go together:",
        "• A concealed hand that self-draws = 2 extra fan",
        "• A concealed hand won by discard = 1 extra fan (concealed only)",
        "• An exposed hand that self-draws = 1 extra fan (self-drawn only)",
        "",
        "Strategy tip: Keeping your hand concealed is risky (no claims!)",
        "but the scoring bonus can be significant. A 0-fan hand becomes",
        "a 2-fan hand just by being concealed + self-drawn!"
      ],
      quiz: [
        {
          id: "q4-4-1",
          type: "multiple-choice",
          question: "You win by self-draw with no exposed melds. How many bonus fans?",
          options: ["0 fan", "1 fan", "2 fan", "3 fan"],
          correctAnswer: "2 fan",
          explanation: "Concealed hand (1 fan) + Self-drawn (1 fan) = 2 bonus fans. Nice!"
        },
        {
          id: "q4-4-2",
          type: "multiple-choice",
          question: "You claimed a pung earlier, then draw your winning tile. What bonus fans?",
          options: ["0 fan", "1 fan (self-drawn only)", "1 fan (concealed only)", "2 fan"],
          correctAnswer: "1 fan (self-drawn only)",
          explanation: "You exposed a meld by claiming, so no concealed bonus. But self-drawn still counts for 1 fan."
        }
      ]
    },
    {
      id: "4-5",
      title: "All Pungs & Suit Scoring",
      subtitle: "Big fan hands from tile patterns",
      content: [
        "Some hand patterns are worth significant fans on their own.",
        "",
        "ALL PUNGS (3 fan)",
        "When all 4 of your melds are pungs (or kongs) — no chows.",
        "This is worth 3 fan. Combined with other bonuses, it can",
        "quickly become a high-scoring hand.",
        "",
        "MIXED ONE SUIT (3 fan)",
        "All your tiles are from ONE numbered suit, mixed with honor tiles.",
        "Example: All Characters + some Wind/Dragon tiles = 3 fan.",
        "",
        "PURE ONE SUIT (7 fan)",
        "ALL your tiles are from a single numbered suit — no honors at all.",
        "This is very difficult but worth a massive 7 fan!",
        "Example: All Bamboo, tiles 1-9 only. Nearly a limit hand.",
        "",
        "SEVEN PAIRS (4 fan)",
        "Instead of 4 sets + 1 pair, you have 7 distinct pairs.",
        "A completely different hand structure worth 4 fan.",
        "",
        "Scoring comparison:",
        "• All Pungs: 3 fan = 64 points",
        "• Mixed One Suit: 3 fan = 64 points",
        "• Seven Pairs: 4 fan = 128 points",
        "• Pure One Suit: 7 fan = 1,024 points"
      ],
      quiz: [
        {
          id: "q4-5-1",
          type: "multiple-choice",
          question: "How many fans is a Pure One Suit hand worth?",
          options: ["3 fan", "5 fan", "7 fan", "10 fan (limit)"],
          correctAnswer: "7 fan",
          explanation: "Pure One Suit is worth 7 fan = 8 x 2^7 = 1,024 points. One of the highest non-limit hands!"
        },
        {
          id: "q4-5-2",
          type: "multiple-choice",
          question: "Your hand has 4 pungs + 1 pair, and all tiles are Bamboo plus some winds. What patterns apply?",
          options: ["All Pungs only (3 fan)", "Mixed One Suit only (3 fan)", "Both All Pungs AND Mixed One Suit (6 fan)", "Pure One Suit (7 fan)"],
          correctAnswer: "Both All Pungs AND Mixed One Suit (6 fan)",
          explanation: "Fans stack! All Pungs (3) + Mixed One Suit (3) = 6 fan. Since you have winds, it's mixed, not pure."
        }
      ]
    },
    {
      id: "4-6",
      title: "Payment Calculation",
      subtitle: "Who pays whom and how much",
      content: [
        "In Hong Kong Mahjong, every hand has a BASE payment (8 x 2^fan,",
        "capped at the limit). But nobody pays exactly the base — it gets",
        "doubled for at least one player, depending on HOW you won.",
        "",
        "WIN BY DISCARD:",
        "The discarder pays DOUBLE the base amount.",
        "The other two players each pay the base amount once.",
        "Total collected: 4x the base (2x + 1x + 1x).",
        "",
        "WIN BY SELF-DRAW:",
        "ALL THREE other players pay you, and each pays DOUBLE the base.",
        "Total collected: 6x the base (2x + 2x + 2x).",
        "",
        "So a self-drawn win collects 1.5x as much as a discard win overall.",
        "",
        "BASE PAYMENT TABLE (before the doubling above):",
        "• 0 fan: 8 pts (Chicken Hand)",
        "• 1 fan: 16 pts",
        "• 2 fan: 32 pts",
        "• 3 fan: 64 pts",
        "• 4 fan: 128 pts",
        "• 5 fan: 256 pts",
        "• 10+ fan: 8,192 pts (limit cap)"
      ],
      quiz: [
        {
          id: "q4-6-1",
          type: "multiple-choice",
          question: "You win by discard with 3 fan. How many total points do you receive?",
          options: ["64 points (from one player)", "192 points (64 each, from three players)", "256 points (128 from the discarder + 64 + 64 from the others)", "384 points (128 from all three)"],
          correctAnswer: "256 points (128 from the discarder + 64 + 64 from the others)",
          explanation: "Base = 8 x 2^3 = 64. Win by discard: the discarder pays double (128), the other two each pay the base (64). Total: 128 + 64 + 64 = 256."
        },
        {
          id: "q4-6-2",
          type: "multiple-choice",
          question: "You self-draw with 2 fan. How many total points do you receive?",
          options: ["32 points", "96 points", "128 points", "192 points"],
          correctAnswer: "192 points",
          explanation: "Base = 8 x 2^2 = 32. Self-draw: all 3 opponents pay double the base (64 each). Total: 64 x 3 = 192."
        },
        {
          id: "q4-6-3",
          type: "multiple-choice",
          question: "Why are self-drawn wins more valuable than discard wins (all else equal)?",
          options: ["They give bonus fans", "All 3 opponents pay double, not just the discarder", "The base points increase", "You get extra tiles"],
          correctAnswer: "All 3 opponents pay double, not just the discarder",
          explanation: "Both win types have 3 payers. On a discard win only the discarder pays double (the other two pay the base). On a self-draw, all 3 pay double. Plus you get the +1 Self-Drawn fan!"
        }
      ]
    },
    {
      id: "4-7",
      title: "Fan Counting Practice",
      subtitle: "Test your scoring skills",
      content: [
        "Let's practice counting fans on example hands!",
        "",
        "Remember the scoring elements:",
        "• Self-drawn win: +1 fan",
        "• Concealed hand: +1 fan",
        "• Dragon pung/kong: +1 fan each",
        "• Seat wind pung: +1 fan",
        "• Prevailing wind pung: +1 fan",
        "• No flowers: +1 fan",
        "• All Pungs: +3 fan",
        "• Mixed One Suit: +3 fan",
        "• Seven Pairs: +4 fan",
        "• Pure One Suit: +7 fan",
        "• Flower/season matching your seat wind: +1 fan each (others score 0)",
        "",
        "EXAMPLE HAND:",
        "Pung of Red Dragons, Chow of 2-3-4 Bamboo,",
        "Chow of 5-6-7 Dots, Pung of 8-Characters, Pair of North Wind.",
        "Won by discard. Concealed. No flowers.",
        "",
        "Count: Red Dragon (1) + Concealed (1) + No Flowers (1) = 3 fan",
        "Payment: base = 8 x 2^3 = 64. Win by discard: the discarder pays",
        "double (128), the other two each pay the base (64) — 256 total.",
        "",
        "Now try the quiz!"
      ],
      quiz: [
        {
          id: "q4-7-1",
          type: "multiple-choice",
          question: "Hand: 4 pungs of various tiles + pair. Self-drawn. 1 flower tile matching their seat wind. Seat wind pung included. How many fans?",
          options: ["3 fan", "5 fan", "6 fan", "7 fan"],
          correctAnswer: "6 fan",
          explanation: "All Pungs (3) + Self-drawn (1) + Seat Wind (1) + Seat Flower (1) = 6 fan."
        },
        {
          id: "q4-7-2",
          type: "multiple-choice",
          question: "Hand: All tiles are Characters, with a pung of Green Dragons. Won by discard, concealed, no flowers. How many fans?",
          options: ["3 fan", "5 fan", "6 fan", "8 fan"],
          correctAnswer: "6 fan",
          explanation: "Mixed One Suit (3) + Green Dragon (1) + Concealed (1) + No Flowers (1) = 6 fan."
        },
        {
          id: "q4-7-3",
          type: "multiple-choice",
          question: "Hand: All tiles are Dots, no honor tiles. Self-drawn, concealed, no flowers. How many fans?",
          options: ["7 fan", "9 fan", "10 fan (limit!)", "11 fan"],
          correctAnswer: "10 fan (limit!)",
          explanation: "Pure One Suit (7) + Self-drawn (1) + Concealed (1) + No Flowers (1) = 10 fan = LIMIT HAND! The capped base (8,192) still gets doubled for a self-draw, so each opponent pays 16,384!"
        }
      ]
    },
    {
      id: "4-8",
      title: "Scoring Master",
      subtitle: "You've learned the numbers game",
      content: [
        "Congratulations! You now understand Hong Kong Mahjong scoring.",
        "",
        "KEY TAKEAWAYS:",
        "",
        "1. Fans are multipliers: Payment = 8 x 2^fan",
        "2. Fans stack — combine multiple scoring elements for big payouts",
        "3. Self-drawn wins pay 6x the base (1.5x a discard win's 4x total)",
        "4. Limit hands cap the base at 8,192 points",
        "5. Most tables require 3+ fan to declare a win at all",
        "",
        "FAN CHEAT SHEET:",
        "• +1: Self-drawn, Concealed, Dragon pung, Seat wind, Prevailing wind, No flowers",
        "• +1 each: Flower/season tiles matching your seat wind (others score 0)",
        "• +3: All Pungs, Mixed One Suit",
        "• +4: Seven Pairs",
        "• +7: Pure One Suit",
        "• Limit (10+): All Honors, All Terminals, Thirteen Orphans, Nine Gates",
        "",
        "STRATEGY INSIGHT:",
        "Don't just aim for a winning hand — aim for a VALUABLE one.",
        "Sometimes waiting one extra turn for a concealed self-draw",
        "can multiply your payout several times over (2 extra fan quadruples",
        "the base, and self-draw collects 1.5x what a discard win would).",
        "Risk vs reward is the heart of mahjong.",
        "",
        "Next up: Advanced Hands & Limit Hands!"
      ],
      quiz: [
        {
          id: "q4-8-1",
          type: "multiple-choice",
          question: "What's the base payment cap for a limit hand (10+ fan)?",
          options: ["128 points", "256 points", "512 points", "8,192 points"],
          correctAnswer: "8,192 points",
          explanation: "Limit hands (10+ fan) cap the base payment at 8,192. Actual payments then get doubled for the discarder, or for all three opponents on a self-draw — same as any other hand."
        },
        {
          id: "q4-8-2",
          type: "multiple-choice",
          question: "Which strategy tip did we learn about scoring?",
          options: ["Always go for chicken hands", "Expose melds early for safety", "Waiting for a concealed self-draw multiplies your payout", "Flowers are the most important fan"],
          correctAnswer: "Waiting for a concealed self-draw multiplies your payout",
          explanation: "Concealed (+1) + Self-drawn (+1) = 2 extra fan (4x the base), and self-draw collects 1.5x what a discard win would. Risk vs reward!"
        }
      ]
    }
  ]
};
