# Phase 0: Discovery and Brutal Honest Review

Date: 2026-06-10. Reviewed at commit 21ee132 on `feature/legendary-elevation-pass`.
Method: three deep code-mapping passes (engine, UI/state/rendering, teaching/progression)
plus hands-on play of every route in a live dev server.

## The one-paragraph verdict

This is a competent, honest mahjong app with a real engine, real tests, and a
genuinely good in-game coaching layer wearing the name "16 Bit Mahjong" without
earning the "16 Bit" part. The play loop teaches well; everything around the play
loop is courseware. There is no music, no world, no rival, no tomorrow. A player
who finishes Lesson 1 is handed Lesson 2's wall of text and 46 more after it.
The bones are strong. The soul is missing.

## The single biggest reason a Lesson 1 finisher does not come back tomorrow

**There is nothing to come back TO.** No daily appointment, no rank to defend, no
rival to beat, no streak to protect, no world that noticed they left. The reward
for finishing Lesson 1 is Lesson 2: more paragraphs, another multiple-choice quiz.
The only identity the game offers a returning player is "0/48 lessons completed"
and a stat card that proudly reports there are 144 tiles in a mahjong set.

Every later phase must attack this: give the player an appointment (Daily Hand),
an identity (rank ladder, graduation made visible), and an antagonist (the Parlour
climb, NPCs who remember you).

## Seven-axis scorecard (before)

| Axis | Score | Summary |
|---|---|---|
| Engine correctness | 6/10 | Solid core, ~228 tests, but heuristic shanten in a money path, dead fan code, no seedable RNG, single-winner-only claims |
| Game feel | 4/10 | CSS keyframes and a win count-up exist; tiles teleport rather than travel; no claim snap, no sort animation, no escalation |
| Teaching design | 5/10 | In-game coach is genuinely good; the 48-lesson track is a textbook; the seam between them is broken |
| Visual identity | 5/10 | Coherent warm-parlor look, but nothing 16-bit about it; six NPC portraits share one face |
| Audio | 2/10 | Nine procedural oscillator beeps. No music. No variation. Half the retro fantasy is silent |
| Personality / NPCs | 4/10 | Real NPC data model (emotions, voice lines, portraits) but zero gameplay personality; board still labels them "West AI" |
| Retention loop | 3/10 | Graduation tiers and a top-2 streak exist, surfaced only post-match; no daily, no share, no achievements |

**Total: 29/70.** Functional learning platform. Not yet a game people love.

---

## Axis details

### 1. Engine correctness — 6/10

The engine (`web/engine/`) is pure TS, deterministic-in-shape, framework-free,
and decently tested (~228 it-blocks). 144-tile integrity verified
(`models/Tile.ts:65`). Win detection handles standard decomposition, thirteen
orphans, seven pairs. Scoring implements 9 limit hands and ~19 standard fans
with the 8 x 2^fan payment formula and discarder-pays/all-pay split. Claim
priority (win > kong > pung > chow, tie to closest from discarder) is enforced.
AI provably does not cheat: all three tiers read only public information.

What costs it four points:

- **No seedable RNG.** `Math.random()` at `turnManager.ts:128` (the shuffle) and
  inside `easyAI`. Games are unreproducible. Blocks replays, puzzles, the Daily
  Hand, and serious correctness testing. Highest-priority fix in Phase 1.
- **Heuristic shanten in a money path.** `calculateShanten` is explicitly a
  simplified approximation "for AI use" (`winDetection.ts:355`), yet it decides
  tenpai/noten settlement at wall exhaustion via `isPlayerTenpai`. A wrong
  shanten=0 mispays real points.
- **Dead fan code.** "Last Tile Draw" and "Last Tile Claim" fans exist in
  `scoring.ts:231-235` but `turnManager` never sets those win methods. They can
  never fire. Heavenly and earthly hands are absent entirely.
- **Dead wall is not a true reserve.** Replacement draws fall back from the
  14-tile dead wall into the live wall; exhaustion triggers on `wall.length === 0`,
  so the HK convention of a held-back wall is only approximated.
- **Single-winner-only claim resolution** (`turnManager.ts:647`): a second
  simultaneous win claim is silently dropped, with the duplicate priority logic
  in `claiming.resolveClaims` unused by live play — a divergence trap.
- **Subtle dealer-rotation state machine** (`matchManager.ts:108-143`) is the
  likeliest home of an off-by-one in round advancement; tests exist but edges
  need adversarial coverage.

### 2. Game feel — 4/10

There is more here than expected: `globals.css` carries ~25 keyframes
(tile-draw, tile-win, score-punch, winner-spotlight, confetti-fall, speech
bubble pops, AI thinking halo), and `HandResultScreen` runs a real win sequence
(spotlight, staggered fan-row reveal, animated point count-up, tiered win
sounds, CSS confetti for human wins). NPC portraits react with emotion wiggles
and speech bubbles. `prefers-reduced-motion` is honored.

Why it still feels flat:

- **Tiles teleport.** A discard disappears from your hand and appears in the
  pool grid. No arc, no landing, no clack-with-weight. A pung claim does not
  snap tiles across the table; the meld just exists on the next render.
- **No hand-sort animation** and no manual sort. Tiles reorder instantly.
- **A 3-faan and a 10-faan win feel nearly identical** — same confetti count,
  same sequence; only the final sound differs.
- **No tension.** Nothing changes when the wall runs low or an opponent sits
  one tile from a visible flush. The most dramatic moments in mahjong have zero
  presentation.
- **No boot/identity motion.** No CRT option, no cartridge boot, standard
  cursor; the "16 bit" of the title lives only in the logo font.
- Performance: tile/animation state correctly lives outside Redux (good), but
  `useGameController`'s tenpai effect brute-forces 34 tile prototypes through
  `canPlayerWin` on every opponent action — the one real hot-path offender.

### 3. Teaching design — 5/10

Two disconnected halves:

- **The in-game half is genuinely good.** Tutor advice with per-tile reasoning,
  live faan meter, discard reading, safe-tile hints, per-hand review surfacing
  `reviewAnalyzer` insights, hand replay scrubber, graduation tiers on the
  match recap. This is where learning actually happens.
- **The `/learn` half is a textbook.** 48 lessons; ~46 are paragraphs plus
  multiple-choice. Exactly 2 use the one working interactive type
  (`set-builder`); `tile-recognition` is declared and never used. Linear
  lock-step gating. The teaching voice is an anonymous tooltip, not a character.
- **The seam is broken.** The game never points back at a relevant lesson; the
  lessons never preview the game. The home dashboard only counts Level 1 of 6
  (`app/(main)/page.tsx:31`) and renders a hardcoded stale "Level 2 — Locked"
  card whose title does not match the real Level 2.
- No spaced repetition anywhere, despite quiz-miss data being recorded.

### 4. Visual identity — 5/10

The warm parlor look (deep green felt, gold serif display, vignette, tile
palettes, table felts) is coherent and calm, and the semantic token system in
`tailwind.config.ts`/`globals.css` is disciplined. But the game is called
**16 Bit** Mahjong and has effectively zero 16-bit identity: no pixel art, no
dithering, no chunky UI, no scanlines, no sprite-like motion. Tiles are clean
CSS divs with CJK glyphs (readable, but flat). The six NPC portraits are one
procedural SVG face with six hairstyles — at a glance, the same person. The
brand promise and the art direction are different products.

### 5. Audio — 2/10

`lib/soundManager.ts` generates nine 8-bit-ish tones with raw oscillators
(tilePlace, tileDraw, claim, win, winSelfDraw, winLimitHand, pass, turnAlert,
kong). There are zero audio assets in `public/`, no music of any kind, no
variation (every clack is identical), and a likely-vestigial second audio
service (`lib/soundService.ts`) worth auditing. SpeechSynthesis tile callouts
(Cantonese/Mandarin/English) are a nice touch. For a retro game, silence is
the single largest missing sense; this axis is half the fantasy.

### 6. Personality / NPCs — 4/10

The foundation is better than expected: `content/npcs.ts` defines six
characters with archetypes, blurbs, visual traits, and voice lines across six
emotions; `useNpcEmotion` drives reactive portraits and speech bubbles;
rosters rotate between matches. But:

- **Personality is skin-deep.** All NPCs play identical AI for a given
  difficulty. Mei does not punish loose discards; nobody has a signature
  obsession. The data model has no AI-parameter hook at all.
- **The board itself doesn't believe in them**: discard rows are labeled
  "West AI", "North AI", "East AI" while the portraits above say Mei, Hana, Yuki.
- No story, no progression relationship, no mentor figure. Voice lines are
  generic mood barks, not tied to what you did.

### 7. Retention loop — 3/10

What exists: an 8-tier graduation ladder (`lib/graduation.ts`) shown only on
the match-over screen, a top-2 placement streak, quiz mastery badges, NPC
roster rotation. What does not exist: any daily content, any calendar streak,
any share mechanism, any achievement list, any reason the home screen gives a
returning player to feel progress (it shows Level-1-only progress and "144
TOTAL TILES" as a stat). Multiplayer/leaderboard exist behind accounts but the
solo loop — the actual product — has no appointment mechanics. Nothing
acknowledges your return. Day 2 is on the player's willpower alone.

---

## Codebase facts later phases depend on

- Engine is cleanly isolated; `useGameController` is the only bridge. Solo
  game state lives in hook-local `useState`, NOT Redux — re-render blast
  radius is already contained.
- Persistence is localStorage-only for solo (`lib/storageService.ts`,
  `lib/gameStats.ts` under key `16bit-mahjong-stats`); Supabase is auth/
  multiplayer only. Local-first mandate is already satisfied.
- Lesson content is pure data (`content/level*.ts`) — restructuring into
  floors is a content edit, not an architecture fight.
- NPC system (data + SVG rig + emotion engine) is a real foundation to build
  the Parlour cast on; it needs an AI-personality parameter layer and art.
- Redux `gameReducer` and `progressReducer` are largely vestigial for solo;
  two parallel progress stores exist (Redux vs gameStats blob). Consolidation
  candidate, not urgent.
- Known UI bugs found while playing: bare-text "Lesson not found" error state;
  stale hardcoded Level 2 card on home; seat labels ignoring NPC names.

## Priority order for the elevation (informed by this review)

1. **Seedable RNG** — unblocks Daily Hand, puzzles, replays, deterministic tests.
2. **Engine money-path fixes** — exact shanten for settlement, dead fans wired
   or removed, claim resolution unified.
3. **Game feel** — tile travel, claim snap, escalating win sequence. The play
   loop is the product; make it feel like one.
4. **The Parlour** — NPCs with real play styles wrapping the existing AI tiers;
   floors replacing the lesson textbook.
5. **Audio** — music and varied SFX; biggest fantasy-per-engineering-hour ratio.
6. **Daily Hand + streak + rank visibility** — the tomorrow-hook.
