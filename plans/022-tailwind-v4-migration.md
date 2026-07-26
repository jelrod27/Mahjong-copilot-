# Plan 022: Migrate to Tailwind v4

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **This plan carries the highest regression risk of the round.** The game board
> (plans 015/019) and the landing page (plan 026) were built and visually
> verified immediately before this. A CSS engine swap is exactly the change that
> silently shifts them. Protecting those two surfaces matters more than
> finishing quickly.
>
> **Drift check (run first)**: `git diff --stat b6b570a..HEAD -- web/package.json web/tailwind.config.ts web/app/globals.css`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: **HIGH** — global CSS engine change
- **Depends on**: plans 025 and 026 (both merged on `feature/visual-facelift`)
- **Blocks**: primitive extraction (roadmap 023), any reskin of the remaining
  `(main)` pages
- **Category**: tech debt / tooling
- **Decision**: maintainer chose the full v4 upgrade over fixing forward on v3.
- **Planned at**: `feature/visual-facelift`, 2026-07-25

## Why this matters

`web/components/ui/*` was scaffolded for **Tailwind v4 + shadcn `base-nova`**,
but `package.json` pins **tailwindcss 3.4.19**. Advisor-verified against the
built CSS: `outline-hidden` → **0** occurrences, `ring-3` → **0**,
`bg-sidebar` → **0**, while the v3 control `bg-accent` → 9. **Those classes
compile to nothing.** The sidebar renders on ambient styling, not on what its
code says.

`globals.css` also imports two **v4** stylesheets (`tw-animate-css`,
`shadcn/tailwind.css`) that v3 cannot process, so they ship verbatim —
**55 `@utility`, 17 `@property`, 2 `@theme` blocks** shipped verbatim inside
the app-global stylesheet on every route.

And tokens are defined twice — `tailwind.config.ts` hardcodes RGB triples while
`globals.css :root` defines CSS variables — with the config never reading the
vars. **Editing `--accent` does nothing to `bg-accent`.** v4's `@theme` makes
CSS the single source and dissolves this whole class of bug.

### Measured migration surface

| rename | uses |
|---|---|
| `outline-none` → `outline-hidden` | 20 |
| `rounded-sm` → `rounded-xs` | 16 |
| bare `rounded` (meaning shifts) | 14 |
| `blur-sm` → `blur-xs` | 10 |
| `shadow-sm` → `shadow-xs` | 2 |
| deprecated `*-opacity-*` | **0** |

~62 changes across 1,354 `className` occurrences (~4.6%). There is an official
codemod. This is a small migration for this codebase.

## Commands you will need

From the repository's `web/` directory (`cd web`):

| Purpose   | Command                                | Expected |
|-----------|----------------------------------------|----------|
| Install   | `npm install`                          | exit 0   |
| Codemod   | `npx @tailwindcss/upgrade`             | see Step 3 |
| Typecheck | `npm run typecheck`                    | exit 0   |
| Lint      | `npm run lint`                         | exit 0   |
| Unit test | `npm test`                             | all pass, report the observed count |
| Build     | `npm run build`                        | succeeds |
| E2E       | `npm run test:e2e -- home.spec.ts tile-scaling.spec.ts play-game.spec.ts` | pass |

## Scope

**In scope**:
- `web/package.json`, `web/package-lock.json`
- `web/postcss.config.js`
- `web/tailwind.config.ts`
- `web/app/globals.css`
- Mechanical class renames anywhere under `web/app/` and `web/components/`
- `web/components/ui/*` — including deleting the dead ones (Step 6)

**Out of scope** (do NOT touch):
- **Any visual design decision.** This is a mechanical migration. Colours,
  spacing, sizes and layout must come out identical. If something looks better
  a different way, that is a different plan.
- `web/engine/**` — no CSS there.
- Component logic, props, or JSX structure beyond class strings.
- `web/content/**` — plan 020 owns that and may run concurrently.

## Git workflow

- Branch: `feature/tailwind-v4`
- Conventional commits, e.g. `chore(build): migrate to tailwind v4`
- **Commit the codemod output separately** from your hand edits, so a reviewer
  can see which changes were automated and which were judgement.
- Do NOT push or open a PR.

## Steps

### Step 1: Capture a visual baseline BEFORE touching anything

This is the most important step in the plan. You cannot prove you preserved the
design if you never recorded it.

Start a dev server from your worktree (`cd web && npx next dev -p 3190`; do NOT
use `preview_start({name})`, it serves the main repo). Confirm
`window.location.href` before each capture — the Browser pane may be shared.

Screenshot at **1280×800** and **375×812**:
`/`, `/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`,
`/learn`, `/practice`, `/reference`, `/progress`, `/settings`.

Then record computed styles as machine-checkable ground truth:

```js
(() => {
  const pick = s => { const e=document.querySelector(s); if(!e) return null;
    const c=getComputedStyle(e);
    return {bg:c.backgroundColor,bgImg:c.backgroundImage.slice(0,90),
            color:c.color,border:c.borderColor,bw:c.borderWidth,radius:c.borderRadius,
            fontFamily:c.fontFamily}; };
  return {
    body: pick('body'),
    card: pick('.ds-card'),
    panel: pick('.ds-panel'),
    btn: pick('.ds-btn'),
    boardPanel: pick('.game-board-scene .ds-panel'),
    dock: pick('.game-dock'),
    hud: pick('.game-hud-surface'),
    felt: pick('.game-table-felt'),
    tile: pick('.mahjong-tile-face'),
    heading: pick('h1'),
  };
})()
```

**`fontFamily` is not optional.** An earlier run of this exact probe omitted it,
checked only colours/borders/radii, and reported "byte-identical" — while the
migration had actually made `--font-sans` and `--font-display` self-referential
(`@theme { --font-sans: var(--font-sans), ... }` collides with the identically-named
custom property `next/font` sets on `<html>`), so every font on the site silently
fell back to the browser default serif. A probe that doesn't check the one thing
that broke is not a baseline. Confirm `fontFamily` is a real font name (e.g.
contains "Noto Sans SC" / "Noto Serif SC"), not just present in the JSON.

Run it on `/` and on `/play/game`. **Save both JSON blobs into your report.**
Step 8 diffs against them.

Also record the CSS payload size:
```bash
npm run build && find .next -name "*.css" -path "*static*" -exec ls -la {} \;
```

### Step 2: Read `globals.css` and inventory what must survive

`globals.css` is ~950 lines and contains the felt system, tile faces, the dock,
animations, and the `:root` token block. Note especially:
- `.game-table-felt` + `.felt-*` (plans 015/019)
- `.mahjong-tile-face` and the `--tile-base-w` / `--tile-scale` sizing chain
- `.game-dock`, `.game-hud-surface`, `.game-board-scene .ds-panel`
- the `@layer components` block holding every `ds-*` class

**These are the crown jewels. Everything else is negotiable.**

### Step 3: Run the codemod — with a known workaround applied first

⚠️ **REVISED after run 1.** A previous attempt ran the codemod unmodified and it
crashed with `Error: @utility cannot be nested`. Diagnosed cause: the codemod
rewrites `@import "shadcn/tailwind.css";` into
`@import 'shadcn/tailwind.css' layer(base);`, but that package ships a
top-level `@utility no-scrollbar` block (`node_modules/shadcn/dist/tailwind.css`).
v4 forbids `@utility` inside a layer, so the compiler chokes on the codemod's
own output. The run 1 executor correctly stopped and reverted.

**Both files are already v4-native syntax** (`@theme inline`, `@custom-variant`,
`@utility`) — they need no layer wrapper and work under v4 imported plainly.
Advisor-verified: every class they provide (`no-scrollbar`, `data-open`,
`data-closed`, `data-active`, `animate-in`, `fade-in-*`, `zoom-in-*`,
`slide-in-from-*`) is used in exactly two files — `components/ui/sidebar.tsx`
and `components/ui/tooltip.tsx` — and none of it compiles under v3 today.

**3a.** Remove these two lines from the top of `web/app/globals.css` and keep
them somewhere you can paste back verbatim:
```css
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

**3b.** Run the codemod:
```bash
npx @tailwindcss/upgrade
```

**3c.** Restore both imports at the very top of `globals.css`, **plain, with no
`layer(...)` suffix** — exactly as quoted in 3a.

**3d.** `npm run build`. It must succeed. If it now fails *because* of those two
imports, that is a STOP condition — report the error rather than deleting them,
since `sidebar.tsx` and `tooltip.tsx` depend on what they provide.

**Read the codemod's entire diff before continuing** and commit it as its own
commit, separate from your hand edits. Report what it changed and anything it
flagged or refused.

If the codemod fails for any reason **other** than the `@utility` nesting issue
described above, STOP and report rather than hand-migrating.

### Step 4: Fix the PostCSS config

Confirm `postcss.config.js` now uses `@tailwindcss/postcss`. In v4, imports and
vendor prefixing are handled automatically, so `postcss-import` and
`autoprefixer` should be gone.

Current file for reference:
```js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**Verify**: `npm run build` succeeds.

### Step 5: Decide the config strategy — `@config` first

v4 supports keeping the existing JS config via the `@config` directive. **Use
that initially.** Porting `tailwind.config.ts` to `@theme` in the same change
as the engine swap makes any regression impossible to attribute.

If the codemod already converted the config to `@theme`, that is acceptable —
but then you must be especially rigorous in Step 8, and say so in your report.

**Actual outcome (recorded after execution):** the `@config` path was not
used. `@tailwindcss/postcss` (the plugin this migration adopts) does not load
a `.ts` config through `@config` — only a transpiled `.js` config is
supported — so `@config` was never a real option for this codebase's
TypeScript config. The codemod inlined every token from `tailwind.config.ts`
into the `@theme` block in `globals.css` and `web/tailwind.config.ts` was
deleted outright. There is no config file left to decide a strategy for; the
"if already converted" hedge above did in fact happen, and it happened for a
structural reason (the `.ts`/`@config` incompatibility), not by choice.

Either way, the two v4 stylesheet imports at the top of `globals.css` should
now compile properly rather than passing through. Confirm that.

### Step 6: Delete the dead primitives

Advisor-verified import census — these have **zero** importers outside
`components/ui/` itself:

- `web/components/ui/button.tsx`
- `web/components/ui/input.tsx`
- `web/components/ui/progress.tsx`
- `web/components/ui/skeleton.tsx`
- `web/components/ui/separator.tsx`

Before deleting each, re-run the check yourself:
```bash
grep -rl "ui/button" web/app web/components | grep -v "web/components/ui/"
```
If a file has any importer, **keep it** and say so.

Deleting these shrinks what has to be migrated and stops you maintaining files
nothing uses.

Still in use, must keep and must work: `card` (2), `sidebar` (2), `badge` (1),
`sheet` (1), `tooltip` (1).

### Step 7: Verify the previously-dead classes now compile

The whole point of this migration:

```bash
npm run build
CSS=$(find .next -name "*.css" -path "*static*" | xargs ls -S | head -1)
for c in 'outline-hidden' 'ring-3' 'bg-sidebar'; do
  printf "%s -> %s\n" "$c" "$(grep -o "$c" "$CSS" | wc -l)"
done
```

Each must now be **greater than 0**. If any is still 0, the migration has not
achieved its purpose — investigate and report.

Also report the new CSS file size against **your own Step 1 measurement**.
(An earlier draft of this plan cited 872 KB; a later measurement on this
branch found 734-751 KB depending on whether you sum all chunks or take the
largest. Trust your own number, not either of those.)

### Step 8: Prove the design did not change

Re-run the Step 1 computed-style probe on `/` and `/play/game` and **diff the
JSON against the baseline.**

Expected: values may be expressed differently (`rgb(37 38 40)` vs
`rgb(37,38,40)`), but every colour, radius and border width must be
**equivalent**. Normalise before comparing; do not hand-wave.

Then retake all 14 screenshots and compare against Step 1 by eye.

**Any of these is a STOP condition:**
- The felt, tile faces, dock, or HUD surfaces differ
- The landing page hero differs
- `ds-card` / `ds-panel` / `ds-btn` computed values differ
- Tile sizing differs at either viewport

Report the diff explicitly — "identical" is not an acceptable answer without
the comparison shown.

### Step 9: Full verification

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run test:e2e -- home.spec.ts tile-scaling.spec.ts play-game.spec.ts
```

All must pass — report the observed unit test count rather than gating on a
fixed number, since the suite grows across plans. If a test fails, report it —
do not edit tests to accommodate a visual change, because a visual change is
itself a STOP condition here.

## Test plan

- The existing suite is the regression net; it must stay green unchanged.
- **Add one guard**: a test asserting the built CSS contains `outline-hidden`
  (or another previously-dead class). That is the invariant this plan
  establishes and it is cheap to lock. If a build-output test does not fit the
  vitest setup, say so and skip it rather than contriving one.
- No visual snapshot tests — Playwright screenshot baselines are roadmap 024.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` → all pass (report the observed count), none edited to accommodate
- [ ] `npm run build` succeeds
- [ ] e2e (home, tile-scaling, play-game) pass
- [ ] `outline-hidden`, `ring-3`, `bg-sidebar` all compile (> 0 occurrences)
- [ ] New CSS size reported against your own Step 1 measurement
- [ ] Computed-style diff for `/` and `/play/game` shown, all equivalent
- [ ] 14 screenshots retaken and compared
- [ ] Dead primitives deleted, each verified importer-free first
- [ ] Codemod output committed separately from hand edits

## STOP conditions

- The codemod fails or refuses to run.
- Any board or landing-page surface changes appearance.
- A previously-dead class still does not compile after migration.
- A unit test fails and the cause is a visual change.
- The codemod fails for any reason other than the `@utility` nesting issue
  Step 3 works around.
- After Step 3c, `tw-animate-css` / `shadcn/tailwind.css` still fail to compile
  under v4 — report rather than deleting them, since `sidebar.tsx` and
  `tooltip.tsx` depend on what they provide.

## Maintenance notes

- **What a reviewer should scrutinise**: Step 8's computed-style diff. Every
  other check can pass while the design has quietly shifted.
- **Not deferred after all**: porting `tailwind.config.ts` to `@theme` was
  planned as a follow-up (see Step 5), but the codemod did it as part of this
  same change — `@config` was never viable here since `@tailwindcss/postcss`
  does not load a `.ts` config through it. `tailwind.config.ts` is gone;
  `--accent` and `bg-accent` already resolve to the same `@theme` token.
- **This unblocks**: primitive extraction (roadmap 023), and any reskin of
  `/learn`, `/practice`, `/reference`.
