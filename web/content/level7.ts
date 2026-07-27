// Level 7: Playing a Hand
// How a hand actually runs — the turn loop, claiming, and the dealer.
//
// Levels 1-6 teach what things ARE (tiles, sets, hands, scoring, strategy).
// Nothing taught how a turn actually works: that you hold 13 and draw to 14,
// that a claim jumps the queue and skips players, that chow is legal only from
// one specific seat, or that the dealer keeps the deal on a draw as well as a
// win. A player met all of it in their first hand with no preparation.
//
// Every rule below was read out of the engine, not from general mahjong
// knowledge — house rules vary enormously and this curriculum has already
// shipped numbers that contradicted `engine/scoring.ts` once. Source of truth:
//   - hand size, wall, draw           engine/turnManager.ts
//   - claim legality, priority, ties  engine/claiming.ts
//   - dealer, seat winds, rounds      engine/matchManager.ts
// Where a rule is easy to get wrong, the lesson says what the engine does and
// the comment here cites the line.

import type { Level } from './level1';
import { NOTEN_PENALTY_PER_NOTEN } from '@/engine/turnManager';

export const Level7: Level = {
  id: 7,
  title: "Playing a Hand",
  description: "How a hand actually runs, from the deal to the win",
  recommendedAction: "Take this before your first real game.",
  unlockRequirement: "Complete Level 6",
  lessons: [
    // ---------------------------------------------------------------
    {
      id: "7-1",
      title: "The Shape of a Turn",
      subtitle: "Draw one, discard one",
      content: [
        "You know what the tiles are and what a winning hand looks like.",
        "Now: how does a hand actually run?",
        "",
        "It is simpler than it looks. Every turn is the same two steps.",
        "",
        "YOUR HAND IS 13 TILES",
        "You are dealt 13. You hold 13 between turns. Always.",
        "",
        "ON YOUR TURN",
        "1. DRAW one tile. Now you have 14.",
        "2. DISCARD one tile. Back to 13.",
        "",
        "That's the whole loop. Draw to 14, discard to 13, pass it on.",
        "",
        "The 14th tile is the interesting one. For a moment you are holding a",
        "complete hand — and if those 14 tiles happen to be four sets and a",
        "pair, you don't discard at all. You win.",
        "",
        "That is the only reason the count matters: 14 is a winning hand, 13 is",
        "a hand waiting for one.",
        "",
        "PLAY PASSES TO YOUR RIGHT",
        "After you discard, the turn moves to the next seat and goes around the",
        "table the same direction all game.",
        "",
        "Nothing here is a decision yet. The decisions start when someone",
        "discards a tile you want — which is the rest of this level."
      ],
      keyTakeaways: [
        "You hold 13 tiles; on your turn you draw to 14 and discard back to 13.",
        "A winning hand is 14 tiles — you win instead of discarding.",
        "Turns pass around the table in a fixed direction all game."
      ],
      quiz: [
        {
          id: "7-1-q1",
          type: "multiple-choice",
          question: "How many tiles are in your hand between turns?",
          options: ["12", "13", "14", "16"],
          correctAnswer: "13",
          explanation: "You are dealt 13 and return to 13 after every discard. You only hold 14 for the moment between drawing and discarding."
        },
        {
          id: "7-1-q2",
          type: "multiple-choice",
          question: "You draw your 14th tile and it completes four sets and a pair. What now?",
          options: [
            "Discard your worst tile, then declare on your next turn",
            "Declare the win — you do not discard",
            "Wait for someone to discard the same tile",
            "Draw one more tile to confirm"
          ],
          correctAnswer: "Declare the win — you do not discard",
          explanation: "A winning hand is 14 tiles. The moment your draw completes it, the hand is over — discarding would break it back down to 13."
        }
      ],
      nextLessonId: "7-2"
    },

    // ---------------------------------------------------------------
    {
      id: "7-2",
      title: "The Wall and the Deal",
      subtitle: "Where tiles come from, and what happens when they run out",
      content: [
        "Every tile you draw comes from the WALL.",
        "",
        "At the start of a hand all 144 tiles are shuffled and stacked. Each",
        "player is dealt 13. What's left is the wall, and it is drawn from,",
        "one tile at a time, for the rest of the hand.",
        "",
        "THE WALL IS FINITE",
        "This is the part new players miss. The wall is not endless. Every draw",
        "spends it, and a hand has a hard time limit measured in tiles.",
        "",
        "You are not just racing the other players. You are racing the wall.",
        "",
        "THE DEAD WALL",
        "A portion at the end is set aside and never drawn in the normal way.",
        "It exists to pay out replacements — when you declare a kong, or reveal",
        "a flower or season, you take a replacement tile from there instead.",
        "",
        "That is why a kong doesn't cost you a turn: you gave up a tile from",
        "the live wall, so you get one back from the dead wall.",
        "",
        "WHEN THE WALL RUNS OUT",
        "If the last live tile is drawn and nobody has won, the hand is a DRAW.",
        "Nobody wins it.",
        "",
        "But a draw is not nothing. In this game there is a penalty at the end:",
        "",
        `Every player NOT in tenpai pays ${NOTEN_PENALTY_PER_NOTEN}, split among the players`,
        "who are.",
        "",
        "Tenpai means you are one tile away from winning. Noten means you are",
        "not.",
        "",
        "If everyone is tenpai, or nobody is, nothing changes hands.",
        "",
        "The practical lesson: as the wall gets low, a hand that cannot win is",
        "worth steering toward tenpai anyway. Being one tile short pays. Being",
        "three tiles short costs."
      ],
      keyTakeaways: [
        "Tiles are drawn from the wall, which is finite — the hand is on a clock.",
        "Kongs and flowers draw replacements from the dead wall, so they cost you no turn.",
        `If the wall empties with no winner the hand is a draw, and noten players pay ${NOTEN_PENALTY_PER_NOTEN}.`
      ],
      quiz: [
        {
          id: "7-2-q1",
          type: "multiple-choice",
          question: "The last tile is drawn and nobody has won. What happens?",
          options: [
            "The dealer automatically wins",
            "The hand is a draw, and noten players pay tenpai players",
            "Everyone reshuffles and replays with no consequences",
            "The player with the most sets wins"
          ],
          correctAnswer: "The hand is a draw, and noten players pay tenpai players",
          explanation: `Nobody wins a drawn hand, but it is not neutral: each player who is not one tile from winning pays ${NOTEN_PENALTY_PER_NOTEN}, split among those who are.`
        },
        {
          id: "7-2-q2",
          type: "multiple-choice",
          question: "Why does declaring a kong not cost you your turn?",
          options: [
            "Kongs are scored separately from the turn order",
            "You draw a replacement tile from the dead wall",
            "The next player forfeits their turn instead",
            "It does cost you your turn"
          ],
          correctAnswer: "You draw a replacement tile from the dead wall",
          explanation: "A kong commits a fourth tile to a set, so you take a replacement from the dead wall and carry on. That is exactly what the dead wall is reserved for."
        }
      ],
      nextLessonId: "7-3"
    },

    // ---------------------------------------------------------------
    {
      id: "7-3",
      title: "Claiming a Discard",
      subtitle: "Taking a tile that isn't yours",
      content: [
        "So far a turn only uses tiles you draw yourself. Here is the rule that",
        "makes mahjong a game rather than four people playing solitaire:",
        "",
        "ANY DISCARD IS FAIR GAME",
        "When a player discards, that tile is briefly available to everyone",
        "else. If it completes a set for you, you can CLAIM it — take it out of",
        "the discard and use it immediately.",
        "",
        "You do not have to wait for your turn. That is the point.",
        "",
        "WHAT CLAIMING BUYS YOU",
        "Speed. A tile you would have waited ten turns to draw is yours now.",
        "Claiming is how a hand goes from hopeless to one-away in a single move.",
        "",
        "WHAT CLAIMING COSTS YOU",
        "The set becomes EXPOSED. You lay it face-up on the table and it stays",
        "there for the rest of the hand.",
        "",
        "That costs you two things:",
        "",
        "1. INFORMATION. Everyone can now see part of your hand. A player who",
        "   sees you expose two bamboo sets will stop discarding bamboo.",
        "",
        "2. VALUE. Many of the better scoring hands require a fully concealed",
        "   hand. One claim can close those doors permanently.",
        "",
        "So the real question is never 'can I claim this?' — it is 'is this",
        "tile worth showing my hand for?'",
        "",
        "Early in a hand, with a hand that is far from finished, usually yes.",
        "Late, holding a concealed hand worth real points, often no.",
        "",
        "The next three lessons are the rules that decide WHICH claims are",
        "legal and WHO gets the tile when more than one player wants it."
      ],
      tiles: ["bamboo-3", "bamboo-3", "bamboo-3", "dot-7", "dot-8", "dot-9"],
      keyTakeaways: [
        "Any discard can be claimed by any player who can use it — not just on your turn.",
        "Claiming buys speed but exposes the set face-up for the rest of the hand.",
        "An exposed hand leaks information and can forfeit concealed-hand scoring."
      ],
      quiz: [
        {
          id: "7-3-q1",
          type: "multiple-choice",
          question: "What is the main cost of claiming a discard?",
          options: [
            "You lose your next turn",
            "The set is exposed face-up, leaking information and forfeiting concealed-hand value",
            "You must pay the discarding player",
            "You can no longer declare a kong"
          ],
          correctAnswer: "The set is exposed face-up, leaking information and forfeiting concealed-hand value",
          explanation: "The tile is free but the set goes face-up permanently. Opponents adjust their discards, and hands that require concealment are no longer available to you."
        }
      ],
      nextLessonId: "7-4"
    },

    // ---------------------------------------------------------------
    {
      id: "7-4",
      title: "Chow Comes From One Seat Only",
      subtitle: "The rule players get wrong most often",
      content: [
        "Here is the rule that catches almost everyone.",
        "",
        "PUNG AND KONG — FROM ANYONE",
        "If any player at the table discards a tile you hold two of, you can",
        "pung it. Three of, you can kong it. It does not matter who discarded.",
        "",
        "CHOW — FROM ONE PLAYER ONLY",
        "You can only chow from the player who plays immediately before you.",
        "",
        "That is the player on your LEFT — the one whose discard you see right",
        "before your own turn starts.",
        "",
        "If anyone else discards the exact tile that completes your run, you",
        "cannot take it. You watch it go.",
        "",
        "WHY THIS RULE EXISTS",
        "Think about what a chow does to the turn order. A pung or kong is rare",
        "enough that jumping the queue for one is fine. But runs are common —",
        "if you could chow from anyone, the turn order would barely survive",
        "first contact.",
        "",
        "Restricting chow to the player right before you means the tile was",
        "about to reach you anyway. You are taking your own turn slightly",
        "early, not stealing someone else's.",
        "",
        "WHAT THIS MEANS IN PLAY",
        "The player to your left is your supply line. Watch what they discard",
        "more closely than anyone else's — for runs, they are your only source",
        "besides the wall.",
        "",
        "And in the other direction: the player to your RIGHT can chow from",
        "you. If they are visibly collecting dots, think twice before feeding",
        "them a dot.",
        "",
        "One more restriction: chow only works on suit tiles — bamboo,",
        "characters, dots. Winds and dragons have no sequence, so there is",
        "nothing to run."
      ],
      tiles: ["dot-7", "dot-8", "dot-9", "wind-east", "dragon-red"],
      keyTakeaways: [
        "Pung and kong can be claimed from any player's discard.",
        "Chow can only be claimed from the player immediately before you — the one on your left.",
        "Chow works only on suit tiles; winds and dragons have no sequences."
      ],
      quiz: [
        {
          id: "7-4-q1",
          type: "multiple-choice",
          question: "The player across the table discards the exact tile that completes your run. Can you chow it?",
          options: [
            "Yes, any discard can be chowed",
            "No — chow is only legal from the player immediately before you",
            "Yes, but only if nobody else wants it",
            "Only if you have already exposed a set"
          ],
          correctAnswer: "No — chow is only legal from the player immediately before you",
          explanation: "Chow is restricted to the seat that plays right before yours. From any other player, you watch the tile go — even if it was exactly what you needed."
        },
        {
          id: "7-4-q2",
          type: "multiple-choice",
          question: "Which claim can you make on a discard from ANY player at the table?",
          options: ["Chow only", "Pung and kong", "Only claims made on your own turn", "None — all claims are seat-restricted"],
          correctAnswer: "Pung and kong",
          explanation: "Pung and kong have no seat restriction. Only chow does."
        }
      ],
      nextLessonId: "7-5"
    },

    // ---------------------------------------------------------------
    {
      id: "7-5",
      title: "Who Wins the Tile",
      subtitle: "Claim priority, and what happens on a tie",
      content: [
        "One tile hits the discard pile. Two players want it. Who gets it?",
        "",
        "There is a fixed order. It never changes:",
        "",
        "WIN  >  KONG  >  PUNG  >  CHOW",
        "",
        "A player claiming to win beats a player claiming a kong. A kong beats",
        "a pung. A pung beats a chow. Always, regardless of seat.",
        "",
        "WHY THIS ORDER",
        "It runs from most decisive to least. A win ends the hand — nothing",
        "should outrank it. A chow is the cheapest and most common claim, so it",
        "sits at the bottom.",
        "",
        "Notice what this means for chow: it loses to everything. Your chow is",
        "the claim most likely to be taken out from under you.",
        "",
        "WHEN TWO PLAYERS MAKE THE SAME CLAIM",
        "Two players both want to pung the same tile. Priority is equal, so it",
        "cannot break the tie.",
        "",
        "The tile goes to whichever of them is CLOSEST TO THE DISCARDER in turn",
        "order — the one who would have played soonest anyway.",
        "",
        "This is the same principle as the chow rule. When the game has to pick,",
        "it picks the player the tile was already heading toward. Turn order is",
        "the tie-breaker for everything.",
        "",
        "WHAT TO DO WITH THIS",
        "Do not count on a chow. If a tile you want is also a plausible pung for",
        "someone else, assume you will lose it and have a second plan.",
        "",
        "And when you hold a pair of something conspicuous — dragons, the round",
        "wind — remember other players may be sitting on the same pair. Closest",
        "seat wins, and you may not be it."
      ],
      keyTakeaways: [
        "Claim priority is fixed: win beats kong, kong beats pung, pung beats chow.",
        "Equal claims go to the player closest to the discarder in turn order.",
        "Chow is the lowest priority — never rely on getting one."
      ],
      quiz: [
        {
          id: "7-5-q1",
          type: "multiple-choice",
          question: "One player can chow the discard, another can pung it. Who gets the tile?",
          options: [
            "The chow — runs take precedence",
            "The pung — pung outranks chow",
            "Whoever is closest to the discarder",
            "Neither; the tile stays in the discard pile"
          ],
          correctAnswer: "The pung — pung outranks chow",
          explanation: "Priority is win > kong > pung > chow, and it is checked before seat position. Pung beats chow no matter where either player sits."
        },
        {
          id: "7-5-q2",
          type: "multiple-choice",
          question: "Two players both want to pung the same discard. How is it settled?",
          options: [
            "The player with the higher-scoring hand",
            "The player closest to the discarder in turn order",
            "The dealer always wins ties",
            "Whoever claimed first in real time"
          ],
          correctAnswer: "The player closest to the discarder in turn order",
          explanation: "Priority is equal, so turn order decides: the tile goes to whichever claimant would have played soonest anyway."
        }
      ],
      nextLessonId: "7-6"
    },

    // ---------------------------------------------------------------
    {
      id: "7-6",
      title: "Claims Skip Players",
      subtitle: "The consequence nobody explains",
      content: [
        "This is the part that confuses new players more than any other rule,",
        "because nothing announces it. You just quietly lose a turn.",
        "",
        "WHEN A CLAIM JUMPS THE QUEUE",
        "Normally, after a discard, play moves to the very next seat.",
        "",
        "But when a player claims a discard, play jumps straight to THEM. They",
        "take the tile, expose the set, and discard.",
        "",
        "Anyone sitting between the discarder and the claimant is skipped.",
        "",
        "They do not get a turn. They do not draw. Play simply passes them.",
        "",
        "AN EXAMPLE",
        "Seats play in order: you, then Player B, then Player C, then Player D.",
        "",
        "You discard. Normally B draws next.",
        "",
        "But D holds a pair of your tile and pungs it. Play jumps to D.",
        "",
        "B and C are skipped. Neither one drew a tile. From B's point of view,",
        "their turn simply never arrived.",
        "",
        "WHY THIS MATTERS MORE THAN IT SOUNDS",
        "Every skipped turn is a tile you never drew. In a hand with an eight-",
        "turn budget, being skipped twice is a quarter of your remaining draws.",
        "",
        "It also means the wall drains at an unpredictable rate. A hand with",
        "heavy claiming ends far sooner than a quiet one, because claims consume",
        "discards without consuming draws.",
        "",
        "TWO PRACTICAL CONSEQUENCES",
        "",
        "1. Do not plan on a fixed number of remaining turns. You do not control",
        "   how many you get.",
        "",
        "2. Late in a hand, a claim by a player downstream of you can end your",
        "   hand's realistic chances without you ever getting to act again."
      ],
      keyTakeaways: [
        "A claim jumps play directly to the claimant — the normal turn order is bypassed.",
        "Players sitting between the discarder and the claimant lose their turn entirely.",
        "You cannot count on a fixed number of remaining draws; claiming steals them."
      ],
      quiz: [
        {
          id: "7-6-q1",
          type: "multiple-choice",
          question: "You discard. The player two seats after you pungs it. What happens to the player directly after you?",
          options: [
            "They draw first, then play passes to the claimant",
            "They are skipped and do not draw at all",
            "They choose whether to take their turn",
            "They draw two tiles on their next turn to compensate"
          ],
          correctAnswer: "They are skipped and do not draw at all",
          explanation: "A claim moves play directly to the claimant. Everyone between the discarder and the claimant is passed over and loses that turn."
        }
      ],
      nextLessonId: "7-7"
    },

    // ---------------------------------------------------------------
    {
      id: "7-7",
      title: "Dealer, Seat Winds and Rounds",
      subtitle: "Why your seat is worth points",
      content: [
        "A game is not one hand. It is a sequence of them, and your seat",
        "changes as they go.",
        "",
        "THE DEALER IS EAST",
        "One player is the dealer each hand, and the dealer is always East.",
        "The others take South, West and North going around from there.",
        "",
        "That is your SEAT WIND, and it is worth real points: completing a set",
        "of your own seat wind scores, where a set of some unrelated wind does",
        "not.",
        "",
        "So East, South, West and North are not decorations. Which wind is",
        "valuable to you changes hand to hand as the dealership moves.",
        "",
        "WHEN THE DEALER CHANGES",
        "Here is the rule, and note the second half — it is the part that",
        "surprises people:",
        "",
        "The dealer KEEPS the deal if they win the hand.",
        "The dealer ALSO keeps the deal if the hand ends in a draw.",
        "",
        "Otherwise — any other player wins — the dealership passes on, and",
        "everyone's seat wind shifts with it.",
        "",
        "A dealer on a run can hold the deal for several hands. A drawn hand",
        "changes nothing about who deals next.",
        "",
        "THE PREVAILING WIND",
        "There is a second wind in play: the ROUND wind, shared by everyone.",
        "",
        "A full game runs East round, then South, West and North. Each round",
        "lasts until the dealership has gone all the way around the table.",
        "",
        "A set of the current round's wind scores for ANY player. So in an East",
        "round, East tiles are valuable to everyone — which is exactly why they",
        "are dangerous to discard.",
        "",
        "A quick game is the East round only.",
        "",
        "PUTTING IT TOGETHER",
        "At any moment two winds matter to you: your seat wind, and the round",
        "wind. If you are East seat in the East round, East tiles are doubly",
        "worth collecting — and everyone else knows you want them."
      ],
      tiles: ["wind-east", "wind-south", "wind-west", "wind-north"],
      keyTakeaways: [
        "The dealer is always East, and seat winds run round the table from there.",
        "The dealer keeps the deal on a win AND on a draw; otherwise it passes on.",
        "Your seat wind and the current round wind both score — other winds do not."
      ],
      quiz: [
        {
          id: "7-7-q1",
          type: "multiple-choice",
          question: "A hand ends in a draw. Who deals the next hand?",
          options: [
            "The same dealer — the deal is retained on a draw",
            "The player to the dealer's right",
            "The player who was closest to winning",
            "The dealer rotates as normal"
          ],
          correctAnswer: "The same dealer — the deal is retained on a draw",
          explanation: "The dealership passes only when another player wins. Both a dealer win and a drawn hand leave the dealer in place."
        },
        {
          id: "7-7-q2",
          type: "multiple-choice",
          question: "Why is a set of the current round's wind worth collecting?",
          options: [
            "It scores for any player, not just the one whose seat it is",
            "It forces the dealer to rotate",
            "It is the only set that can be konged",
            "It doubles the value of every other set"
          ],
          correctAnswer: "It scores for any player, not just the one whose seat it is",
          explanation: "Two winds score: your own seat wind, and the prevailing round wind. The round wind is valuable to everyone at the table simultaneously."
        }
      ],
      nextLessonId: "7-8"
    },

    // ---------------------------------------------------------------
    {
      id: "7-8",
      title: "A Hand From Start to Finish",
      subtitle: "Everything above, in one worked example",
      content: [
        "One hand, narrated. You are East, so you are the dealer.",
        "",
        "THE DEAL",
        "You are dealt 13 tiles. They are a mess — a pair of 3 bamboo, a loose",
        "7 and 8 dot, three unconnected winds, and assorted junk.",
        "",
        "This is normal. Nobody is dealt a good hand.",
        "",
        "TURN 1 — YOU",
        "As dealer you go first. You draw: a red dragon. Nothing yet, but",
        "dragons score, so it is worth holding briefly.",
        "",
        "You discard a lone 2 character. Early discards should be your most",
        "isolated tiles, and that is the loneliest thing you have.",
        "",
        "TURN 2 — PLAYER TO YOUR RIGHT",
        "They draw and discard a 9 dot.",
        "",
        "You hold 7 and 8 dot. That 9 completes a run — but can you take it?",
        "",
        "No. Chow is legal only from the player immediately before you, and",
        "this is the player immediately AFTER you. You watch it go.",
        "",
        "This is the rule from lesson 7-4, and it costs you a tile within the",
        "first minute of a real hand.",
        "",
        "TURNS 3-4",
        "Play continues around. The player before you discards a 3 bamboo.",
        "",
        "You hold a pair of them. You pung — legal from anyone — and lay the",
        "three tiles face-up.",
        "",
        "You have gained: a completed set, immediately.",
        "You have lost: concealment. Everyone now knows you collect bamboo.",
        "",
        "Because you claimed, play jumps to YOU. The player who would have gone",
        "next is skipped — lesson 7-6, and they lose a draw for it.",
        "",
        "MIDGAME",
        "You discard, play resumes. Over several turns you draw into a second",
        "run in dots and pick up a third bamboo set.",
        "",
        "Now you hold three sets, a partial fourth, and your pair. One tile from",
        "a complete hand. You are TENPAI.",
        "",
        "THE FINISH",
        "The wall is getting low. Two things can happen.",
        "",
        "EITHER you draw your tile, complete 14, and win on a self-draw.",
        "",
        "OR a player discards it. You claim to win — and remember from lesson",
        "7-5 that a win claim outranks everything, so nobody can take that tile",
        "out from under you.",
        "",
        "IF NEITHER HAPPENS",
        "The wall runs out. The hand is a draw. You were tenpai, so you collect",
        "from the players who were not — and because a draw retains the deal,",
        "you are still East for the next hand.",
        "",
        "THAT IS A HAND",
        "Draw one, discard one, around the table. Claim when the tile is worth",
        "showing your hand for. Watch the player on your left, because they are",
        "your only source of runs. Count on nothing, because claims will take",
        "your turns away.",
        "",
        "Go and play one."
      ],
      tiles: ["bamboo-3", "bamboo-3", "bamboo-3", "dot-7", "dot-8", "dot-9", "dragon-red"],
      keyTakeaways: [
        "Early discards should be your most isolated tiles.",
        "You will lose tiles you needed to the chow-seat rule — plan for it.",
        "Tenpai pays even when you do not win, and a draw leaves the dealer in place."
      ],
      quiz: [
        {
          id: "7-8-q1",
          type: "multiple-choice",
          question: "In the example, why couldn't you chow the 9 dot?",
          options: [
            "You had already exposed a set",
            "It came from the player after you, not the one before you",
            "9 dot cannot be used in a run",
            "Another player claimed it first"
          ],
          correctAnswer: "It came from the player after you, not the one before you",
          explanation: "Chow is legal only from the seat that plays immediately before yours. The tile completing your run is unavailable from any other seat."
        },
        {
          id: "7-8-q2",
          type: "multiple-choice",
          question: "You are one tile from winning and the wall runs out. What do you get?",
          options: [
            "Nothing — only a completed win pays",
            "A payment from every player who was not tenpai",
            "The full value of the hand you were building",
            "An extra turn to draw the tile"
          ],
          correctAnswer: "A payment from every player who was not tenpai",
          explanation: "A drawn hand is not neutral. Noten players pay, and tenpai players collect — which is why steering a dead hand toward tenpai is still worth doing."
        }
      ],
      nextLessonId: undefined
    }
  ]
};
