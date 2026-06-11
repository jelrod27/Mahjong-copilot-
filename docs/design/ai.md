# AI Opponent Design

Three honest skill tiers live in `web/engine/ai/`. None of them cheats: every
tier reads only public information — its own hand, the discard piles, exposed
melds, flower displays, opponents' hand *counts* (publicly visible at a real
table), and the number of tiles left in the wall. No tier ever reads another
player's concealed tiles or the wall's contents. `aiUtils.countVisibleTiles`
is the shared lens and it only counts discards, melds, and the AI's own hand.

All AI randomness is deterministic: decisions derive jitter from
`deterministicNoise(seed, turnCount, tileId)` (`engine/rng.ts`), so a game
replayed from the same seed and action sequence produces identical AI play.

## Tier 1 — Novice (`easyAI.ts`, difficulty `easy`)

The table tourist. Plays its own hand, badly, and tells you nothing about
yours.

Decision heuristics:
- **Win**: always declares when `canPlayerWin` says yes.
- **Discard**: per-tile desirability score. Keeps pungs (-10) and pairs (-5);
  dumps isolated honors (+10), isolated terminals (+5), isolated middles (+3);
  mildly keeps chow-adjacent (-3) and gap-connected (-1) tiles. Adds
  deterministic jitter (0-2) for variety, so it leaks tiles a sharper player
  would hold.
- **Claims**: always claims a win. Pungs dragons or its seat wind with 70%
  probability. Never chows, never claims for tempo, never defends.
- **No danger model at all** — it will happily discard into an obvious wait.

## Tier 2 — Adept (`mediumAI.ts`, difficulty `medium`)

Efficiency-aware, fan-aware, still defensively naive.

Decision heuristics:
- **Discard**: simulates removing each tile and scores
  `shanten × 100 + fanRetentionBonus × 3 − discardPriority`. Always advances
  the hand; never considers what opponents are doing.
- **Fan retention** (`fanRetentionBonus`): keeps dragon pairs (+8) and
  singles (+3), seat-wind pairs (+8), prevailing-wind pairs (+6), and leans
  into one-suit hands when 8+ (+2) or 10+ (+5) tiles share a suit.
- **Concealed kong**: declares only when shanten does not get worse.
- **Claims**: claims when the meld strictly improves shanten, or holds equal
  shanten but is a dragon/wind pung (fan value).

## Tier 3 — Master (`hardAI.ts`, difficulty `hard`)

Everything Adept does, plus opponent reading and a defensive mode switch.

Decision heuristics:
- **Threat detection** (`isOpponentDangerous`): an opponent with 3+ exposed
  melds, or exposed melds late in the wall, flips the AI into defensive mode
  (only while its own hand is 2+ shanten — it stays aggressive when close).
- **Defensive mode**: scores discards `danger × 10 + shanten × 30`, with a
  −50 bonus for provably safe tiles (`isSafeTile` — tiles already discarded
  or that no one can use). It will tear up its own hand to stay safe.
- **Aggressive mode**: `shanten × 100 + danger × 3`, safe-tile bonus −20,
  and a +50 penalty against discarding dangerous tiles while tenpai.
- **Suit reading** (`detectOpponentSuitFocus`): infers one-suit pursuits from
  exposed melds and discard patterns, and adds +4 danger per focused
  opponent for tiles in their suit.
- **Kong evaluation**: compares shanten with and without declaring,
  accounting for the seven-pairs option a kong forfeits.
- **Claims**: shanten-driven like Adept, with danger awareness.

## Difficulty → tier mapping

| Player-facing | Engine | NPC examples (Phase 3) |
|---|---|---|
| Easy | `easyAI` (Novice) | Floor 1-2 rivals |
| Medium | `mediumAI` (Adept) | Floor 3-5 rivals |
| Hard | `hardAI` (Master) | Floor 6+ and the Parlour Master |

## Personality layer (Phase 3 contract)

NPC personalities are expressed as parameter overrides on top of a tier, not
as new AIs. The planned `AIPersonality` shape:

- `claimAppetite` — multiplier on claim willingness (Kid-Tornado types claim
  everything; patient types hold concealed).
- `fanGreed` — multiplier on `fanRetentionBonus` (the Collector refuses to
  break one-suit pursuits).
- `defenseBias` — shifts the defensive-mode threshold (Auntie Mei punishes
  loose discards because she reads danger earlier).
- `speedBias` — prefers cheap fast hands vs slow expensive ones.

These stay inside the engine's no-cheating envelope: personality only changes
how the AI weighs public information, never what it can see.

## Timing (UI layer, not engine)

`useGameController` paces AI turns for feel: easy 1500-2000ms, medium
1000-1200ms, hard 600-800ms, claims at 150ms. The engine itself is
synchronous and instant.
