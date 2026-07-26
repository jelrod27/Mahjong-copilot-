# Plan 021: Teach the game, not just the vocabulary

> **Executor instructions**: Follow this plan step by step. Run every
> verification command before moving on. If a STOP condition occurs, stop and
> report — do not improvise.
>
> **You are writing teaching content.** Prose quality matters here as much as
> correctness. Read three existing lessons end to end before writing a word,
> and match their voice.
>
> **Drift check**: `git diff --stat b6b570a..HEAD -- web/content/`

## Status

- **Priority**: P0 (with plan 020, which is DONE)
- **Effort**: L — this is real writing, not a mechanical edit
- **Risk**: LOW (additive content; no engine or gameplay change)
- **Depends on**: plan 020 (DONE — `content/scoringReference.ts` now exists)
- **Category**: correctness (content)
- **Planned at**: `feature/visual-facelift`, 2026-07-26

## Why this matters

Plan 020 made the curriculum stop teaching **wrong** numbers. It does not fix
the larger hole: **nothing in 48 lessons teaches how to actually take a turn.**

Advisor-verified greps across all of `web/content/`:

| concept | occurrences |
|---|---|
| "draw a tile" | **0** |
| "counter-clockwise" | **0** |
| "dealer rotat…" | **0** |
| "priority" | 1 — and it is about *tile* priority, not claim priority |
| "chow … left" | 1 |

A player can complete every lesson and still not know: that they hold 13 tiles
and draw to 14, that play passes counter-clockwise, that a claim jumps the
queue and skips players, that chow can only be taken from the player on their
left, that priority is win > kong > pung > chow, or that East stays dealer on a
win. All of that is implemented in `web/engine/claiming.ts` and
`web/engine/turnManager.ts` and the player meets all of it in their first hand.

**`/learn` also lies about this.** `web/app/(main)/learn/page.tsx:12-18` renders
a path ending in **"Full Game"**. There is no such level — Level 6 is "Strategy
& Gameplay". The page promises a destination that does not exist.

## What to build

**A new Level 7, "Playing a Hand"**, inserted as the practical bridge between
the curriculum and the table. Eight lessons, matching the existing per-level
count.

Do NOT retrofit this into Levels 1–6. Those teach *what things are*; this
teaches *how a hand runs*. Keeping it separate also means the existing
lesson-completion and unlock logic keeps working unchanged.

### The eight lessons

1. **The Shape of a Turn** — you hold 13, draw to 14, discard back to 13. Play
   passes counter-clockwise. What "your turn" actually means.
2. **The Wall and the Deal** — where tiles come from, why the wall runs out,
   what a draw (exhaustive draw) is and what happens then.
3. **Claiming a Discard** — any discard can be claimed. What claiming costs
   you (your hand becomes exposed) and what it buys.
4. **Chow Comes From the Left** — the rule players most often get wrong. Chow
   is only legal from the player immediately upstream. Pung and kong are legal
   from anyone.
5. **Who Wins the Tile** — claim priority: win > kong > pung > chow, and the
   turn-order tie-break when two players want the same tile at the same
   priority. This is `web/engine/claiming.ts:52-58` and `:185-200` — read them.
6. **Claims Skip Players** — the consequence nobody explains: a claim jumps the
   queue, so players between the discarder and the claimant lose their turn.
7. **Dealer, Seat Winds and Rounds** — East deals, East stays dealer on a win,
   seats rotate otherwise; what the prevailing wind is and why your seat wind
   scores.
8. **A Hand From Start to Finish** — a worked example. Deal → several turns →
   a claim → a win, narrated with the reasoning at each decision.

### Rules for the writing

- **Every rule you state must be checked against the engine.** `turnManager.ts`
  and `claiming.ts` are the authority. If the engine disagrees with what you
  were going to write, the engine wins — and say so in your report.
- **Use tiles.** 20 of 48 existing lessons pass a `tiles` array and Level 6
  passes none, which is why it reads as a wall of text. Lessons 4, 5 and 8 in
  particular should show real tiles.
- **No new mechanics.** Do not invent rules the game does not implement. If you
  cannot find something in the engine, leave it out.
- **Match the existing voice** — short lines, occasional ALL-CAPS headers,
  second person. Read `level2.ts` lesson "2-1" as the model.

## Current state

`web/content/level1.ts` defines `Lesson`, `QuizQuestion` and `Level`; every
other level imports those types from it. `web/content/index.ts` exports
`AllLevels = [Level1, ..., Level6]`.

A level looks like:

```ts
export const Level2: Level = {
  id: 2,
  title: "Sets & Basic Hands",
  description: "...",
  recommendedAction: "...",
  unlockRequirement: "Complete Level 1",
  lessons: [ { id: "2-1", title: "...", subtitle: "...", content: [...] }, ... ],
};
```

Note `keyTakeaways` and `nextLessonId` exist **only in level1.ts**. The lesson
player renders a "YOU LEARNED" recap and a "Next:" button only when those are
present, so from Level 2 on the completion experience silently degrades.
**Include both fields on every Level 7 lesson** — the newest level should not
inherit that rot.

## Commands you will need

From the repo's `web/` directory:

| Purpose   | Command                                     | Expected |
|-----------|---------------------------------------------|----------|
| Typecheck | `npm run typecheck`                         | exit 0   |
| Lint      | `npm run lint`                              | exit 0   |
| Unit test | `npm test`                                  | all pass, report the count |
| Targeted  | `npx vitest run content/__tests__`          | all pass |
| Build     | `npm run build`                             | succeeds |

## Scope

**In scope**:
- `web/content/level7.ts` — new
- `web/content/index.ts` — register Level 7
- `web/app/(main)/learn/page.tsx` — fix the `PATH_STEPS` lie
- `web/content/__tests__/` — a test for the new level

**Out of scope** (do NOT touch):
- **`web/engine/**`** — read it, never edit it. If a rule looks wrong, STOP.
- Levels 1–6 content. Plan 020 just corrected those; leave them alone.
- The lesson player component, unlock logic, or progress tracking.
- Any visual/layout work.

## Git workflow

- Branch: `feature/gameplay-curriculum`
- Conventional commits, e.g. `feat(content): add Level 7 — playing a hand`
- Do NOT push or open a PR.

## Steps

### Step 1: Read the engine, and write down the rules

Read `web/engine/turnManager.ts` and `web/engine/claiming.ts`. Produce, in your
report, the actual rules for: turn order, the draw/discard cycle, which claims
are legal from which seats, claim priority and its tie-break, what happens to
skipped players, dealer retention, and seat/prevailing wind assignment.

**This is your source of truth for every lesson.** Anything you cannot find in
the engine does not go in the curriculum.

### Step 2: Read three existing lessons

Read `level2.ts` lesson 2-1, `level4.ts` lesson 4-1, and `level6.ts` lesson 6-1
end to end. Note line length, tone, how `content[]` arrays are broken up, how
quizzes are phrased.

### Step 3: Write Level 7

Create `web/content/level7.ts` following the shape above. Eight lessons, each
with `keyTakeaways` and `nextLessonId`. `unlockRequirement: "Complete Level 6"`.

Quizzes: one per lesson minimum, testing understanding rather than recall.
"Which player can you chow from?" is a good question; "what does chow mean?" is
Level 2's job.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Register it

Add Level 7 to `web/content/index.ts` (`AllLevels` and the re-export).

**Verify**: `npm run build` succeeds and `/learn` renders seven levels.

### Step 5: Stop `/learn` promising a level that doesn't exist

`web/app/(main)/learn/page.tsx:12-18` hardcodes `PATH_STEPS` ending in
"Full Game". There is a comment directly above it claiming the list is "pulled
from level data… so this stays in sync if levels are renamed" — which is false;
it is a hardcoded literal.

Derive it from `AllLevels` so it cannot drift again, or if the labels need to
stay terse, add a short `pathLabel` to each level and map over that. Either
way the comment must stop being a lie.

**Verify**: `/learn` shows a path whose last step matches the real last level.

### Step 6: Test it

Add `web/content/__tests__/level7.test.ts` asserting:
- eight lessons, ids `7-1` … `7-8`
- every lesson has non-empty `content`, `keyTakeaways`, and a quiz
- every `nextLessonId` points at a lesson that exists (the last may be null)
- Level 7 is present in `AllLevels`

Match the conventions in existing `content/__tests__` files. One behaviour per
test; split anything whose name would contain "and".

**Verify**: `npx vitest run content/__tests__` → all pass.

### Step 7: Read it back as a beginner

Start your own dev server (`cd web && npx next dev -p 3230`; do NOT use
`preview_start({name})`, it serves the main repo). Confirm
`window.location.href` before each check.

Walk all eight lessons in the browser. Report honestly:
- Does lesson 1 make sense to someone who has never played?
- Do the tiles render where you used them?
- Is any lesson noticeably weaker than the others?

## Test plan

- **New**: `content/__tests__/level7.test.ts` (Step 6).
- **Existing**: `npm test` must stay green. The drift test from plan 020 covers
  scoring; if any Level 7 lesson states a scoring number, it must come from
  `content/scoringReference.ts`, not a literal.
- No snapshot tests on prose.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` passes; report the observed count
- [ ] `npm run build` succeeds
- [ ] Level 7 exists with 8 lessons, each with `keyTakeaways` and `nextLessonId`
- [ ] `/learn` renders 7 levels and the path no longer promises a missing one
- [ ] The engine rules table from Step 1 is in your report
- [ ] `git diff --name-only` shows nothing under `web/engine/`

## STOP conditions

- The engine contradicts a rule you were about to teach — report it, do not
  edit the engine and do not teach the wrong thing.
- `PATH_STEPS` cannot be derived without touching unlock logic.
- Any existing test fails.

## Maintenance notes

- **What a reviewer should scrutinise**: lessons 4, 5 and 6 (chow-from-left,
  priority, skipped players). These are the rules players get wrong, and the
  ones most likely to be written from general mahjong knowledge rather than
  from this engine.
- **Related**: plan 020 fixed scoring correctness; this fixes gameplay coverage.
  Together they are the "the curriculum tells the truth" pair.
