# Mahjong Co-Pilot — Product Requirements Document

**Version:** 1.0
**Author:** Justin
**Created:** February 9, 2026
**Status:** Planning

---

## 1. Executive Summary

Mahjong Co-Pilot is an interactive Mahjong application that combines a fully playable game engine with an intelligent advisory system (the "co-pilot"). The co-pilot analyzes the player's hand in real-time and provides recommendations on optimal discards, defensive plays, and strategic decisions. The product targets Mahjong enthusiasts who want to improve their game through AI-assisted play.

### 1.1 Vision

Build the most useful Mahjong training and playing companion — a tool that lets you play complete games of Mahjong while receiving expert-level guidance on every decision, helping you internalize optimal strategy through practice rather than theory alone.

### 1.2 Success Criteria

- A human player can sit down and play a complete hand of Mahjong from deal to win/draw
- The co-pilot provides actionable discard recommendations on every turn
- The co-pilot accurately calculates shanten (distance to ready), tile acceptance counts, and waits
- Three AI opponents play with basic competency (not random, not perfect)
- The system correctly detects all standard winning hands and calculates scoring

---

## 2. Target Mahjong Variant

**Primary:** Japanese Riichi Mahjong (4-player)

Riichi is selected as the primary variant because it has the most formalized ruleset, extensive English documentation, large online player communities (Mahjong Soul, Tenhou), and readily available game logs for testing and validation.

**Future variants (out of scope for v1):** Hong Kong Old Style, Mahjong Competition Rules (MCR), Sichuan Bloody.

### 2.1 Riichi Mahjong Rules Summary (for Claude Code reference)

- 4 players, 136 tiles (no flowers/seasons)
- 34 unique tile types: 9 man (characters) + 9 pin (circles) + 9 sou (bamboo) + 4 winds + 3 dragons
- 4 copies of each tile = 136 total
- Each player dealt 13 tiles; dealer gets 14 and discards first
- Win condition: 4 sets (melds) + 1 pair = 14 tiles
- A set is either a sequence (chi: 3 consecutive same-suit tiles) or a triplet (pon: 3 identical tiles)
- Special set: kan (quad: 4 identical tiles, counts as one set but draws a replacement)
- Must have at least 1 yaku (scoring pattern) to win
- Riichi: declaring ready when concealed hand is tenpai (one tile away from winning)
- Furiten: cannot win by ron (other's discard) if any of your winning tiles are in your own discard pile
- Dora: bonus tiles that add han (scoring value) — indicated by indicator tiles on the dead wall

---

## 3. Technical Architecture

### 3.1 Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Game Engine | TypeScript | Type safety for complex game state, runs in both Node and browser |
| AI/Co-Pilot Logic | TypeScript | Same runtime as engine, no FFI overhead |
| CLI/TUI (Phase 1 UI) | Ink (React for CLI) | Rapid iteration, familiar React patterns |
| Web UI (Phase 2 UI) | Next.js + React | Full-featured web app, SSR for performance |
| Testing | Vitest | Fast, TypeScript-native, compatible with the stack |
| Build | tsup or esbuild | Fast bundling for library + app |
| Monorepo (optional) | Turborepo or pnpm workspaces | Separate engine, copilot, and UI packages cleanly |

### 3.2 Project Structure

```
mahjong-copilot/
├── docs/
│   └── PRD.md                    # This document
├── packages/
│   ├── engine/                   # Core game logic (zero UI dependencies)
│   │   ├── src/
│   │   │   ├── tiles.ts          # Tile representation and utilities
│   │   │   ├── hand.ts           # Hand data structure and operations
│   │   │   ├── wall.ts           # Wall building, shuffling, dealing
│   │   │   ├── melds.ts          # Chi, pon, kan detection and management
│   │   │   ├── game-state.ts     # Full game state machine
│   │   │   ├── turn.ts           # Turn flow logic (draw, discard, calls)
│   │   │   ├── win-detection.ts  # Hand parsing (complete hand check)
│   │   │   ├── yaku.ts           # All yaku pattern detection
│   │   │   ├── scoring.ts        # Han/fu calculation, score lookup tables
│   │   │   ├── furiten.ts        # Furiten checking logic
│   │   │   ├── riichi.ts         # Riichi declaration logic and conditions
│   │   │   ├── dora.ts           # Dora indicator and dora counting
│   │   │   ├── wall-dead.ts      # Dead wall management (rinshan, kan dora)
│   │   │   ├── players.ts        # Player state (hand, discards, melds, points)
│   │   │   ├── rules.ts          # Rule configuration (variant-specific settings)
│   │   │   └── types.ts          # Shared type definitions
│   │   └── tests/
│   │       ├── tiles.test.ts
│   │       ├── hand.test.ts
│   │       ├── win-detection.test.ts
│   │       ├── yaku.test.ts
│   │       ├── scoring.test.ts
│   │       └── game-flow.test.ts
│   ├── copilot/                  # AI advisory logic (depends on engine)
│   │   ├── src/
│   │   │   ├── shanten.ts        # Shanten calculation (distance to tenpai)
│   │   │   ├── ukeire.ts         # Tile acceptance count per discard option
│   │   │   ├── efficiency.ts     # Discard ranking by efficiency
│   │   │   ├── defense.ts        # Defensive tile danger rating
│   │   │   ├── waits.ts          # Wait analysis when in tenpai
│   │   │   ├── suggestion.ts     # Main suggestion engine (combines all signals)
│   │   │   ├── opponent-model.ts # Basic opponent behavior modeling
│   │   │   └── types.ts          # Co-pilot specific types
│   │   └── tests/
│   │       ├── shanten.test.ts
│   │       ├── ukeire.test.ts
│   │       ├── efficiency.test.ts
│   │       └── defense.test.ts
│   ├── ai-players/               # AI opponents (depends on engine + copilot)
│   │   ├── src/
│   │   │   ├── basic-ai.ts       # Simple AI using copilot suggestions
│   │   │   ├── defensive-ai.ts   # More cautious AI variant
│   │   │   └── aggressive-ai.ts  # Push-oriented AI variant
│   │   └── tests/
│   └── ui/                       # User interfaces
│       ├── tui/                  # Terminal UI (Phase 1)
│       │   ├── src/
│       │   │   ├── app.tsx       # Main Ink app
│       │   │   ├── hand-view.tsx # Render player's hand
│       │   │   ├── board-view.tsx# Render discard pools, melds, info
│       │   │   ├── copilot-panel.tsx # Show suggestions
│       │   │   └── input.tsx     # Handle keyboard input
│       │   └── index.ts
│       └── web/                  # Web UI (Phase 2)
│           ├── app/
│           ├── components/
│           │   ├── tile.tsx
│           │   ├── hand.tsx
│           │   ├── board.tsx
│           │   ├── discard-pool.tsx
│           │   ├── copilot-overlay.tsx
│           │   └── game-controls.tsx
│           └── next.config.js
├── data/
│   ├── tile-images/              # SVG or PNG tile assets
│   ├── yaku-reference.json       # Yaku definitions for validation
│   └── test-hands.json           # Known hands for testing (hand -> expected result)
├── package.json
├── tsconfig.json
└── README.md
```

### 3.3 Data Model

#### 3.3.1 Tile Representation

Use numeric IDs for efficiency with human-readable helpers:

```typescript
// Tile ID encoding: 0-135 (136 tiles total)
// Each unique tile has 4 copies
// uniqueTileId = tileId % 34 (0-33)
//
// 0-8:   1m-9m (man/characters)
// 9-17:  1p-9p (pin/circles)
// 18-26: 1s-9s (sou/bamboo)
// 27-30: East, South, West, North (winds)
// 31-33: Haku (white), Hatsu (green), Chun (red) (dragons)

type TileId = number; // 0-135 (specific copy of a tile)
type TileType = number; // 0-33 (unique tile type)

enum Suit {
  Man = 'man',     // Characters (0-8)
  Pin = 'pin',     // Circles (9-17)
  Sou = 'sou',     // Bamboo (18-26)
  Wind = 'wind',   // Winds (27-30)
  Dragon = 'dragon' // Dragons (31-33)
}

interface TileInfo {
  id: TileId;
  type: TileType;
  suit: Suit;
  value: number;        // 1-9 for suited, 1-4 for winds, 1-3 for dragons
  isHonor: boolean;     // winds + dragons
  isTerminal: boolean;  // 1 or 9 of any suit
  isRedDora: boolean;   // optional: red five variant
  display: string;      // e.g., "5m", "East", "Chun"
}
```

#### 3.3.2 Hand Representation

```typescript
// Use a 34-element array for efficient hand analysis
// Index = TileType (0-33), Value = count of that tile in hand
type HandArray = number[]; // length 34, values 0-4

interface PlayerHand {
  closed: TileId[];        // Closed tiles (concealed hand)
  closedArray: HandArray;  // Optimized 34-array view of closed tiles
  openMelds: Meld[];      // Called melds (chi, pon, open kan)
  closedKans: Meld[];     // Closed kans (concealed quads)
  tsumoTile?: TileId;     // Most recently drawn tile (if not yet discarded)
}

interface Meld {
  type: 'chi' | 'pon' | 'kan' | 'closedKan';
  tiles: TileId[];         // The tiles in the meld
  calledFrom?: PlayerId;   // Who the tile was called from (null for closed kan)
  calledTile?: TileId;     // Which specific tile was called
}
```

#### 3.3.3 Game State

```typescript
interface GameState {
  phase: GamePhase;
  round: RoundInfo;
  wall: Wall;
  players: [PlayerState, PlayerState, PlayerState, PlayerState];
  currentTurn: PlayerId;   // 0-3
  turnNumber: number;
  lastDiscard?: DiscardInfo;
  riichiSticks: number;    // On the table (from riichi declarations)
  honbaCount: number;      // Consecutive dealer wins/draws
  doraIndicators: TileId[];
  uraDoraIndicators: TileId[];  // Revealed if riichi winner
  gameLog: GameEvent[];    // Full history for replay
}

enum GamePhase {
  WaitingToStart = 'waiting',
  Dealing = 'dealing',
  PlayerDraw = 'draw',
  PlayerDiscard = 'discard',
  CallWindow = 'call_window',   // Other players can call chi/pon/kan/ron
  RiichiDeclaration = 'riichi',
  KanProcess = 'kan_process',   // Handle kan draw, new dora, etc.
  RoundEnd = 'round_end',       // Win, draw, or abort
  GameEnd = 'game_end'
}

interface PlayerState {
  id: PlayerId;
  seat: Wind;              // East/South/West/North
  hand: PlayerHand;
  discards: DiscardInfo[]; // Full discard history with metadata
  points: number;          // Current point total
  isRiichi: boolean;
  riichiTurn?: number;     // When riichi was declared
  isIppatsu: boolean;      // Can win ippatsu (within one turn of riichi)
  isFuriten: boolean;      // Currently in furiten
  isTemporaryFuriten: boolean; // Passed on a winning tile this turn cycle
}

interface DiscardInfo {
  tile: TileId;
  turnNumber: number;
  calledBy?: PlayerId;     // If someone called this tile
  isRiichiDiscard: boolean;
  isTsumogiri: boolean;   // Discarded the drawn tile directly
}

interface Wall {
  liveTiles: TileId[];     // Remaining drawable tiles
  deadWall: TileId[];      // 14 tiles: dora indicators + rinshan draws
  tilesRemaining: number;
}

interface RoundInfo {
  wind: Wind;              // Round wind (East/South)
  number: number;          // Round number within wind
  dealer: PlayerId;
  isDealer: (playerId: PlayerId) => boolean;
}
```

---

## 4. Phase Specifications

### Phase 1: Codebase Audit and Foundation

**Duration:** 3-5 days
**Goal:** Understand what exists, establish project structure, set up tooling.

#### Tasks

1.1. **Run full codebase audit** using the audit prompt (see appendix A). Document findings.

1.2. **Establish project structure** — Create the directory structure defined in Section 3.2. Set up the monorepo or workspace configuration. Initialize all package.json files with appropriate dependencies.

1.3. **Configure TypeScript** — Strict mode enabled. Path aliases for clean imports between packages. Shared tsconfig base.

1.4. **Set up testing** — Install and configure Vitest. Create test runner scripts. Establish testing conventions (file naming, test structure, fixtures location).

1.5. **Set up linting and formatting** — ESLint + Prettier with consistent config across all packages.

1.6. **Create CI pipeline** — GitHub Actions workflow: lint, typecheck, test on every push/PR.

#### Acceptance Criteria

- Project structure matches Section 3.2
- `pnpm install` succeeds with zero errors
- `pnpm test` runs (even if no tests exist yet)
- `pnpm lint` and `pnpm typecheck` pass
- CI pipeline runs on push

---

### Phase 2: Core Game Engine

**Duration:** 2-3 weeks
**Goal:** Implement a complete, correct Riichi Mahjong engine that can run a full game programmatically (no UI required).

#### 2.1 Tile System

**File:** `packages/engine/src/tiles.ts`

Implement tile creation, identification, sorting, and display utilities.

Requirements:
- Create all 136 tiles with correct IDs
- Convert between TileId (0-135) and TileType (0-33)
- Get suit, value, display name from any tile
- Sort tiles by suit then value (standard Mahjong hand ordering)
- Identify terminal tiles (1 and 9 of each suit)
- Identify honor tiles (winds and dragons)
- Red dora support (optional, configurable: one red 5 per suit)

Tests:
- All 136 tiles created correctly
- Type/suit/value extraction correct for every tile
- Sorting produces correct order
- Terminal and honor identification correct

#### 2.2 Wall and Dealing

**File:** `packages/engine/src/wall.ts`

Requirements:
- Shuffle all 136 tiles using Fisher-Yates
- Separate dead wall (14 tiles) from live wall (122 tiles)
- Deal 13 tiles to each player (dealer gets 14 in draw phase)
- Expose first dora indicator from dead wall
- Draw tiles from the live wall
- Draw replacement tiles from dead wall (for kans)
- Track remaining tile count (game draws at 14 tiles remaining in some rulesets, or when live wall is empty depending on the rule set used — default to drawing until 14 remain)
- Support seeded random for reproducible games (critical for testing)

Tests:
- All 136 tiles accounted for after deal
- No duplicate tiles
- Dead wall has exactly 14 tiles
- Seeded shuffle produces identical results

#### 2.3 Meld Logic

**File:** `packages/engine/src/melds.ts`

Requirements:
- **Chi (sequence):** Detect valid chi calls from the player to the left's discard. Must be consecutive tiles of the same suit. Only the player to the left of the discarder can call chi.
- **Pon (triplet):** Any player can call pon on any discard if they hold 2 of that tile.
- **Open kan (quad from discard):** Any player can call kan on a discard if they hold 3 of that tile.
- **Closed kan:** Player declares a concealed kan from 4 tiles in hand. Does not open the hand.
- **Added kan (shouminkan):** Player adds a drawn tile to an existing open pon to form a kan.
- **Call priority:** Ron > Pon/Kan > Chi. If multiple players can call, higher priority wins.
- **Track called tiles:** Record who called what from whom (affects scoring).

Tests:
- Chi only valid for player to the left
- Chi only valid for consecutive same-suit tiles
- Pon/kan callable by any player
- Call priority correctly resolved
- Closed kan does not open hand
- Added kan correctly extends existing pon

#### 2.4 Game State Machine

**File:** `packages/engine/src/game-state.ts`, `packages/engine/src/turn.ts`

Requirements:
- Implement the full turn cycle: Draw → (optional riichi declaration) → Discard → Call Window → Next Player
- Handle all call interruptions (chi/pon/kan/ron during call window)
- Handle kan processing (replacement draw, new dora indicator, chankan check)
- Handle riichi declaration (must be tenpai, 1000 point stick, hand becomes locked)
- Detect round-ending conditions:
  - Tsumo (self-draw win)
  - Ron (win on discard)
  - Exhaustive draw (wall empty, check tenpai/noten payments)
  - Abortive draws: 4 kans by different players, 4 same wind discards on first turn, 4 riichi, 9 different terminals/honors in starting hand
- Manage point transfers after round end
- Advance round/dealer correctly (dealer rotation on dealer loss)
- Track all game events in a log for replay

Tests:
- Complete hand plays out from deal to win
- All call types interrupt correctly
- Riichi locks hand and costs 1000 points
- Exhaustive draw handled correctly with tenpai/noten
- Abortive draws triggered correctly
- Dealer rotation correct
- Point transfers accurate

#### 2.5 Win Detection

**File:** `packages/engine/src/win-detection.ts`

Requirements:
- Parse a 14-tile hand into all possible valid groupings (4 sets + 1 pair)
- Handle standard form: 4 mentsu (sets) + 1 jantai (pair)
- Handle special forms: Seven Pairs (chiitoitsu), Thirteen Orphans (kokushi musou)
- Must find ALL valid interpretations (a hand can have multiple valid parsings — scoring picks the best)
- Efficiently handle concealed and open portions of the hand
- Must be fast — this gets called frequently by the co-pilot for shanten calculation

Algorithm recommendation: Use a recursive descent approach on the 34-element hand array. For each tile type with count >= 2, try using it as the pair, then greedily/recursively extract sets from the remaining tiles.

Tests:
- Known winning hands detected correctly
- Non-winning hands correctly rejected
- Seven pairs detected
- Thirteen orphans detected
- Multiple valid parsings found (e.g., 123 456 789 in same suit can be parsed differently)
- Edge cases: all triplets, all sequences, mixed

#### 2.6 Yaku Detection

**File:** `packages/engine/src/yaku.ts`

Implement all standard Riichi Mahjong yaku. At minimum for v1:

**1-han yaku (must have for v1):**
- Riichi (declared ready)
- Ippatsu (win within 1 turn of riichi)
- Menzen Tsumo (concealed self-draw)
- Tanyao (all simples, no terminals/honors)
- Pinfu (no-points hand: all sequences, valueless pair, two-sided wait)
- Iipeiko (two identical sequences, concealed only)
- Yakuhai (value tiles: seat wind, round wind, dragons)

**2-han yaku:**
- Double Riichi
- Chanta (all sets contain terminal or honor)
- Ittsu (straight: 123 + 456 + 789 of one suit)
- San Shoku Doujun (same sequence in all three suits)
- San Shoku Doukou (same triplet in all three suits)
- Toitoi (all triplets)
- San Ankou (three concealed triplets)
- Honroutou (only terminals and honors)
- Shousangen (little three dragons: 2 dragon triplets + dragon pair)
- Chiitoitsu (seven pairs)

**3+ han yaku:**
- Honitsu (half flush: one suit + honors)
- Junchan (all sets contain terminal, no honors)
- Ryanpeiko (two sets of identical sequences)
- Chinitsu (full flush: single suit only)

**Yakuman (limit hands):**
- Kokushi Musou (thirteen orphans)
- Suuankou (four concealed triplets)
- Daisangen (big three dragons)
- Shousuushii / Daisuushii (little/big four winds)
- Tsuuiisou (all honors)
- Chinroutou (all terminals)
- Ryuuiisou (all green)
- Chuuren Poutou (nine gates)
- Tenhou / Chiihou (heavenly/earthly hand)

Requirements:
- Each yaku is a pure function: takes hand parsing + game context → boolean + han value
- Handle open vs. closed han reductions (many yaku lose 1 han when hand is open, some are closed-only)
- For a winning hand, find ALL applicable yaku
- If no yaku applies, the hand cannot win (even if it has a valid shape)
- Stack yaku correctly (some combinations are invalid)

Tests:
- Each yaku tested with at least 3 positive and 3 negative cases
- Open vs. closed han values correct
- Yaku stacking validated
- Yakuman hands detected correctly
- "No yaku" correctly blocks the win

#### 2.7 Scoring

**File:** `packages/engine/src/scoring.ts`

Requirements:
- Calculate han (from yaku + dora + ura-dora + red dora)
- Calculate fu (minipoints) based on: base fu, wait type, set types (open/closed triplets/kans, terminal/honor), pair value, tsumo/ron
- Look up score from han/fu table
- Handle special scoring: mangan (5 han), haneman (6-7), baiman (8-10), sanbaiman (11-12), yakuman (13+)
- Handle dealer vs. non-dealer payment differences
- Handle tsumo (all players pay) vs. ron (discarder pays) payment splits
- Apply honba bonus (300 points per honba stick)
- Apply riichi stick collection (winner takes all riichi sticks on table)

Tests:
- Known han/fu combinations produce correct scores
- Dealer and non-dealer payments calculated correctly
- Tsumo split payments correct
- Honba bonus applied correctly
- Yakuman scoring correct

#### 2.8 Furiten

**File:** `packages/engine/src/furiten.ts`

Requirements:
- **Static furiten:** If any of the player's winning tiles exist in their own discard pile, they cannot win by ron
- **Temporary furiten:** If a player passes on a winning tile (chooses not to ron), they are furiten until their next draw
- **Riichi furiten:** If a riichi player passes on a win (because they didn't notice, or it's an automatic pass), they are furiten for the rest of the round
- Furiten affects ron only — tsumo is always allowed regardless of furiten state
- Must check all possible winning tiles (all tiles that would complete any valid winning interpretation)

Tests:
- Static furiten correctly detected
- Temporary furiten activates on passed win
- Riichi furiten persists correctly
- Tsumo still allowed when furiten

#### Acceptance Criteria for Phase 2

- A complete East-only game (4 rounds minimum) can be simulated programmatically with random discards
- All yaku are detected correctly against a reference test suite of 50+ known hands
- Scoring matches expected values for all test hands
- No crashes or illegal states during 1000 simulated random games
- All tests pass with >90% code coverage on the engine package

---

### Phase 3: Co-Pilot Brain

**Duration:** 2-3 weeks
**Goal:** Build the advisory system that analyzes the player's hand and recommends optimal plays.

#### 3.1 Shanten Calculator

**File:** `packages/copilot/src/shanten.ts`

Shanten = minimum number of tile swaps needed to reach tenpai (ready to win).
- Tenpai = shanten 0 (one tile away from winning)
- Iishanten = shanten 1 (two tiles away)
- etc.

Requirements:
- Calculate shanten for standard form (4 sets + 1 pair)
- Calculate shanten for chiitoitsu (seven pairs)
- Calculate shanten for kokushi musou (thirteen orphans)
- Return the minimum across all three forms
- Must be FAST — this is called thousands of times during efficiency analysis. Target: < 1ms per hand.

Algorithm recommendation: Use the well-known approach of counting mentsu (complete sets), partial sets (pairs, connected tiles), and using the formula: `shanten = 8 - 2*mentsu - max(partial, 4-mentsu) + adjustment`. Reference: the standard Japanese shanten algorithm widely documented in Mahjong programming communities.

Tests:
- Known shanten values for 100+ test hands (source from Tenhou or Mahjong Soul analysis tools)
- Tenpai hands return 0
- Winning hands return -1
- Performance benchmark: < 1ms per call on average

#### 3.2 Tile Acceptance (Ukeire)

**File:** `packages/copilot/src/ukeire.ts`

For each possible discard, calculate how many tiles in the remaining wall would improve the hand (reduce shanten).

Requirements:
- For each of the 13 tiles in hand, simulate discarding it
- For each discard, count how many unique tile types improve shanten AND how many total copies remain (accounting for visible tiles: own discards, open melds, other players' discards)
- Output: for each discard option → list of improving tiles + total count of live copies
- "Best discard by efficiency" = the discard with the highest total ukeire count

Tests:
- Known hands with known best discards verified
- Tile count correctly excludes visible tiles
- Edge case: all copies of an improving tile are visible (count = 0)

#### 3.3 Discard Efficiency Ranking

**File:** `packages/copilot/src/efficiency.ts`

Combine shanten and ukeire into a ranked recommendation.

Requirements:
- Primary sort: discards that reduce shanten > discards that maintain shanten > discards that increase shanten
- Secondary sort: among same-shanten discards, rank by ukeire (more accepting tiles = better)
- Tertiary sort: among tied ukeire, prefer discards that leave better shape (more flexible waits)
- Display format: for each discard option, show shanten change, ukeire count, and improving tiles
- When in tenpai (shanten 0): show wait tiles and count instead of ukeire

Tests:
- Rankings match known optimal plays for test hands
- Tenpai detection triggers wait display

#### 3.4 Defensive Analysis

**File:** `packages/copilot/src/defense.ts`

Rate the danger of each potential discard based on opponents' visible information.

Requirements:
- **Suji (street):** If 4 is discarded, 1 and 7 are safer (less likely to be waited on by sequence wait). Track suji for each opponent.
- **Kabe (wall):** If all 4 copies of a tile are visible, adjacent tiles are safer (can't form sequences through them).
- **No-chance (one-chance):** If 3 copies of a tile are visible, the 4th is very safe.
- **Opponent riichi analysis:** A player who declared riichi has a fixed wait. Analyze their discards before riichi for suji/kabe safety.
- **Genbutsu (100% safe tiles):** Tiles already in an opponent's discard pool are completely safe to discard against that opponent.
- **Early/late game danger:** Tiles discarded early are usually safer; honor tiles not discarded early by an opponent may be dangerous.
- **Danger rating:** Assign each discard a danger score (0-100) per opponent. Combine for overall danger.

Tests:
- Suji safety correctly calculated
- Kabe detection correct
- Genbutsu tiles rated 0 danger
- Riichi opponent analysis produces reasonable danger ratings

#### 3.5 Suggestion Engine

**File:** `packages/copilot/src/suggestion.ts`

The main co-pilot interface that combines all signals into actionable advice.

Requirements:
- Accept current game state + player hand → produce ranked discard recommendations
- Each recommendation includes:
  - Tile to discard
  - Efficiency score (shanten + ukeire)
  - Danger score (defensive rating)
  - Combined recommendation score (weighted blend based on game situation)
  - Brief explanation (e.g., "Best efficiency: 14 tiles improve hand" or "Safe tile: genbutsu for riichi player")
- Adjust weighting based on context:
  - Opponent declared riichi → increase defense weight
  - Player is dealer → slightly more aggressive (higher value wins)
  - Late in round (few tiles left) → increase defense weight
  - Player is already tenpai → pure defense for discards that don't break tenpai
- Special advice:
  - "Declare riichi?" — when tenpai, analyze whether riichi is beneficial (good wait vs. exposed hand)
  - "Call chi/pon?" — when a callable tile is discarded, advise whether calling improves or hurts the hand
  - "Push or fold?" — when an opponent is in riichi, assess whether to continue attacking or play defensively

Tests:
- Suggestions are reasonable for a set of annotated game situations
- Defense weight increases appropriately when opponent declares riichi
- Riichi declaration advice is sensible (good waits recommended, bad waits discouraged)

#### 3.6 Opponent Modeling (Basic)

**File:** `packages/copilot/src/opponent-model.ts`

Requirements (basic for v1):
- Track what tiles each opponent has discarded
- Track what melds each opponent has called
- Infer approximate hand composition (e.g., flush likely if discarding all other suits)
- Estimate opponent shanten (rough: based on how many calls they've made and discard patterns)
- Flag "dangerous opponent" based on riichi declaration, many calls, or late-game changes in discard pattern

This does NOT need to be sophisticated in v1. Basic heuristics are sufficient.

#### Acceptance Criteria for Phase 3

- Shanten calculator matches reference values for 100+ test hands with 100% accuracy
- Ukeire calculation correct for 50+ test scenarios
- Efficiency ranking recommends known-optimal discards for at least 80% of test cases
- Defense analysis correctly identifies safe tiles (genbutsu, suji, kabe)
- Suggestion engine produces reasonable advice that a skilled player would agree with in most situations
- All calculations complete in < 100ms per turn (fast enough for real-time play)

---

### Phase 4: AI Opponents

**Duration:** 1 week
**Goal:** Create three AI opponent personalities so the player can play a full 4-player game.

#### 4.1 Basic AI

**File:** `packages/ai-players/src/basic-ai.ts`

A balanced AI that uses the co-pilot logic:
- Always follows the co-pilot's top efficiency recommendation
- Defends (switches to safe tiles) when any opponent declares riichi
- Calls chi/pon when it significantly improves shanten
- Declares riichi when in tenpai with a decent wait (3+ tiles)

#### 4.2 Defensive AI

**File:** `packages/ai-players/src/defensive-ai.ts`

A cautious AI:
- Prioritizes defense more heavily
- Rarely calls (prefers concealed hand for riichi option)
- Folds quickly when opponents appear dangerous
- Only pushes with very strong hands

#### 4.3 Aggressive AI

**File:** `packages/ai-players/src/aggressive-ai.ts`

A push-oriented AI:
- Calls frequently to speed up hand completion
- Pushes through riichi (continues attacking even when opponents are in riichi)
- Goes for expensive hands (values han over speed)
- Higher risk, higher reward

#### Acceptance Criteria

- All three AIs complete 100 games without errors or illegal moves
- Basic AI win rate is between 20-30% (reasonable for a balanced player)
- No AI makes obviously illegal plays (wrong calls, furiten ron, no-yaku wins)

---

### Phase 5: Terminal UI (TUI)

**Duration:** 1-2 weeks
**Goal:** Build a playable terminal interface so a human can play against 3 AI opponents.

#### 5.1 Display Requirements

- Player's hand displayed sorted with clear tile representation (e.g., `1m 2m 3m 5p 5p 7s 8s 9s East East Haku Haku Chun`)
- Unicode tile faces if terminal supports it, ASCII fallback otherwise
- Draw tile visually separated from rest of hand (e.g., `[hand] | [drawn tile]`)
- Each opponent's discard pool visible (most recent discards highlighted)
- Open melds displayed for all players
- Round information: round wind, dealer, honba, remaining tiles, dora indicators
- Player's point total and all opponents' point totals
- Co-pilot suggestion panel showing top 3-5 recommended discards with scores and explanations

#### 5.2 Input Requirements

- Select discard by number key (1-14) or tile name
- Accept/decline call prompts (chi/pon/kan/ron) with y/n
- Riichi declaration prompt when applicable
- Tsumo declaration prompt when applicable
- Toggle co-pilot visibility (play without advice for challenge mode)
- Quit/restart controls

#### 5.3 Game Flow

- New game starts with seat assignment and initial deal
- Smooth turn progression with brief pauses for AI turns (not instant — feels unnatural)
- Clear indication of whose turn it is
- Highlight called tiles and who called them
- End-of-round scoring summary
- End-of-game final standings

#### Acceptance Criteria

- A human can play a complete East-South game (8+ rounds) in the terminal
- All game information is clearly visible and readable
- Co-pilot suggestions update on every turn
- No rendering glitches or input bugs
- Game correctly ends with final scoring

---

### Phase 6: Web UI

**Duration:** 2-3 weeks
**Goal:** Build a polished web interface as the primary way to play.

#### 6.1 Visual Design

- Clean, modern tile rendering (SVG tiles preferred for crisp scaling)
- Board layout: player's hand at bottom, opponents arranged top and sides
- Animated tile draws, discards, and calls
- Clear visual distinction between closed hand, open melds, and discards
- Dora indicator(s) prominently displayed
- Responsive design (playable on desktop and tablet; mobile stretch goal)

#### 6.2 Co-Pilot Overlay

- Semi-transparent overlay on player's tiles showing efficiency scores
- Color-coded danger ratings (green = safe, yellow = caution, red = dangerous)
- Expandable detail panel for selected tile showing full analysis
- Toggle between "efficiency mode" (attack focus) and "defense mode"
- Can be minimized or hidden entirely

#### 6.3 Game Features

- New game with configurable options (East-only vs. East-South, red dora on/off, AI difficulty)
- Game history: view past hands and the co-pilot's analysis of each decision
- Hand replay: step through a completed hand move by move
- Statistics tracking: win rate, average placement, common yaku, riichi success rate

#### 6.4 Tech Implementation

- Next.js app with React components
- Game engine runs client-side (no server needed for single-player)
- State management via React context or Zustand
- Tile assets: SVG preferred, with lazy loading
- Animations: Framer Motion or CSS transitions

#### Acceptance Criteria

- Full game playable in Chrome, Firefox, Safari
- Co-pilot overlay provides clear, non-intrusive guidance
- Page load under 3 seconds
- No visual glitches during normal gameplay
- Game state persists across page refreshes (localStorage)

---

### Phase 7: Testing and Validation

**Duration:** Ongoing (concurrent with all phases)
**Goal:** Ensure correctness, robustness, and performance.

#### 7.1 Unit Tests

- Every module has corresponding test file
- Minimum 90% code coverage on engine and copilot packages
- Tests run in < 30 seconds total

#### 7.2 Hand Scenario Tests

**File:** `data/test-hands.json`

Build a comprehensive test suite of known hands:
- 50+ winning hands with expected yaku and scores
- 50+ non-winning hands that should be rejected
- 20+ shanten test cases with known values
- 20+ efficiency test cases with known optimal discards
- Source from: Tenhou log analysis, Mahjong Soul replays, published Mahjong problems

#### 7.3 Simulation Tests

- Run 10,000 random games and verify:
  - No crashes or illegal states
  - Total points always sum correctly (zero-sum game)
  - All wins have valid yaku
  - No furiten ron wins
  - Tile counts always add up to 136
- Performance: 10,000 games complete in < 60 seconds

#### 7.4 Replay Testing

- Record complete game logs (every draw, discard, call, win)
- Replay engine can reconstruct game state from log
- Compare replayed state against original state at every step
- Use for regression testing: saved replays continue to produce identical results after code changes

#### 7.5 Co-Pilot Accuracy

- Compare co-pilot suggestions against known optimal plays from expert game logs
- Target: co-pilot agrees with expert play on 70%+ of decisions (expert play often involves reads and metagame that heuristics can't capture, so 100% is not expected)
- Track co-pilot accuracy over time as improvements are made

---

### Phase 8: Polish and Expansion

**Duration:** Ongoing
**Goal:** Improve quality, add features, expand scope.

#### 8.1 Performance Optimization

- Profile shanten calculator and optimize hot paths
- Consider WASM compilation for shanten if needed for web performance
- Optimize AI turn calculation (target < 200ms per AI turn)
- Lazy load tile assets in web UI

#### 8.2 Advanced Co-Pilot Features

- Monte Carlo simulation: for each discard, simulate N random completions of the round and calculate expected value
- Hand value estimation: not just "can I win?" but "how much is this hand worth if I win?"
- Riichi analysis: expected value of declaring riichi vs. damaten (silent tenpai)
- Call analysis: expected value of calling (faster but lower scoring) vs. keeping closed (slower but riichi option + higher scoring potential)

#### 8.3 Additional Features

- Multiplayer support (WebSocket-based, play with friends)
- More AI personalities (mimicking known player styles)
- Tutorial mode (guided lessons with specific hand setups)
- Yaku reference guide built into the UI
- Hand calculator tool (input a hand, get score)
- Replay sharing (export/import game replays)

#### 8.4 Additional Variants

- Hong Kong Old Style
- Mahjong Competition Rules (MCR)
- Sichuan Bloody
- Three-player Mahjong (sanma)

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Game engine operations (draw, discard, call, win check): < 10ms
- Co-pilot full analysis per turn: < 100ms
- AI decision making: < 200ms per turn
- Web UI initial load: < 3 seconds
- Web UI frame rate during animations: 60fps

### 5.2 Code Quality

- TypeScript strict mode everywhere
- No `any` types (use `unknown` with type guards if needed)
- All public functions documented with JSDoc
- Consistent error handling (Result types or thrown errors with clear messages)
- No circular dependencies between packages

### 5.3 Testability

- Game engine is fully deterministic when given a seed
- All modules testable in isolation (no hidden global state)
- Test fixtures are reusable and well-documented
- CI runs all tests on every commit

---

## Appendix A: Codebase Audit Prompt

Use this prompt in Claude Code before starting any implementation to understand the current state of the codebase:

```
You are performing a comprehensive codebase audit of this Mahjong Co-Pilot project. Work through the following phases methodically, outputting your findings after each phase before moving to the next.

## Phase 1: Project Inventory

Map the entire project structure and catalog everything:

- File tree: List every file and directory with a brief description of each file's purpose
- Tech stack: Identify all languages, frameworks, libraries, build tools, and runtime dependencies
- Entry points: Identify the main entry point(s)
- Configuration files: List all config files and what they configure
- Assets and static files: Images, fonts, data files, trained models, tile sets
- Tests: What testing exists? What framework? Coverage?
- Documentation: README, inline docs, API docs, comments quality

## Phase 2: Architecture Analysis

- High-level architecture: Data flow through the system, major modules/layers
- State management: How is game state tracked? What data structures?
- Mahjong domain model: How are tiles represented? Suits, honors?
- Rule engine: How are winning conditions detected? Which variant(s)?
- AI/suggestion logic: What algorithm drives suggestions?
- UI layer: What renders the interface?
- External dependencies: APIs, services, databases?

## Phase 3: Code Quality Assessment

- Code organization: Separation of concerns? Cohesion and coupling?
- Naming conventions: Consistent and descriptive?
- Error handling: Robust or happy-path only?
- Type safety: Well-typed or escape hatches?
- Dead code: Unused files, functions, imports?
- Duplication: Code that should be refactored?
- Performance concerns: Obvious inefficiencies?
- Security: Hardcoded secrets, injection risks?

## Phase 4: Functional Completeness

- Core features implemented: What works right now?
- Partially implemented: What is started but incomplete?
- Missing features: What is clearly missing?
- Known bugs: Obvious bugs from reading the code?
- Edge cases: Are Mahjong edge cases handled?

## Phase 5: Recommendations

Provide a prioritized action plan:

### Critical (fix first)
### High Priority (do next)
### Medium Priority (improve)
### Low Priority (nice to have)
### Architecture Recommendations

For each item: what, why, how, and estimated complexity (small/medium/large).

Reference actual file names, function names, and line numbers. Be specific.
```

---

## Appendix B: Key Reference Resources

- **Riichi Mahjong rules:** riichi.wiki (comprehensive English ruleset)
- **Shanten algorithm:** Reference implementations on GitHub (search "mahjong shanten algorithm")
- **Yaku list:** riichi.wiki/wiki/List_of_yaku
- **Scoring tables:** riichi.wiki/wiki/Scoring_table
- **Tenhou log format:** For test data extraction
- **Mahjong Soul:** For visual reference and gameplay testing

---

## Appendix C: Claude Code Usage Guide

When working with Claude Code on this project:

1. **Always read this PRD first** (`docs/PRD.md`) before starting any work session.
2. **Reference specific sections** when asking for implementation. Example: "Implement Section 2.5 (Win Detection) according to the PRD."
3. **Run tests after every implementation.** Don't move to the next module until the current one passes all tests.
4. **Follow the phase order.** Each phase depends on the previous one. Don't skip ahead.
5. **When in doubt about Mahjong rules,** reference the resources in Appendix B. Do not guess — incorrect rule implementation creates bugs that are extremely hard to trace.
6. **Keep the game engine pure.** Zero UI code in the engine package. Zero side effects. Pure functions wherever possible. This makes testing trivial and enables both TUI and web UI to share the same engine.
