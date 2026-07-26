# Plan 026: Rebuild `/` as a landing page — Direction A, "The Table"

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> Step 6 asks you to judge what you built and say honestly whether it works.
>
> **Drift check (run first)**: `git diff --stat b6b570a..HEAD -- "web/app/(main)/page.tsx"`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED — the product's first impression.
- **Depends on**: plan 025 (elevation ladder) — **DONE and merged.**
- **Direction**: **A, "The Table"** — chosen by the maintainer from a two-option
  study. Direction B ("The Curriculum") was rejected for now; see "Why A".
- **Category**: direction (product)
- **Planned at**: commit `b6b570a` + plan 025, 2026-07-25

## Why this matters

`/` is a logged-in dashboard, not a landing page. Its first viewport is a
greeting, the wordmark, a rank pill and two small text links, followed by seven
cards of near-identical weight. Someone arriving cold learns nothing about what
the product is.

The pitch already exists — on the wrong page. `web/app/play/page.tsx:66-68`:

> "Learn and play real HK table mahjong — not tile-matching solitaire. Solo vs
> AI with coach hints and hand review after each hand."

Verified hierarchy inversion: the `<h1>` at `web/app/(main)/page.tsx:90` is
`text-xl md:text-2xl` (20px on mobile) while the Tile-of-the-Day Chinese name at
`:249` is `text-2xl` (24px). The decoration is larger than the title.

## Why A

The solo game is the finished, polished part of this product — plans 012–019
just landed on it. The curriculum currently teaches scoring rules the engine
contradicts (see `plans/ROADMAP-round-3.md` P0). Leading with the game is the
honest position while that is true.

The visual consequence: **the hero is the felt.** The landing page reuses the
same bamboo mat, wood rail and cream tiles the board renders, so the page and
the product it sells look like one thing.

## What to build

### The hero — first viewport, no scrolling, at 375px and 1280px

Approved copy from the direction study. Use it as written unless something
reads wrong in situ, and say so if you change it.

- **Eyebrow**: `Hong Kong rules · 4 players`
- **Headline**: `Real table mahjong. Not the tile-matching one.`
- **Pitch**: `Learn Hong Kong mahjong properly, then play a full hand against
  three AI opponents — with coach hints while you play and a review of every
  decision after.` (emphasise "coach hints while you play")
- **A real 8-tile hand**, rendered with `RetroTile`
- **Primary CTA** — state-dependent label, `data-testid="home-primary-cta"`:
  - saved game exists (`hasSavedGame()`) → **"Resume your match"**
  - else, zero games played and zero lessons done → **"Play your first hand"**
  - else → **"Play a hand"**
- **Secondary**: `Start from the basics` → `/learn` (ghost/outline on the felt)
- **Sub-line**: `No account. Nothing to install. Your progress stays on this device.`

### Immediately below — three cards

| eyebrow | title | body |
|---|---|---|
| While you play | Coach hints | Every tile marked keep, neutral or safe to discard — with the reason. |
| After the hand | Hand review | What you played well, and the discard that cost you. |
| When you're ready | The Jade Parlour | Nine floors, nine rivals, each one teaching a different skill. |

The Parlour card links to `/parlour`.

### Then the existing content, demoted

In order: resume/continue row (if any), Daily Hand, Lessons + Practice, Tile of
the Day, the local-mode note. Rank moves into the continue row or a compact
header chip — **not** the hero.

## Reuse — do not rebuild these

**The felt is already a component.** `web/app/globals.css:618-643` defines
`.game-table-felt` with the fibre-noise `::before` and wood-rail `::after`;
`:676` defines `.felt-bamboo-mat`. Compose the hero as:

```html
<section class="game-table-felt felt-bamboo-mat">
```

and you inherit the exact texture, vignette and rail the board uses. **Do not
hand-author a new gradient.** If the rail's `border-radius: 14px` is wrong for a
full-bleed hero, override only that property locally.

**Tiles**: use `RetroTile` from `web/components/game/RetroTile.tsx`. It works
outside the board — `app/(main)/cosmetics/page.tsx` and
`app/(main)/practice/TileQuiz.tsx` already do this. Sizing comes from
`--tile-base-w`; the base value at `globals.css:774` applies outside
`.game-board-scene`. **Verify the tiles actually render at a sensible size in
the hero and report the measured width** — if they collapse, set
`--tile-base-w` locally on the hero rather than editing the global.

Build the hand from `TileFactory` (`web/models/Tile.ts`) so the tiles are real
`Tile` objects, not fixtures. A pleasant, legible hand: 4/5/6 dot, 7/8 bamboo,
3/3 character, East wind.

## Current state

`web/app/(main)/page.tsx` is 270 lines. The hero region to replace is
`:85-128`. It already reads `lessonsDone`, `floorsLit`, `nextFloor`, `rank`, and
uses a post-mount hydration guard for localStorage-derived state (see the
`useEffect` around `:32-43`) — **follow that pattern or you will get a hydration
mismatch.**

`font-mono` is used at `:89` and `:252` but the `@theme` block in
`web/app/globals.css` defines only `--font-sans`, `--font-display`,
`--font-heading`. It falls through to a system stack — a third typeface on the
landing page.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                             | Expected |
|-----------|-------------------------------------|----------|
| Typecheck | `npm run typecheck`                 | exit 0   |
| Lint      | `npm run lint`                      | exit 0   |
| Unit test | `npm test`                          | all pass |
| E2E       | `npm run test:e2e -- home.spec.ts`  | all pass |

## Scope

**In scope**:
- `web/app/(main)/page.tsx`
- `web/app/play/page.tsx` — **only** to remove the pitch sentence if you move
  rather than copy it. Nothing else on that page changes.
- `web/app/globals.css` — **only** if the hero needs a local felt override
  (e.g. squaring the rail's corners). Do not touch any `.felt-*` colour.
- `web/app/globals.css` — **only** to add a `--font-mono` token to the `@theme`
  block if you keep `font-mono`. Deleting the usage is preferred.
- `web/e2e/home.spec.ts`

**Out of scope** (do NOT touch):
- Token values — plan 025 owns those and it is merged. If the palette looks
  wrong, that is a STOP condition, not something to patch here.
- `web/components/game/RetroTile.tsx` — consume it, don't modify it.
- `web/components/ui/*` — unresolved Tailwind-version problem (roadmap P1).
- Any other page under `(main)`.
- **Do not create shared components.** No `PageHeader`, no `Card` primitive.
  Write the markup locally and leave `TODO(023)` where a primitive belongs —
  a second parallel primitive set is the exact problem the DX audit found.

## Git workflow

- Branch: `feature/landing-page`
- Conventional commits, e.g. `feat(home): rebuild the landing page around the table`
- Do NOT push or open a PR.

## Steps

### Step 1: Confirm plan 025 landed

```bash
grep -n -- '--color-card:' web/app/globals.css
```

Expect `rgb(37 38 40)`. If it still reads `rgb(30 44 36)`, plan 025 has not
landed — **STOP**.

### Step 2: Build the hero on the real felt

Replace `web/app/(main)/page.tsx:85-128`. Compose the felt via
`.game-table-felt.felt-bamboo-mat` as described in Reuse.

Keep the rank-up banner above the hero — it is a transient celebration and
correctly sits at the very top when present.

Text on felt must be cream-on-warm, not the page's `foreground` on dark. The
board already solves this; match it. Contrast target ≥ 4.5:1 — **measure it and
report the number.**

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Wire the state-dependent CTA

Import `hasSavedGame` from `web/lib/matchStorage.ts`. Resolve the label per the
table above, behind the file's existing post-mount hydration guard.

Give the primary `data-testid="home-primary-cta"` and a minimum 48px touch
target.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Three cards, then demote the rest

Add the three cards, then reorder the existing sections. This is mostly moving
JSX blocks.

Reduce eyebrow noise while you are here — the page currently has six small-caps
overlines competing at similar weight. **The three pillar cards above are
exempt** — each one's eyebrow (`While you play` / `After the hand` / `When
you're ready`) is part of the required card content and does not count toward
this cap. The cap applies only to the demoted content below the pillar cards:
keep at most two eyebrows there.

**Verify**: `npm run lint` → exit 0.

### Step 5: Use the configured type scale

The `@theme` block in `web/app/globals.css` defines `2xs / caption / body /
body-lg / title-sm / title / title-lg / display`. **It has zero usages in any
TSX file.**

Use it here: `display` or `title-lg` for the headline, `body-lg` for the pitch,
`caption` for eyebrows. Introduce no `text-[Npx]` arbitrary values.

Delete both `font-mono` usages, or add a `--font-mono` token to the `@theme`
block. Deleting preferred.

**Verify**: `grep -n 'text-\[' "web/app/(main)/page.tsx"` → no matches.

### Step 6: Look at it, and be honest

**Worktree dev-server note**: `preview_start({name})` reads `.claude/launch.json`
from the MAIN REPO ROOT and serves stale code from a worktree. Start your own:
`cd web && npx next dev -p 3180`. Confirm `window.location.href` before every
screenshot — the Browser pane may be shared with other agents.

Screenshot `/` at **1280×800** and **375×812**, in three states:
1. **First run** — clear localStorage entirely
2. **Mid-progress** — some lessons done, no saved game
3. **Saved game** — start a match, leave it, return to `/`

Report, per state:
- Without scrolling, does the page say what the product is?
- Is there exactly one obvious next action, and is it right for that state?
- Do the tiles read as inviting, or as clutter crowding the CTA at 375px?
- Does the felt hero sit comfortably against the dark page below it, or is the
  seam ugly?

**If any answer is no, say so plainly rather than shipping it.** A landing page
that is merely different from the old one is not the goal.

Also walk `/` → `/play/game` → back and confirm the felt continuity actually
reads as one product.

### Step 7: Update the e2e spec

Read `web/e2e/home.spec.ts` first; it asserts the current structure and will
break. Update it to assert:
- the pitch sentence is present
- exactly one `home-primary-cta` exists
- the first-run label is "Play your first hand"

**Verify**: `npm run test:e2e -- home.spec.ts` → passes.

## Test plan

- **Updated**: `web/e2e/home.spec.ts`.
- **New e2e case**: first-run shows "Play your first hand"; after seeding a
  saved game in localStorage it shows "Resume your match". That state logic is
  the only real logic in this plan and is worth pinning.
- **No new unit tests** — asserting JSX structure in jsdom pins markup to itself
  and breaks on every tweak.
- `npm test` must stay green (610 tests as of plan 025).

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0, no newly failing tests
- [ ] `npm run test:e2e -- home.spec.ts` passes including the new state case
- [ ] `grep -n 'text-\[' "web/app/(main)/page.tsx"` → no matches
- [ ] `grep -n 'font-mono' "web/app/(main)/page.tsx"` → no matches, or
      `--font-mono` added to the `@theme` block
- [ ] Hero reuses `.game-table-felt.felt-bamboo-mat`; no new gradient authored
- [ ] Measured cream-on-felt text contrast reported, ≥ 4.5:1
- [ ] Measured hero tile width reported
- [ ] Six screenshots (2 viewports × 3 states) with Step 6 answered honestly
- [ ] `git diff --name-only` shows only in-scope files

## STOP conditions

- Plan 025 has not landed (Step 1).
- The pitch sentence on `play/page.tsx` differs from the excerpt above —
  re-read it rather than trusting this plan's copy.
- You find yourself creating a shared component. Leave a `TODO(023)`.
- The hero cannot fit above the fold at 375×812 without shrinking the CTA below
  a 48px touch target — report the measurement rather than compromising the tap
  area.
- Tiles render below 28px wide in the hero and setting `--tile-base-w` locally
  does not fix it — report rather than editing the global sizing.

## Maintenance notes

- **What a reviewer should scrutinise**: the returning-player path. It is easy
  to build a beautiful first-run page that makes a daily player scroll past a
  pitch every visit.
- **What interacts with this**: `web/e2e/home.spec.ts`; `play/page.tsx` if the
  sentence moved; `.felt-*` rules if anyone retunes the board felt later — the
  landing hero will follow it automatically, which is intended.
- **Deliberately deferred**: the other `(main)` pages keep their layouts. This
  plan fixes the first impression only. The broader reskin should follow the
  primitives landing (roadmap item 023).
- **Direction B** ("The Curriculum" — lead with the six-level path) remains the
  better long-term position once the curriculum's scoring errors are fixed.
  Revisit after roadmap P0.
