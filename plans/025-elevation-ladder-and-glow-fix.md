# Plan 025: Give the app an elevation ladder, and stop the glows emitting colours that aren't in the palette

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat b6b570a..HEAD -- web/tailwind.config.ts web/app/globals.css`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (touches every screen's colour, though no layout)
- **Depends on**: none — this is independent of the Tailwind v3/v4 question,
  because it changes token *values*, not utility class names.
- **Blocks**: plan 026 (landing page redesign). Do this first, or the new
  landing page ships in the same flat green.
- **Category**: direction (visual design)
- **Planned at**: commit `b6b570a`, 2026-07-25

## Why this matters

The maintainer's report is that the app "is kind of ugly, green" while the game
board now looks good. The instinct is right but the diagnosis is not the hue —
**it is that there is no elevation contrast at all.**

Measured (advisor-verified, WCAG relative luminance):

| adjacent surfaces | contrast |
|---|---|
| `card` vs `background` | **1.32:1** |
| `elevated` vs `card` | **1.12:1** |
| `border` vs `card` | **1.15:1** |
| `muted` vs `card` | **1.04:1** |

Five greens inside a 1.35:1 band. A card sitting on a page is functionally
invisible, which is why nearly every page compensates with 4px coloured
left-borders and text glows — decoration doing the job surface contrast should
be doing. **It would read equally muddy in blue or grey.** Fixing the ladder is
what removes the "cheap" quality; changing the hue alone would not.

Second, the glow utilities emit colours that exist nowhere in the palette:
`.ds-text-glow` emits **indigo** `rgb(99 102 241)` and is applied to teal
`text-info` headings. A teal heading with an indigo halo, across ~52 call sites
including the sidebar wordmark, is a large part of the "smeared" impression.

## Current state

### Tokens — `web/tailwind.config.ts:19-31`

```ts
background: withAlpha(13, 15, 20),
foreground: withAlpha(232, 223, 208),
surface: withAlpha(26, 43, 30),
elevated: withAlpha(36, 53, 40),
muted: withAlpha(30, 40, 36),
"muted-foreground": withAlpha(168, 155, 140),
card: withAlpha(30, 44, 36),
"card-foreground": withAlpha(232, 223, 208),
popover: withAlpha(28, 38, 32),
"popover-foreground": withAlpha(232, 223, 208),
border: withAlpha(42, 53, 48),
input: withAlpha(60, 72, 66),
```

### Glow utilities — `web/app/globals.css:188-206`

```css
.ds-text-glow      { text-shadow: 0 0 12px rgb(99 102 241 / 0.35); }              /* indigo */
.ds-text-glow-strong { text-shadow: 0 0 6px rgb(245 158 11 / 0.45), 0 0 20px rgb(245 158 11 / 0.25); }  /* amber */
.text-glow-accent  { text-shadow: 0 0 12px rgb(99 102 241 / 0.45), 0 0 24px rgb(99 102 241 / 0.2); }    /* indigo */
.text-glow-info    { text-shadow: 0 0 12px rgb(56 189 248 / 0.45), 0 0 24px rgb(56 189 248 / 0.2); }    /* sky */
.text-glow-highlight { text-shadow: 0 0 12px rgb(245 158 11 / 0.45), 0 0 24px rgb(245 158 11 / 0.2); }  /* amber */
```

None of `rgb(99 102 241)`, `rgb(56 189 248)`, or `rgb(245 158 11)` appears in
`tailwind.config.ts`.

### The board already solves this — copy it

`.game-hud-surface` (`web/app/globals.css:115-121`) uses **neutral translucent
black over blur** and is completely felt-agnostic. Plan 019 applied the same
formula to `.game-board-scene .ds-panel`. That is the proven pattern; this plan
extends it off-board.

## The target values

Advisor-computed. **Do not substitute your own alphas without re-measuring** —
an earlier proposal of 4%/7%/10% measured 1.09/1.08/1.09, i.e. flatter than what
it replaced.

Warm-tinted variant, overlaying the tile cream `#FFF8E1` on `background`
`rgb(13 15 20)` — ties the chrome to the board's tile colour while staying
effectively hue-neutral:

| token | overlay | resulting RGB | vs previous level |
|---|---|---|---|
| `card` | cream @ 10% | `rgb(37 38 40)` | **1.27:1** vs background |
| `elevated` | cream @ 20% | `rgb(61 62 61)` | **1.41:1** vs card |
| `popover` | cream @ 30% | `rgb(86 85 82)` | **1.44:1** vs elevated |

`surface` should sit just under `card` (cream @ 6-7%), `muted` at cream @ 8%,
and `border` needs to clear `card` — use `rgb(255 248 225 / 0.14)` as a
translucent border rather than an opaque token so it reads on any level.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                        | Expected |
|-----------|--------------------------------|----------|
| Typecheck | `npm run typecheck`            | exit 0   |
| Lint      | `npm run lint`                 | exit 0   |
| Unit test | `npm test`                     | all pass |
| Build     | `npm run build`                | succeeds |

## Scope

**In scope**:
- `web/tailwind.config.ts` — the neutral chrome tokens only
- `web/app/globals.css` — the five glow utilities, and the `:root` var block at
  ~899-953 which must be kept in sync (see STOP conditions)

**Out of scope** (do NOT touch):
- `accent`, `success`, `info`, `highlight`, `destructive` — the semantic
  colours are fine and carry meaning. Only the neutral chrome changes.
- Anything under `.game-board-scene` / `.felt-*` / `.game-dock` — the board was
  deliberately tuned in plans 015 and 019. Leave it alone.
- `web/components/ui/*` — those have a separate Tailwind-version problem
  (plan 022). Do not try to fix it here.
- Any page layout. This plan changes colour only.

## Git workflow

- Branch: `feature/elevation-ladder`
- Conventional commits, e.g. `feat(visual): give chrome a real elevation ladder`
- Do NOT push or open a PR.

## Steps

### Step 1: Retune the neutral chrome tokens

In `web/tailwind.config.ts`, replace the neutral values with the table above.
Keep the `withAlpha` helper and the `<alpha-value>` pattern — many call sites
use `bg-card/90` style opacity modifiers and will break without it.

Leave `foreground`, `muted-foreground`, and every semantic colour untouched.

**Verify**: `npm run build` succeeds.

### Step 2: Make the glows emit the text's own colour

Replace the five utilities with `currentColor` versions:

```css
.ds-text-glow        { text-shadow: 0 0 14px currentColor; opacity: 1; }
.ds-text-glow-strong { text-shadow: 0 0 8px currentColor, 0 0 22px currentColor; }
```

`currentColor` in `text-shadow` inherits the element's colour, so a teal heading
glows teal and a gold heading glows gold, automatically, forever.

Then delete `.text-glow-accent`, `.text-glow-info`, and `.text-glow-highlight`
and replace their ~30 usages with `.ds-text-glow`. Find them with:

```bash
grep -rn "text-glow-accent\|text-glow-info\|text-glow-highlight" web/app web/components
```

If the glow reads too strong at full `currentColor`, wrap in
`color-mix(in srgb, currentColor 40%, transparent)` rather than reintroducing a
literal colour.

**Verify**: `grep -rn "rgb(99 102 241)\|rgb(56 189 248)\|rgb(245 158 11)" web/app/globals.css`
→ no matches.

### Step 3: Keep the `:root` block in sync

`web/app/globals.css` has a second copy of the tokens as CSS variables at
~899-953. They have **already drifted** from the Tailwind config (card is
`#1e2c24` in one and `#1e2c22` in the other). Update them to match your new
values.

Note: unifying these into a single source is plan 022's job, not this plan's.
Here, just stop them diverging further.

**Verify**: `npm run build` succeeds.

### Step 4: Look at every affected screen

**Worktree dev-server note**: `preview_start({name})` reads `.claude/launch.json`
from the MAIN REPO ROOT and will serve stale code from a worktree. Start your
own: `cd web && npx next dev -p 3170`, then drive the Browser pane against it.
Confirm `window.location.href` before every screenshot — the pane may be shared.

Screenshot at **1280×800** and **375×812**:
`/`, `/learn`, `/learn/level1`, `/practice`, `/reference`, `/progress`,
`/parlour`, `/settings`, `/cosmetics`.

For each, judge:
- Do cards now read as raised off the page without needing their coloured
  left-border crutch?
- Is text still comfortably legible? `foreground` on the new `card` must stay
  above 7:1; measure one and report the number.
- Does `success` (green) now read as *meaningful* rather than blending in?

Then walk `/` → `/play` → `/play/game` → back and confirm the transition into
the board no longer feels like entering a different product.

### Step 5: Confirm the board is untouched

```bash
git diff --stat
```

Must show only `tailwind.config.ts` and `globals.css`. Inside `globals.css`,
the diff must not touch any `.felt-*`, `.game-dock`, `.game-hud-surface`, or
`.game-board-scene` rule.

Screenshot `/play/game` and compare against the pre-change screenshot. The board
should be **pixel-identical** apart from any panel that inherits `ds-panel`
(which plan 019 already overrides board-side, so it should in fact be identical).

**If the board changed at all, that is a STOP condition** — it means a token you
changed leaks into the board and needs a board-side override.

## Test plan

Colour is not meaningfully unit-testable and asserting hex values in jsdom would
just pin the stylesheet to itself. The real test is Steps 4 and 5.

- `npm test` must stay green (nothing should depend on these values; if a test
  fails, that is a finding worth reporting, not a test to edit).
- Add **one** contrast regression guard: a small unit test that imports the
  config and asserts `card` vs `background` ≥ 1.25:1 using a WCAG luminance
  helper. That is the invariant this whole plan exists to establish, and it is
  the one thing worth locking.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 with the new contrast guard passing
- [ ] `npm run build` succeeds
- [ ] No literal indigo/sky/amber remains in the glow utilities
- [ ] `git diff --stat` shows exactly two files
- [ ] `/play/game` is visually unchanged
- [ ] Nine screens screenshotted at two viewports, with the measured
      `foreground`-on-`card` contrast reported

## STOP conditions

- The board changes appearance at all.
- `foreground` on the new `card` measures below 7:1.
- A unit test fails (report it; do not edit the test).
- The `:root` block and the Tailwind config cannot be reconciled because some
  third place also defines these colours — report what you found.

## Maintenance notes

- **What a reviewer should scrutinise**: legibility at the top of the ladder.
  `popover` at cream/30% is a fairly light surface; `foreground` cream text on
  it is the most likely contrast failure.
- **What this deliberately does not fix**: the two token systems still exist in
  two files. Plan 022 unifies them. This plan only stops them drifting.
- **Related**: plan 026 (landing page) assumes this has landed.
