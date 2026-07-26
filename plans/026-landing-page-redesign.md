# Plan 026: Turn `/` from a dashboard into a landing page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> This plan has **taste judgement** in it; Step 5 asks you to look at what you
> built and say honestly whether it works.
>
> **Drift check (run first)**: `git diff --stat b6b570a..HEAD -- "web/app/(main)/page.tsx"`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — this is the product's first impression; getting it wrong is
  visible to everyone.
- **Depends on**: **plan 025 (elevation ladder)** — hard dependency. Building
  this on the current tokens ships a redesigned page that is still flat green.
- **Soft-depends on**: plan 023 (primitives). If `PageHeader`/`Card` exist,
  use them. If not, do NOT create a parallel set here — see Scope.
- **Category**: direction (product)
- **Planned at**: commit `b6b570a`, 2026-07-25

## Why this matters

`/` is a **logged-in dashboard**, not a landing page. Its first viewport is a
greeting, the wordmark, a rank pill, and two small text links, followed by
seven cards of near-identical visual weight. Someone arriving cold at
16bitmahjong.co learns nothing about what the product is or why they should
care.

**The pitch already exists** — it is just on the wrong page.
`web/app/play/page.tsx:66-68`:

> "Learn and play real HK table mahjong — not tile-matching solitaire. Solo vs
> AI with coach hints and hand review after each hand."

That is a genuinely good positioning sentence: it names the category, kills the
most likely misconception (mahjong solitaire), and lists the differentiators. It
is stranded on a secondary route.

**Hierarchy is currently inverted.** Verified: the `<h1>` at
`web/app/(main)/page.tsx:90` is `text-xl md:text-2xl` (20px on mobile), while
the Tile-of-the-Day Chinese name at `:249` is `text-2xl` (24px) — the decorative
element is larger than the page title.

## Current state

### The hero region — `web/app/(main)/page.tsx:85-128`

```tsx
{/* Header: who you are */}
<div className="relative overflow-hidden p-6 rounded-lg bg-elevated/30 border border-border/10 backdrop-blur-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
  <div className="flex justify-between items-start mb-3">
    <div>
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em] mb-1">{greeting}</p>
      <h1 className="font-display text-xl md:text-2xl text-highlight text-glow-highlight">
        16 BIT MAHJONG
      </h1>
    </div>
    <Link href="/progress" ...>LOCAL PROGRESS</Link>
  </div>
  {rank && (<div className="mb-4 inline-flex ...">{rank.name.toUpperCase()}</div>)}
  <div className="flex flex-wrap gap-2">
    <Link href="/parlour" className="... px-4 py-2.5 font-display text-xs text-highlight ...">
      {floorsLit === 0 ? 'Enter the Jade Parlour' : `Climb to ${nextFloor?.name ?? 'the top'}`}
    </Link>
    <Link href="/play" className="... px-4 py-2.5 font-display text-xs text-success ...">
      Free play
    </Link>
  </div>
</div>
```

Note both CTAs are `text-xs` and visually lighter than the cards below them.

The file is **270 lines** total and renders, in order: rank-up banner, this
header, Parlour card, Daily Hand card, "KEEP LEARNING" (Lessons + Practice),
"TILE OF THE DAY", and a footer note.

### `font-mono` is not configured

`web/app/(main)/page.tsx:89` and `:252` use `font-mono`, but
`web/tailwind.config.ts:68-72` defines only `sans`, `display`, and `heading`.
So `font-mono` falls through to Tailwind's default stack — a **third** typeface,
system-dependent, on the landing page.

## What to build

A first viewport that answers "what is this, and what do I do next" without
scrolling, at both 375px and 1280px.

**Required elements, in priority order:**

1. **The product name**, at genuine display size (`text-display` / `text-title-lg`
   from the configured scale — see Step 4).
2. **The positioning sentence**, moved from `play/page.tsx:66-68`. Reword only
   for context, keep the "not tile-matching solitaire" clause — it is the single
   most useful phrase on the page.
3. **One dominant primary CTA**, `ds-btn-accent` at large size. Its label is
   state-dependent:
   - no lessons completed and no games played → **"Start Lesson 1"**
   - lessons in progress → **"Continue: {lesson title}"**
   - a saved game exists (`hasSavedGame()` from `web/lib/matchStorage.ts`) →
     **"Resume your match"**
   - otherwise → **"Play a hand"**
4. **One secondary action**, visually lighter — the complement of whichever
   primary was chosen.
5. **One piece of hero art.** Use a real tile fan rendered with `RetroTile`.
   The tile face (`web/app/globals.css:841-893`) is the best-looking asset in
   the repo and currently appears nowhere above the fold. A mahjong product
   whose landing page shows no mahjong is a missed layup.

**Everything currently on the page moves below that fold**, in this order:
resume/continue row, Parlour, Daily Hand, Lessons + Practice, Tile of the Day.
Rank moves into the continue row or the header, not the hero.

### Constraints

- **Do not add a second nav.** The sidebar and bottom nav already exist.
- **Do not invent a marketing page.** No testimonials, no feature grid, no
  fake social proof. This is a real product page for a real small product.
- **Keep it honest.** The app is local-first with no accounts; do not imply
  otherwise. The existing "LOCAL MODE" note should survive somewhere.
- **First-run vs returning must both work.** A returning player with a saved
  match should not have to scroll past a pitch they have already accepted —
  which is why the primary CTA is state-dependent.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                  | Expected |
|-----------|------------------------------------------|----------|
| Typecheck | `npm run typecheck`                      | exit 0   |
| Lint      | `npm run lint`                           | exit 0   |
| Unit test | `npm test`                               | all pass |
| E2E       | `npm run test:e2e -- home.spec.ts`       | all pass |

## Scope

**In scope**:
- `web/app/(main)/page.tsx`
- `web/app/play/page.tsx` — **only** to remove the positioning sentence if you
  move rather than copy it. Everything else on that page stays.
- `web/tailwind.config.ts` — **only** to add a `mono` key to `fontFamily` if
  you keep any `font-mono` usage. Prefer deleting the usage.
- `web/e2e/home.spec.ts` — update assertions for the new structure.

**Out of scope** (do NOT touch):
- The token values. Plan 025 owns those; if the palette still looks wrong,
  that is a STOP condition, not something to patch here.
- `web/components/ui/*` — those have an unresolved Tailwind-version problem
  (plan 022).
- Any other page under `(main)`.
- **Do not create new shared components in this plan.** If `PageHeader`/`Card`
  primitives exist from plan 023, use them. If they do not, write the landing
  page markup locally and leave a `TODO(023)` comment where a primitive belongs.
  Creating a second parallel primitive set is the exact problem the DX audit
  flagged.

## Git workflow

- Branch: `feature/landing-page`
- Conventional commits, e.g. `feat(home): rebuild the landing page around a real hero`
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm the dependency landed

```bash
grep -n "card:" web/tailwind.config.ts
```

If `card` is still `withAlpha(30, 44, 36)`, plan 025 has not landed. **STOP** —
building on the flat palette wastes the work.

### Step 2: Build the hero

Replace `web/app/(main)/page.tsx:85-128` with the hero described above. Keep
the rank-up banner above it (it is a transient celebration and correctly sits
at the top when present).

Compute the CTA state from data already in the file — it already reads
`lessonsDone`, `floorsLit`, `nextFloor`, and `rank`. Add `hasSavedGame()` from
`web/lib/matchStorage.ts`; note the file already uses a post-mount hydration
guard for localStorage-derived state (see the existing `useEffect` pattern
around `:32-43`) — follow it, or you will get a hydration mismatch.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Reorder everything below the fold

Move the existing sections into the order given above. This is mostly moving
JSX blocks, not rewriting them.

While you are here, reduce the eyebrow noise: the page currently has six
small-caps overlines competing at similar weight. Keep at most two.

**Verify**: `npm run lint` → exit 0.

### Step 4: Use the configured type scale

`web/tailwind.config.ts:73-82` defines `2xs / caption / body / body-lg /
title-sm / title / title-lg / display` with tuned line-heights and tracking.
**It currently has zero usages in any TSX file.**

On this page, use it: `display` or `title-lg` for the product name, `body-lg`
for the pitch, `caption` for eyebrows. Do not introduce any `text-[Npx]`
arbitrary value.

Delete the two `font-mono` usages (`:89`, `:252`) or add a `mono` key to the
config. Deleting is preferred — a third typeface on the landing page is not
earning its place.

**Verify**: `grep -n "text-\[" "web/app/(main)/page.tsx"` → no matches.

### Step 5: Look at it, and be honest

**Worktree dev-server note**: `preview_start({name})` reads `.claude/launch.json`
from the MAIN REPO ROOT and serves stale code from a worktree. Start your own:
`cd web && npx next dev -p 3180`. Confirm `window.location.href` before every
screenshot — the Browser pane may be shared with other agents.

Screenshot `/` at **1280×800** and **375×812**, in three states:
1. **First run** — clear localStorage entirely
2. **Mid-progress** — some lessons done, no saved game
3. **Saved game** — start a match, leave it, return to `/`

For each, answer in your report:
- Without scrolling, does the page say what the product is?
- Is there exactly one obvious next action, and is it the right one for that
  state?
- Does anything below the fold compete with the hero for attention?
- Is the tile art legible and appealing at 375px, or is it decoration that
  crowds the CTA?

**If the answer to any of these is no, say so plainly rather than shipping it.**
A landing page that is merely different from the old one is not the goal.

### Step 6: Update the e2e spec

Read `web/e2e/home.spec.ts` first. It asserts against the current structure and
will break. Update it to assert the new contract:
- the positioning sentence is present
- exactly one element matching the primary-CTA testid exists
- the primary CTA's label reflects the state (test at least the first-run case)

Add `data-testid="home-primary-cta"` to the primary action.

**Verify**: `npm run test:e2e -- home.spec.ts` → passes.

## Test plan

- **Updated**: `web/e2e/home.spec.ts` per Step 6.
- **New e2e case**: first-run state shows "Start Lesson 1"; after seeding a
  completed lesson in localStorage, it shows a Continue label. This is the one
  piece of real logic in the plan and it is worth pinning.
- **No new unit tests** — this is presentational; asserting JSX structure in
  jsdom would pin the markup to itself and break on every future tweak.
- `npm test` must stay green.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0
- [ ] `npm run test:e2e -- home.spec.ts` passes including the new state case
- [ ] `grep -n "text-\[" "web/app/(main)/page.tsx"` → no matches
- [ ] `grep -n "font-mono" "web/app/(main)/page.tsx"` → no matches, or `mono`
      added to the config
- [ ] Six screenshots (2 viewports × 3 states) with the Step 5 questions
      answered honestly
- [ ] `git diff --name-only` shows only in-scope files

## STOP conditions

- Plan 025 has not landed (Step 1).
- The positioning sentence has been changed on `play/page.tsx` by someone else
  since this plan was written — re-read it rather than using the excerpt above.
- You find yourself creating a shared component. Leave a `TODO(023)` instead.
- The hero cannot fit above the fold at 375×812 without shrinking the CTA below
  a 48px touch target — report the measurement rather than compromising the tap
  area.

## Maintenance notes

- **What a reviewer should scrutinise**: the returning-player path. It is easy
  to build a beautiful first-run page that makes a daily player scroll past a
  pitch every single visit.
- **What interacts with this**: `web/e2e/home.spec.ts`, and `play/page.tsx` if
  the sentence moved.
- **Deliberately deferred**: the remaining `(main)` pages still use the old
  layouts. This plan fixes the first impression only; a broader reskin is a
  separate piece of work that should follow the primitives landing (plan 023).
