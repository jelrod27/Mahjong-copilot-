// Level 6: Strategy & Gameplay
// Learn tactical thinking and decision-making

import {Lesson, QuizQuestion, Level} from './level1';

export const Level6: Level = {
  id: 6,
  title: "Strategy & Gameplay",
  description: "Master tactical thinking, tile efficiency, and defensive play",
  unlockRequirement: "Complete Level 5",
  lessons: [
    // LESSON 1: Opening Strategy
    {
      id: "6-1",
      title: "The Opening Hand",
      subtitle: "What to keep, what to discard",
      content: [
        "Your first 13 tiles determine your strategy.",
        "",
        "TILE PRIORITY (General Rules):",
        "",
        "🟢 KEEP:",
        "• Honor tiles (easy Pungs, worth points)",
        "• Terminal tiles (1s and 9s — versatile)",
        "• Connected sequences (4-5-6, 6-7-8)",
        "• Pairs (potential sets or your final pair)",
        "",
        "🔴 DISCARD:",
        "• Isolated middle tiles (lone 4, 5, 6 with no neighbors)",
        "• Extra copies beyond what you need",
        "• Tiles that don't connect to anything",
        "",
        "Example opening hand:",
        "• 3-4-5 of Dots (keep! Good Chow)",
        "• 7 of Bamboo (discard — isolated)",
        "• Two Red Dragons (keep! Potential Pung)",
        "• 2-3 of Characters (keep — close to Chow)",
        "",
        "Goal: Get to 'one tile away' from multiple sets."
      ],
      quiz: [
        {
          id: "q6-1-1",
          type: "multiple-choice",
          question: "You have a lone 6-Bamboo with no other Bamboo tiles. What should you do?",
          options: ["Keep it — it's a lucky number", "Discard it — it's isolated", "Wait for 5 and 7", "Keep it for the pair"],
          correctAnswer: "Discard it — it's isolated",
          explanation: "Isolated middle tiles (4,5,6,7) are worst early. You need BOTH 5 and 7 to make a Chow with 6. That's two specific tiles."
        }
      ]
    },

    // LESSON 2: Tile Efficiency
    {
      id: "6-2",
      title: "Tile Efficiency",
      subtitle: "Which tiles help you win fastest",
      content: [
        "Tile efficiency = how many tiles can complete your hand.",
        "",
        "EFFICIENT SHAPES (keep these):",
        "",
        "1. Pairs",
        "• Need 2 more for Pung",
        "• 2 tiles available × 3 suits/deck = many chances",
        "",
        "2. Sequences (Chows)",
        "• 4-5 can become 3-4-5 OR 4-5-6",
        "• Two possible completions",
        "",
        "3. Double-sided waits",
        "• 4-5-6-7 can complete with 3 OR 8",
        "• Maximum flexibility",
        "",
        "INEFFICIENT SHAPES (avoid):",
        "",
        "1. Lone terminals without pair",
        "• 1-Dot alone needs TWO more 1-Dots",
        "• Or 1-2-3, but you don't have 2-3",
        "",
        "2. Isolated honors without pair",
        "• Can't form Chow, need exact match",
        "",
        "Efficiency rule: More completion options = better."
      ],
      quiz: [
        {
          id: "q6-2-1",
          type: "multiple-choice",
          question: "Which is more efficient: 4-5 or 1-1?",
          options: ["4-5 (two ways to complete)", "1-1 (one way, but easier)", "They're equal", "Depends on the suit"],
          correctAnswer: "4-5 (two ways to complete)",
          explanation: "4-5 can become 3-4-5 OR 4-5-6. 1-1 needs exactly one more 1. Two options beats one!"
        }
      ]
    },

    // LESSON 3: Reading the Board
    {
      id: "6-3",
      title: "Reading the Board",
      subtitle: "What discards tell you",
      content: [
        "Every discard is information. Learn to read it.",
        "",
        "WHAT OPPONENTS DISCARD MEANS:",
        "",
        "Early discards of honors:",
        "• They don't want All Honors",
        "• Those dragons might be safe later",
        "",
        "Discarding 5s, 6s early:",
        "• They might be going for All Terminals",
        "• Or they have a specific plan",
        "",
        "Holding onto terminals:",
        "• They might be building All Terminals",
        "• Or need them for a mixed hand",
        "• BE CAREFUL discarding terminals",
        "",
        "Holding honors but discarding suits:",
        "• Possible All Honors hand!",
        "• Don't discard honors to them",
        "",
        "Multiple discards from same suit:",
        "• They're not collecting that suit",
        "• That suit is 'safe' to discard",
        "",
        "Watch patterns. Information wins games."
      ],
      quiz: [
        {
          id: "q6-3-1",
          type: "multiple-choice",
          question: "An opponent discards three honor tiles early. What does this suggest?",
          options: ["They're building All Honors", "They're NOT building All Honors", "They have bad luck", "They don't know the rules"],
          correctAnswer: "They're NOT building All Honors",
          explanation: "Discarding honors early usually means they don't want them. All Honors requires ALL honors — discarding them is a strong signal."
        }
      ]
    },

    // LESSON 4: Defensive Play
    {
      id: "6-4",
      title: "Defensive Play",
      subtitle: "Don't deal into their win",
      content: [
        "Sometimes you can't win. Don't lose instead.",
        "",
        "DEALING IN = DISASTER",
        "• You pay the full hand value",
        "• Other players pay nothing",
        "• You lose even more if it's a limit hand",
        "",
        "DEFENSIVE PRIORITIES:",
        "",
        "1. Someone is one tile from winning (Riichi/tenpai)",
        "• DISCARD SAFE TILES ONLY",
        "• Break up your hand if needed",
        "• Living to fight another round > winning this one",
        "",
        "2. Safe tiles to discard:",
        "• Honors already discarded (dead tiles)",
        "• Terminals that have all been played",
        "• Tiles from suits they've abandoned",
        "• Your own discards (they didn't want them before)",
        "",
        "3. Dangerous tiles:",
        "• Honors they haven't discarded",
        "• Tiles in suits they're collecting",
        "• 5s, 6s, 7s (middle tiles everyone wants)",
        "",
        "When in doubt: discard what they discarded."
      ],
      quiz: [
        {
          id: "q6-4-1",
          type: "multiple-choice",
          question: "An opponent called Riichi (one tile from winning). You have a potentially dangerous tile. What do you do?",
          options: ["Discard it — maybe they don't need it", "Keep it and hope for better", "Break your hand to discard a safer tile", "Call Riichi too and race"],
          correctAnswer: "Break your hand to discard a safer tile",
          explanation: "When someone is in tenpai (ready to win), dealing in costs you everything. Break your hand, play safe, survive to next round."
        }
      ]
    },

    // LESSON 5: When to Push, When to Fold
    {
      id: "6-5",
      title: "Push or Fold?",
      subtitle: "Risk management in mahjong",
      content: [
        "Every turn: Are you pushing for win, or folding to survive?",
        "",
        "🟢 PUSH (go for win) when:",
        "• You're one tile from winning (tenpai)",
        "• Your hand is valuable (multiple Pungs, honors)",
        "• No one else looks close to winning",
        "• You have safe discards available",
        "",
        "🔴 FOLD (play safe) when:",
        "• Someone called Riichi/declared ready",
        "• Your hand is far from complete",
        "• Your hand isn't valuable (not worth risk)",
        "• You have dangerous tiles and no safe ones",
        "",
        "THE MATH:",
        "• Dealing into a hand: You pay 100%",
        "• Someone else wins: You pay 25-33%",
        "• If you're not close to winning: Why risk dealing in?",
        "",
        "PRO TIP: At 7+ tiles from winning, strongly consider folding if anyone is close. At 1-2 tiles, push if you can do it safely."
      ],
      quiz: [
        {
          id: "q6-5-1",
          type: "multiple-choice",
          question: "You have a bad hand and someone called Riichi. What's the right play?",
          options: ["Push anyway — luck favors the bold", "Fold — break your hand and play safe", "Call Riichi too to scare them", "Discard the most dangerous tile"],
          correctAnswer: "Fold — break your hand and play safe",
          explanation: "With a bad hand, you won't win anyway. Don't deal into their hand and pay everything. Survive, minimize loss."
        }
      ]
    },

    // LESSON 6: The End Game
    {
      id: "6-6",
      title: "The End Game",
      subtitle: "Final wall, final decisions",
      content: [
        "When the wall runs low, everything changes.",
        "",
        "WALL COUNT STRATEGY:",
        "",
        "Tiles remaining: 15+",
        "• Normal play, plenty of time",
        "",
        "Tiles remaining: 10-15",
        "• Start watching opponents closely",
        "• Consider defensive plays",
        "• If you're close, push now",
        "",
        "Tiles remaining: 5-10",
        "• URGENT mode",
        "• If you're one away, push hard",
        "• If you're far, play VERY safe",
        "• Tiles are running out!",
        "",
        "Tiles remaining: <5",
        "• EXHAUSTIVE DRAW likely",
        "• If you have ready hand: Keep it for draw bonus",
        "• If you don't: Don't deal in, survive to draw",
        "",
        "END GAME DISCARDS:",
        "• Assume everyone is close to winning",
        "• Every discard is dangerous",
        "• When in doubt: discard what was already discarded",
        "",
        "Time pressure changes everything."
      ],
      quiz: [
        {
          id: "q6-6-1",
          type: "multiple-choice",
          question: "Only 6 tiles left in the wall. You have a ready hand. Someone discards your winning tile. What do you do?",
          options: ["Don't claim it — wait for draw bonus", "Claim it and win immediately", "Pass and hope for self-draw", "Depends on hand value"],
          correctAnswer: "Claim it and win immediately",
          explanation: "With only 6 tiles left, waiting is risky. Take the win now rather than gambling on a self-draw that might not come."
        }
      ]
    },

    // LESSON 7: Common Beginner Mistakes
    {
      id: "6-7",
      title: "Beginner Traps",
      subtitle: "Don't fall for these",
      content: [
        "Learn from others' mistakes.",
        "",
        "MISTAKE 1: Collecting everything",
        "• Trying to build 5 different sets at once",
        "• Hand becomes unfocused mess",
        "• FIX: Pick 2-3 directions, commit",
        "",
        "MISTAKE 2: Holding dangerous tiles too long",
        "• 'Maybe I'll use this 5-Dot later'",
        "• Discard it late → deal into someone's win",
        "• FIX: If it's dangerous and not helping you, discard early",
        "",
        "MISTAKE 3: Ignoring defense",
        "• Always pushing for win",
        "• Deal into limit hands repeatedly",
        "• FIX: Sometimes surviving > winning",
        "",
        "MISTAKE 4: Claiming everything",
        "• Calling Pung/Chow on every opportunity",
        "• Reveals your hand, limits flexibility",
        "• FIX: Sometimes keep hand concealed",
        "",
        "MISTAKE 5: Forgetting the pair",
        "• Build 4 sets, no pair",
        "• Can't win without that pair!",
        "• FIX: Secure your pair early",
        "",
        "Avoid these, you'll be ahead of 80% of beginners."
      ],
      quiz: [
        {
          id: "q6-7-1",
          type: "multiple-choice",
          question: "You have 4 sets built but no pair. What's your status?",
          options: ["Ready to win", "One tile from winning", "Cannot win yet", "Have a limit hand"],
          correctAnswer: "Cannot win yet",
          explanation: "You MUST have a pair (2 identical tiles) to win. 4 sets + 0 pair = not a winning hand. You need to complete that pair!"
        }
      ]
    },

    // LESSON 8: Putting It All Together
    {
      id: "6-8",
      title: "You Are Ready!",
      subtitle: "Time to play",
      content: [
        "🎉 You've completed the Mahjong Learning App!",
        "",
        "You now know:",
        "• All 144 tiles (Level 1)",
        "• How to build sets (Level 2)",
        "• Winning hand patterns (Level 3)",
        "• Scoring fundamentals (Level 4)",
        "• Limit hands (Level 5)",
        "• Strategy and tactics (Level 6)",
        "",
        "NEXT STEPS:",
        "",
        "1. PRACTICE MODE",
        "• Play against AI in the app",
        "• Apply what you've learned",
        "• Make mistakes and learn",
        "",
        "2. PLAY WITH FRIENDS",
        "• Teach them using this app",
        "• Start with Level 1-3 concepts",
        "• Play casually, have fun",
        "",
        "3. JOIN A GROUP",
        "• Find local mahjong meetups",
        "• Online mahjong communities",
        "• Learn from experienced players",
        "",
        "REMEMBER:",
        "• Everyone deals in sometimes",
        "• Luck matters, but skill wins long-term",
        "• Have fun first, winning second",
        "• Keep learning!",
        "",
        "Good luck at the tables! 🀄"
      ],
      quiz: [
        {
          id: "q6-8-1",
          type: "multiple-choice",
          question: "What's the most important skill in mahjong?",
          options: ["Memorizing all limit hands", "Tile efficiency and defensive awareness", "Winning every hand", "Never dealing in"],
          correctAnswer: "Tile efficiency and defensive awareness",
          explanation: "Knowing when to push and when to fold, plus building efficient hands, wins more games than memorizing rare patterns."
        }
      ]
    }
  ]
};

export default Level6;
