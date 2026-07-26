# Plan 020: Make the curriculum tell the truth about scoring

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **This plan changes teaching content, not game behaviour.** The engine is
> correct. The lessons are wrong. Do not "fix" the engine to match a lesson.
>
> **Drift check (run first)**: `git diff --stat b6b570a..HEAD -- web/engine/scoring.ts web/content/`

## Status

- **Priority**: **P0** — the highest-value item on the round-3 roadmap.
- **Effort**: M
- **Risk**: LOW (content + a derived table; no gameplay change)
- **Depends on**: none
- **Category**: correctness (content)
- **Planned at**: commit `b6b570a`, 2026-07-25

## Why this matters

The product's core promise is "learn real Hong Kong mahjong." It currently
teaches scoring numbers the engine will never produce. A player who completes
the curriculum and scores 10/10 on the Scoring Quiz has memorised values they
cannot reproduce in a real hand.

Wrong instruction is worse than none: it costs the trust a learning product
runs on, and the player will blame the game before they blame the lesson.

### The verified contradictions

All four confirmed by the advisor by reading both sides.

**1. Payment distribution — `content/level4.ts:253-266` vs `engine/scoring.ts:288-300`**

The lesson teaches:
> "WIN BY DISCARD: … only that ONE player pays you the full amount. The other
> two players pay nothing." / "WIN BY SELF-DRAW: … ALL THREE other players pay
> you. Each pays the full calculated amount." / "self-drawn wins are worth 3x"

The engine implements:
```ts
if (isSelfDrawn) {
  // every opponent pays 2× base            → 6× base total
} else if (discarderIndex !== undefined) {
  const amount = i === discarderIndex ? base * 2 : base;   // → 4× base total
}
```
So a discard win collects **4×** base (taught: 1×) and a self-draw **6×**
(taught: 3×). Even the *ratio* is wrong: the real self-draw premium is 1.5×,
not 3×.

**2. The limit cap — `content/level4.ts:34,36` vs `engine/scoring.ts:13-16`**

Two lines apart, the lesson says:
> `:34` "A 7-fan hand is worth 1,024 points!"
> `:36` "There's a cap at 10 fan … worth **256 points maximum**."

256 < 1,024, so the lesson contradicts itself. The engine caps at
`MAX_PAYMENT = 8 × 2^10 = ` **8192**. Lesson 4-6 (`:276-279`) then notices its
own inconsistency and ships the confusion to the reader.

**3. Flowers — `content/level4.ts:326` vs `engine/scoring.ts` flower block**

Lesson: `"• Flower tiles: +1 fan per flower"`.
Engine: a flower scores 1 fan **only when it matches your seat**; all four
flowers or all four seasons is 2 fan; holding none is 1 fan.

The lesson gets "No flowers: +1 fan" (`:321`) right and the per-flower rule
wrong. The quiz at `:342-345` computes its answer from the wrong rule.

**4. The 3-faan minimum is enforced and never taught**

`engine/types.ts` `DEFAULT_MIN_FAAN = 3`; `engine/turnManager.ts` refuses a win
below it; `ActionBar.tsx` renders "This table needs 3+ to win". The curriculum's
only mention is the opposite: `level4.ts:29` calls a 0-fan chicken hand "the
minimum", and the quiz drills it.

### Reported but NOT advisor-verified — verify before changing

The content audit also flagged these. **Confirm each against the engine
yourself before editing**, and report what you find:

- **All Chows** taught with Japanese Pinfu restrictions (`level3.ts:111-115`:
  no honour pair, must be open, must be completed on a discard). Engine is
  believed to score All Chows at 1 fan whenever four melds are chows, with no
  such conditions.
- **Riichi** used as the trigger for defensive play in `level6.ts` (lessons 6-4
  and 6-5, roughly lines 159, 181-182, 204, 220-221). Riichi does not exist in
  HK mahjong and appears nowhere in `web/engine/`. `content/__tests__/glossary.test.ts`
  reportedly asserts `findGlossaryEntry('Riichi')` returns null.
- **All Pungs** priced inconsistently between `level3.ts:224-226` ("2-3 doubles")
  and `level4.ts` (flat 3 fan).

## The approach: derive, don't re-copy

The repo already contains the right pattern. `web/content/glossary.ts` is a
single source of truth consumed by both the teaching surface and the live game
(via `GlossaryTerm` in `GameBoard`/`GameHUD`). Scoring should work the same way.

Today the same numbers are hand-copied into five places that have drifted:
`content/level4.ts`, `content/level5.ts`, `app/(main)/reference/page.tsx`,
`app/(main)/practice/ScoringQuiz.tsx`, and `engine/scoring.ts`.

**Create one exported table, derived from or asserted against the engine, and
have the content surfaces read it.** That turns "48 lessons are wrong" into
"one table is right and everything reads it."

This plan does **not** require rewriting all 48 lessons. It requires:
1. one canonical scoring reference,
2. the four verified contradictions corrected,
3. a test that fails if content and engine ever drift again.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                        | Expected |
|-----------|------------------------------------------------|----------|
| Typecheck | `npm run typecheck`                            | exit 0   |
| Lint      | `npm run lint`                                 | exit 0   |
| Unit test | `npm test`                                     | all pass |
| Targeted  | `npx vitest run content/__tests__`             | all pass |
| Engine    | `npx vitest run engine/__tests__/scoring.test.ts` | all pass |

## Scope

**In scope**:
- `web/content/scoringReference.ts` — **new**, the canonical table
- `web/content/level3.ts`, `level4.ts`, `level5.ts`, `level6.ts` — corrections only
- `web/app/(main)/reference/page.tsx` — read from the new table
- `web/app/(main)/practice/ScoringQuiz.tsx` — fix answers computed from wrong rules
- `web/content/__tests__/` — new drift test

**Out of scope** (do NOT touch):
- **`web/engine/**` — the engine is correct. This is the single most important
  boundary in this plan.** If you believe the engine is wrong, that is a STOP
  condition, not an edit.
- Lesson *structure*, ordering, or the lesson player. Content values only.
- The missing gameplay curriculum (no lesson teaches taking a turn) — that is
  plan 021, deliberately separate.
- Any visual/layout work.

## Git workflow

- Branch: `feature/scoring-truthfulness`
- Conventional commits, e.g. `fix(content): correct payment rules to match the engine`
- Do NOT push or open a PR.

## Steps

### Step 1: Read the engine and write down the truth

Read `web/engine/scoring.ts` end to end. Produce, in your report, a table of:
- every fan source, its value, and its condition
- the payment formula for self-draw and discard wins
- the limit threshold and the capped payment
- the flower rules

This is the reference for everything below. **If anything in the engine looks
wrong to you, report it — do not change it.**

**Verify**: `npx vitest run engine/__tests__/scoring.test.ts` → passes (this
tells you the engine's behaviour is pinned and you can trust it).

### Step 2: Create the canonical table

Create `web/content/scoringReference.ts` exporting typed data for the fan table
(name, fan value, short description), the limit-hand list, and the payment
rules. Match the shape and export conventions of `web/content/glossary.ts` —
read it first.

Values must come from your Step 1 reading of the engine.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add the drift test — do this BEFORE fixing the lessons

Create `web/content/__tests__/scoringReference.test.ts` asserting the table
agrees with the engine. At minimum:

- `calculateScore` on a constructed 0-fan hand returns the table's base points
- the limit threshold and capped payment match `scoring.ts`
- a discard win produces 4× base across three payers (2×/1×/1×)
- a self-draw produces 6× base (2×/2×/2×)
- a non-seat flower scores 0 fan; a seat-matching flower scores 1

Build hands with the existing helpers in `web/engine/__tests__/testHelpers.ts`.

**This test is the deliverable that stops this recurring.** Write it so it fails
loudly if someone edits the table to disagree with the engine.

**Verify**: `npx vitest run content/__tests__/scoringReference.test.ts` → passes.

### Step 4: Fix the four verified contradictions

In `content/level4.ts`:
- **Payments** (`:253-266`): rewrite to the real rules. Discard win — the
  discarder pays double, the other two pay single. Self-draw — everyone pays
  double. State the totals (4× and 6×) explicitly, since that is what a player
  experiences.
- **Limit cap** (`:34,36` and `:276-279`): one consistent number, 8192 at 10
  fan. Remove the "wait, the cap kicks in at 5 fan" passage entirely — it
  documents a bug that no longer exists.
- **Flowers** (`:326`): a flower scores only when it matches your seat; four
  flowers or four seasons is 2 fan; no bonus tiles at all is 1 fan.
- **3-faan minimum**: add it where chicken hands are discussed (`:29`). A
  0-fan hand cannot be declared at a 3-faan table. This is the rule that most
  confuses new players in actual play.

Then fix `ScoringQuiz.tsx` — any question whose answer was computed from a
corrected rule (the audit flagged the flower questions specifically) must be
recomputed, not just re-labelled.

**Verify**: `npx vitest run content/__tests__` → passes; `npm test` → passes.

### Step 5: Investigate and fix the three unverified items

For each of All Chows, Riichi, and All Pungs (listed above): check the engine,
report what you found, and correct the content only where the engine disagrees.

For **Riichi** specifically: if confirmed absent from the engine, the defensive
lessons need a replacement trigger. The engine exposes real danger data —
`tileDangerScore` and `isSafeTile` in `web/engine/ai/aiUtils.ts`, already used
by the tutor. Rewrite the fold/push guidance around observable signals (a player
with three exposed melds, a player discarding only honours late, the wall
running low) rather than a declaration that will never happen.

If rewriting those two lessons is larger than it looks, **STOP and report**
rather than half-doing it — a partly-Riichi lesson is worse than the current
one.

### Step 6: Point Reference at the table

`app/(main)/reference/page.tsx` has its own hand-copied `FAN_TABLE` and
limit-hand list. Replace them with imports from `content/scoringReference.ts`.

The audit reports Reference is missing Small Three Dragons, Robbing the Kong,
Kong Replacement and Last Tile — all scored by the engine. If your Step 1 table
includes them, they appear here automatically. Confirm they render.

**Verify**: `npm test` → passes; load `/reference` and confirm the Scoring tab
still renders correctly.

### Step 7: Sweep for remaining drift

```bash
grep -rn "fan\b" web/content/*.ts | grep -iE "[0-9]+ ?(fan|points)" | head -40
```

Read the hits. Anything stating a number that contradicts your Step 1 table gets
fixed or reported. You are not required to catch every instance — you are
required to report what you found and did not fix.

## Test plan

- **New**: `web/content/__tests__/scoringReference.test.ts` (Step 3) — the
  anti-drift guard. This is the most important artefact of the plan.
- **Existing**: `npm test` must stay green (610 tests). If an existing test
  encodes a wrong rule, that is a finding — report it, and fix the test only
  when you can show the engine disagrees with it.
- **No snapshot tests** on lesson prose; they pin wording and break on every
  copy edit.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0, no newly failing tests
- [ ] `web/content/scoringReference.ts` exists and is imported by both
      `reference/page.tsx` and the corrected lessons
- [ ] The drift test exists and genuinely fails when the table is edited to
      disagree with the engine — **prove this by temporarily breaking it and
      reporting the failure**, then restoring
- [ ] All four verified contradictions corrected
- [ ] The three unverified items investigated, with findings reported
- [ ] `git diff --name-only` shows nothing under `web/engine/`

## STOP conditions

- You conclude the engine is wrong about a rule. Report it with evidence; do
  not edit the engine.
- The Riichi rewrite (Step 5) turns out to need more than the two lessons.
- An existing test fails and you cannot show the engine disagrees with it.
- `content/glossary.ts` turns out to contain scoring numbers too — report it,
  since that widens the drift surface beyond this plan's scope.

## Maintenance notes

- **What a reviewer should scrutinise**: the drift test. If it does not actually
  fail when content and engine disagree, this plan has delivered nothing
  durable and the same problem returns in six months.
- **What this deliberately does not fix**: nothing in 48 lessons teaches how to
  take a turn — no draw/discard loop, no claim priority, no chow-from-the-left,
  no dealer rotation. That is plan 021.
- **Related**: `/learn` advertises a path ending in "Full Game"; no such level
  exists. Fix that copy in plan 021, not here.
