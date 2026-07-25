# Plan 014: Fix pacing — stop making "easy" mean "slow", and let the player set game speed

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/components/game/useGameController.ts web/app/play/game/GameContent.tsx web/store/reducers/settingsReducer.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction (game feel)
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

AI "thinking" time in this app is pure `setTimeout` — no computation happens
during it. The delays are:

| Difficulty | draw | discard | per AI turn | per lap (3 opponents) |
|-----------|------|---------|-------------|----------------------|
| easy      | 1500ms | 2000ms | **3.5s**    | **10.5s**            |
| medium    | 1000ms | 1200ms | 2.2s        | 6.6s                 |
| hard      | 600ms  | 800ms  | 1.4s        | 4.2s                 |

A Hong Kong hand runs roughly 16–18 laps. On **easy — which is the default and
which the training table forces** — that is around **3.5 minutes of watching
per hand**, and roughly 14 minutes for a 4-hand quick match, most of it staring
at a static board.

Two things are wrong here. First, the numbers are simply too slow at the low
end. Second, and more importantly, **difficulty is secretly doubling as a speed
control**: a beginner who correctly picks "Easy" is punished with the slowest
possible game, and a player who wants a fast game is forced to also fight
smarter opponents. These are orthogonal preferences and should be separate
controls.

Competitive signal supports this: reviews of Hong Kong Mahjong Club (4.09★ from
~34k ratings) single out that "the bots move quickly so you don't have to wait
long between your turns" as a headline strength, while Mahjong Soul is
criticised by a competitive player for moment-to-moment gameplay being
"slower than I'm used to."

## Current state

### The delay table — `web/components/game/useGameController.ts:32-37`

```ts
// Difficulty-based delays (ms) [DRAW, DISCARD]
const DELAYS = {
  easy: { draw: 1500, discard: 2000, claim: 800 },
  medium: { draw: 1000, discard: 1200, claim: 500 },
  hard: { draw: 600, discard: 800, claim: 400 },
};
```

Note: the `claim` values in this table are **dead** — the controller hardcodes
`claimDelayMs: 150` at `web/components/game/useGameController.ts:725`. Verify
this before relying on it: `grep -n "claimDelayMs" web/components/game/useGameController.ts`.

### The defaults — `web/app/play/game/GameContent.tsx`

Line 38: an absent or unrecognised `?difficulty` param falls back to `'easy'`.
Line 56: `const effectiveDifficulty = isTrainingTable ? 'easy' : difficulty;` —
the beginner table is pinned to easy, and therefore to the slowest pacing.

### Animation floor (do not go below this)

Animations that must complete before the next action starts:
- discard flight arc: 420ms (`web/components/game/TileFlightLayer.tsx:107`)
- discard-pool arrival: 300ms (`web/components/game/DiscardPool.tsx:43`)

So an AI turn must stay at or above roughly **flight + arrival + ~200ms
breathing room ≈ 900ms** or tiles will visibly collide with the next move.

### Settings conventions

Settings live in Redux — `web/store/reducers/settingsReducer.ts`, with actions
in `web/store/actions/settingsActions.ts` and persistence via
`web/lib/settingsStorage.ts`. The settings UI is
`web/app/(main)/settings/SettingsPageClient.tsx`. **Read one existing
boolean/enum setting end-to-end before adding yours** and match it exactly —
including how it is persisted and rehydrated by
`web/components/settings/SettingsInitializer.tsx`.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                          | Expected |
|-----------|--------------------------------------------------|----------|
| Typecheck | `npm run typecheck`                              | exit 0   |
| Lint      | `npm run lint`                                   | exit 0   |
| Unit test | `npm test`                                       | all pass |
| Targeted  | `npx vitest run store/reducers/__tests__/settingsReducer.test.ts` | all pass |

## Scope

**In scope**:
- `web/components/game/useGameController.ts`
- `web/store/reducers/settingsReducer.ts`
- `web/store/actions/settingsActions.ts`
- `web/lib/settingsStorage.ts`
- `web/app/(main)/settings/SettingsPageClient.tsx`
- `web/app/play/game/GameContent.tsx`
- `web/store/reducers/__tests__/settingsReducer.test.ts` (add cases)

**Out of scope** (do NOT touch):
- `web/engine/ai/**` — AI *strength* is not changing. Only pacing.
- Animation durations in `TileFlightLayer.tsx` / `DiscardPool.tsx`. Speeding
  up the AI while leaving animations alone is deliberate; retuning both at once
  makes it impossible to attribute any resulting jank.
- `CLAIM_TIMEOUT_STANDARD` / `CLAIM_TIMEOUT_TRAINING` — the human's claim
  window is a separate concern (plan 013).

## Git workflow

- Branch: `feature/game-speed-setting`
- Conventional commits, e.g. `feat(play): separate game speed from AI difficulty`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Retune the base delays

Replace the `DELAYS` table with the values below.

**On the animation floor**: the constraint is not that each tier's `discard`
value alone must clear the animation budget — it is that the *interval between
two consecutive discards* must. That interval is
`claim window (150ms) + next player's draw delay + next player's discard delay`,
and the discard leg is floor-clamped by `MIN_DISCARD_DELAY_MS` (Step 3). At the
tightest combination (hard AI, `fast` speed) that is 150 + 260 + 800 = 1210ms
against a 420ms flight + 300ms arrival = 720ms animation — comfortable margin.
So `hard.discard: 550` is fine even though 550 < 720: the clamp and the
preceding legs carry it. Verified by measurement in Step 6 (no collisions
observed at any speed).

```ts
// Base AI delays (ms). These are pacing only — AI strength lives in engine/ai.
// Floor: an AI turn must exceed the 420ms flight + 300ms pool-arrival
// animations, or tiles collide with the next action.
const DELAYS = {
  easy:   { draw: 700, discard: 900 },
  medium: { draw: 500, discard: 700 },
  hard:   { draw: 400, discard: 550 },
};
```

Delete the dead `claim` values from this table. Before deleting, confirm they
are genuinely unread:

```bash
grep -n "DELAYS\[" web/components/game/useGameController.ts
grep -n "\.claim" web/components/game/useGameController.ts
```

If anything reads `DELAYS[...].claim`, that is a STOP condition.

This alone takes easy from 10.5s/lap to ~4.8s/lap.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Add a `gameSpeed` setting

Add a `gameSpeed` setting with values `'relaxed' | 'normal' | 'fast'`,
defaulting to `'normal'`.

Wire it through, matching the existing pattern of a comparable setting exactly:
- the slice's initial state and reducer case in `settingsReducer.ts`
- the action creator in `settingsActions.ts`
- persistence + rehydration in `settingsStorage.ts`

**Verify**: `npx vitest run store/reducers/__tests__/settingsReducer.test.ts`
→ passes.

### Step 3: Apply the speed multiplier

In `useGameController.ts`, apply a multiplier to the base delays:

```ts
const SPEED_MULTIPLIER = { relaxed: 1.6, normal: 1, fast: 0.65 } as const;
```

Multiply both `draw` and `discard` by the active multiplier when scheduling AI
turns. Clamp the result so `discard` never falls below 800ms regardless of
tier and multiplier — `fast` + `hard` would otherwise reach 358ms and collide
with the 420ms flight animation.

Read `gameSpeed` from the Redux settings store via the existing typed hooks in
`web/store/hooks.ts`.

**Verify**: `npm run typecheck && npm run lint` → both exit 0.

### Step 4: Surface it in Settings

Add a "Game speed" control to `SettingsPageClient.tsx` with the three options,
placed near the other gameplay settings. Match the surrounding markup, the
`ds-*` component classes, and the label/description pattern of adjacent
settings exactly — do not invent a new control style.

Copy for the descriptions:
- Relaxed — "More time to read the table between moves."
- Normal — "Balanced pacing."
- Fast — "Minimal waiting. Best once you know the flow."

**Verify**: `npm run lint` → exit 0.

### Step 5: Stop the training table forcing easy pacing

In `web/app/play/game/GameContent.tsx:56`, the training table pins
`effectiveDifficulty` to `'easy'`.

Keep that — beginners *should* face easy opponents. But since Step 3 makes
speed independent, the training table no longer inherits slow pacing as a side
effect. Verify no other code path couples the training table to a speed value:

```bash
grep -n "isTrainingTable" web/app/play/game/GameContent.tsx
```

If the training table sets a speed anywhere, remove that coupling.

**Verify**: `npm run typecheck` → exit 0.

### Step 6: Time a real hand

`npm run dev`, then play one full hand on each of `normal` and `fast` at
`http://localhost:3000/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`.

Check by eye and by stopwatch:
- No tile visibly collides with or overlaps the next action's animation.
- A lap of three AI turns on `normal` completes in roughly 5 seconds.
- The game feels responsive rather than sluggish.

If tiles collide at any tier, raise the clamp in Step 3 rather than reducing
animation durations.

## Test plan

- **New tests** in `store/reducers/__tests__/settingsReducer.test.ts`, modelled
  on the existing cases in that file, one behaviour each:
  1. `gameSpeed` defaults to `'normal'`.
  2. the set-speed action updates `gameSpeed`.
- **Existing coverage to watch**: `engine/__tests__/fullGameSimulation.test.ts`
  and `components/game/__tests__/useGameController.flow.test.tsx` exercise the
  turn chain with fake timers. If either fails, the delay change has altered
  assumed timing — report rather than editing the tests to match.
- **Verify**: `npm test` → all pass.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0; 2 new settings tests pass
- [ ] `grep -n "claim:" web/components/game/useGameController.ts` shows the dead
      `claim` values removed from `DELAYS`
- [ ] Game speed control is visible on the Settings page
- [ ] Browser check from Step 6: no animation collisions at any tier
- [ ] No files under `web/engine/ai/` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Anything reads `DELAYS[...].claim` (the values are not dead after all).
- `fullGameSimulation.test.ts` or `useGameController.flow.test.tsx` fails after
  the delay change. Do not edit those tests to accommodate new timings.
- Tiles visibly collide even after applying the 800ms clamp.
- The settings slice turns out not to be the right home for `gameSpeed` —
  e.g. if per-match settings are stored elsewhere in `matchStorage.ts`.

## Maintenance notes

- **What interacts with this**: any future change to animation durations must
  be re-checked against the 800ms clamp. The clamp and the flight duration are
  coupled; a comment at each site should say so.
- **What a reviewer should scrutinise**: that AI *strength* is untouched — the
  diff should contain no changes under `web/engine/ai/`.
- **Deliberately deferred**: an "auto-pass when nothing is claimable" option and
  an explicit skip/fast-forward control. Both are real wins for repeat players
  and both are additive on top of this setting; neither belongs in the same
  change as the base retune.
