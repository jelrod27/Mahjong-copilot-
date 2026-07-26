# Plan 023: Extract the shared primitives that don't exist

> **Executor instructions**: Follow step by step. Run every verification
> command. If a STOP condition occurs, stop and report — do not improvise.
>
> **This is a refactor, not a redesign.** Every screen must look identical
> afterwards. If something would look better a different way, that is a
> different plan.
>
> **Drift check**: `git diff --stat b6b570a..HEAD -- web/components/ web/app/`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — touches many pages, all presentational
- **Depends on**: plan 022 (Tailwind v4 — DONE and merged)
- **Category**: tech debt
- **Planned at**: `feature/visual-facelift`, 2026-07-26

## Why this matters

The DX audit found there is no shared component layer. `components/ui/` exists
but is mostly consumed by `sidebar.tsx` rather than by the app, and the pages
hand-roll everything. Advisor-verified counts at audit time:

| pattern | duplication |
|---|---|
| page-header hero | **byte-identical on 5 pages**, plus 2 hand-rolled variants |
| progress bar | **9 implementations**, 3 different heights, 2 different transition durations |
| card shell | `ds-card` (41) + `ds-panel` (25) + `ui/Card` (2) — three systems |
| small-caps eyebrow | `font-display text-[10px]` ×48, `text-[9px]` ×16 |
| modal overlay | 4 implementations — **and no dialog anywhere handles Escape** |
| loading state | 4 near-identical blinking-ellipsis blocks |
| empty state | 3 different shapes |

The practical cost: any reskin has to be applied dozens of times instead of
once, and the copies have already drifted.

**Plan 026 deliberately left `TODO(023)` markers** rather than creating a
parallel set. Those markers are your map.

## What to build

Six primitives, in `web/components/ui/`. Ranked by call sites collapsed:

1. **`PageHeader`** — `{ eyebrow, title, description?, action? }`. Replaces the
   5 byte-identical heroes plus the 2 variants.
2. **`Meter`** — `{ value, max?, tone?, size? }`. Replaces 9 progress bars.
3. **`SectionLabel`** — the small-caps eyebrow. Note
   `components/game/GameResultsChrome.tsx` already has the correct abstraction
   (`GameResultsSectionLabel`) locked inside `game/`; **promote that** rather
   than writing a new one.
4. **`EmptyState`** — `{ icon?, title, body?, action? }`.
5. **`LoadingState`** — `{ label? }`.
6. **`Modal`** — wrapping Base-UI `Dialog`, which is already a dependency and
   already proven in `components/game/GlossaryModal.tsx`. This fixes Escape and
   focus-trapping everywhere in one move.

**Not in this plan**: a unified `Card`. Three card systems is real debt, but
collapsing 68 call sites is its own change with its own risk. Note it and move
on.

## Rules

- **Zero visual change.** Each primitive must reproduce what it replaces
  exactly. Where copies have drifted (progress-bar heights, transition
  durations), pick the most common variant, use it everywhere, and **list every
  deviation you normalised** in your report so a reviewer can spot-check.
- **Migrate call sites in this plan.** A primitive nobody imports is worse than
  none — that is exactly how `ui/progress.tsx` ended up with zero importers.
- **Do not touch `components/game/`** except to promote `GameResultsSectionLabel`.
  The board was verified this round; leave it alone.
- **Match v4 conventions** — the codebase is now Tailwind v4 with tokens in the
  `@theme` block of `globals.css`. There is no `tailwind.config.ts`.

## Commands you will need

From the repo's `web/` directory:

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Unit test | `npm test` | all pass, report count |
| Build | `npm run build` | succeeds |
| E2E | `npm run test:e2e` | all pass |

## Scope

**In scope**:
- `web/components/ui/` — the six new primitives
- `web/app/(main)/**/page.tsx` and their client components — call-site migration
- `web/components/game/GameResultsChrome.tsx` — **only** to re-export the
  promoted `SectionLabel`
- `web/components/ui/__tests__/` — tests for the new primitives

**Out of scope** (do NOT touch):
- `web/engine/**`
- `web/components/game/**` beyond the one re-export
- `web/content/**`
- `web/app/globals.css` token values
- A unified `Card` — explicitly deferred
- `web/app/(main)/page.tsx`'s **hero** — plan 026 built it deliberately;
  migrate only its non-hero sections, and only where a `TODO(023)` marker sits

## Git workflow

- Branch: `feature/shared-primitives`
- Conventional commits; **one commit per primitive** (`refactor(ui): extract
  PageHeader`), so a reviewer can bisect a visual regression to one primitive
- Do NOT push or open a PR

## Steps

### Step 1: Capture a baseline

Start your own dev server (`cd web && npx next dev -p 3240`; do NOT use
`preview_start({name})`, it serves the main repo). Confirm
`window.location.href` before each capture.

Screenshot at **1280×800** and **375×812**: `/`, `/learn`, `/learn/1`,
`/practice`, `/reference`, `/progress`, `/parlour`, `/settings`, `/cosmetics`.

**You cannot prove zero visual change without this. Do it first.**

### Step 2: Find the duplication yourself

Do not trust the audit's counts — they are a starting point and one of them was
already wrong once this round. Verify:

```bash
grep -rn "bg-gradient-to-b from-surface to-background" web/app | wc -l
grep -rn 'font-display text-\[10px\]' web/app web/components | wc -l
grep -rn "TODO(023)" web/app web/components
```

Report what you actually found versus what the table above claims.

### Step 3: Extract, one primitive at a time

For each: write it, migrate **all** its call sites, verify, commit. Then the
next. Do not write all six then migrate — a single commit touching 60 files is
unreviewable and unbisectable.

Order (safest first): `SectionLabel` → `LoadingState` → `EmptyState` →
`Meter` → `PageHeader` → `Modal`.

`Modal` is last and highest-risk: it changes focus behaviour and adds Escape
handling where there was none. Verify keyboard behaviour by hand — open each
dialog, press Escape, confirm focus returns to the trigger.

**Verify after each**: `npm run typecheck` → exit 0, `npm test` → green.

### Step 4: Test the primitives

Add `web/components/ui/__tests__/` covering rendered behaviour, not markup
shape:
- `Meter` clamps out-of-range values and renders the right fill
- `EmptyState` renders its action only when given one
- `Modal` closes on Escape and traps focus
- `SectionLabel` and `LoadingState` render their content

Repo conventions: one behaviour per test, descriptive names, split anything
whose name would contain "and".

**Verify**: `npm test` → all pass, report the count.

### Step 5: Prove zero visual change

Retake all 18 screenshots and compare against Step 1.

**Any difference is a STOP condition** unless it is a deviation you deliberately
normalised in Step 3 — in which case name it explicitly and show before/after.

Also confirm no page lost its `<main>` landmark (plan 017 fixed those; this
plan must not undo it):
```js
document.querySelectorAll('main').length  // must be exactly 1 per page
```

### Step 6: Full verification

```
npm run typecheck && npm run lint && npm test && npm run build
npm run test:e2e
```

Report observed counts, not expected ones.

## Test plan

- **New**: `components/ui/__tests__/` per Step 4.
- **Existing**: everything must stay green **unchanged**. If an existing test
  fails, that means you changed rendered output — a STOP condition, not a test
  to edit.
- The e2e suite is the real safety net here; run all of it, not a subset.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` passes, count reported, **no existing test modified**
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` passes
- [ ] Six primitives exist and **every** call site is migrated
- [ ] `grep -rn "TODO(023)"` returns nothing
- [ ] 18 screenshots compared; every deviation named
- [ ] Every page still has exactly one `<main>`
- [ ] One commit per primitive

## STOP conditions

- A screen changes appearance in a way you did not deliberately normalise.
- An existing unit or e2e test fails.
- A page loses or gains a `<main>` landmark.
- `Modal` cannot preserve an existing dialog's behaviour — report which and
  leave that one unmigrated rather than changing how it works.

## Maintenance notes

- **What a reviewer should scrutinise**: the normalisation list from Step 3.
  "Zero visual change" and "I picked the most common of three heights" cannot
  both be fully true; the list is where the honesty lives.
- **Deliberately deferred**: the unified `Card` (68 sites, own risk profile),
  and `bg-sidebar` still not resolving (documented in `globals.css` — wiring it
  would reintroduce the chrome-green plan 025 removed).
- **This unblocks**: reskinning `/learn`, `/practice`, `/reference`, which
  currently keep their pre-facelift layouts.
