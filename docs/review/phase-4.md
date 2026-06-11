# Phase 4: Teaching and Progression Redesign

Date: 2026-06-10. This phase splits into (a) what shipped now and (b) a
grounded spec for the full courseware-to-floors restructure, sized for the
backlog. The Parlour (Phase 3) already carries the structural insight:
the climb IS the curriculum.

## Shipped this phase

### The home screen tells you who you are

The old dashboard reported Level-1-only progress as "overall," carried a
hardcoded fake "Level 2 — Locked" card whose title didn't match the real
Level 2, and burned a stat card on "144 TOTAL TILES." Replaced with:

- **Rank identity** (`lib/ranks.ts`): a nine-tier ladder with parlour
  flavor — Newcomer, Table Student, Floor Climber, Hand Builder, Counting
  Adept, Faan Collector, Table Reader, Jade Challenger, Parlour Legend.
  Ranks derive from Parlour floors and real wins, never decrease, and show
  as a chip under the title with their flavor line.
- **Rank-up ceremony**: a celebratory banner with the win fanfare fires
  once when your rank rises since last seen (localStorage-tracked).
- **The Parlour as primary progress**: Gam's card with his progress-aware
  line and the 0-9 floors-lit bar; the main CTA is "Climb to <next floor>".
- **Honest lesson progress**: all 48 lessons across all 6 levels, with the
  real /learn link. Fake Level 2 card and filler stats removed.

### Already shipped by earlier phases (counted against Phase 4 goals)

- "Prove it in a real match against that floor's NPC. Win to ascend" —
  the Parlour floor structure is live for all nine floors (Phase 3).
- Post-match review with concrete insights — pre-existing reviewAnalyzer
  surface, now framed by Gam's win/loss dialogue in floor matches.
- Engine seeding for puzzles — `initializeGame({ seed })` (Phase 1).

## Spec: the remaining redesign (backlog, sized)

### 1. Lessons become floor briefings (M)

Restructure `content/level*.ts` (pure data, no architecture change) from
6 levels × 8 text lessons into 9 floor briefings: a sub-90-second concept
("what this floor's rival will punish"), then 3-5 interactive drills, then
the floor match as the exam. The existing `interactiveType` slot already
supports `set-builder`; add `tile-recognition` (declared but unused) and
two new drill types below. Lesson completion feeds floor unlock as an
ALTERNATIVE path to beating the previous floor (learn OR fight your way up).

### 2. Seeded skill puzzles (M)

A puzzle is `{ seed, constructedState, objective, parMoves }` evaluated by
the engine. Three types, all reusing existing engine surface:
- "Win in one draw": constructed tenpai hand; objective
  `isTenpai`/`canPlayerWin` after the player's discard choice.
- "Find the safest discard": objective compares the player's pick against
  `tileDangerScore` rankings (already powers hard AI).
- "Maximize this hand": objective compares chosen discard against
  `projectFaan` deltas (already powers the faan meter).
Grade 1-3 stars (optimal / safe / completed). Surface as 3-5 drills per
floor briefing and as the Daily Hand variant pool (Phase 6).

### 3. Spaced repetition hooks (S)

`recordQuizCompletion` already stores per-quiz misses; add a
`lib/flashcards.ts` queue keyed on missed tile-reading and scoring
questions, surfaced in two existing dead moments: the between-hands
result screen (one card under "Next up") and the boot/loading screen.
No new screens needed.

### 4. Mentor voice unification (S)

Tutor panel and review insights currently speak in system voice. Reskin
both surfaces as Uncle Gam (portrait chip + his register, per the story
bible's "teaching voice belongs to ONE mentor" rule). Pure presentation;
the tutor engine stays as is.

## Why not all now

The lesson-content rewrite is a writing project (48 lessons of copy) whose
quality gates on a content pass, not engineering; the puzzle engine wants
its own correctness review against constructed states. Both are isolated
(content data + one new lib) and scheduled as P1 backlog items with the
seams already in place: seeded engine, floor data, drill slot in the lesson
shape, and the mentor character.
