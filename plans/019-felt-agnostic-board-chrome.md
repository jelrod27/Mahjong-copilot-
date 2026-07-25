# Plan 019: Make in-game board chrome felt-agnostic

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/app/globals.css web/components/game/DiscardPool.tsx`
> Note: `globals.css` HAS changed since 700769d (plans 015 and 018 landed).
> That is expected. Verify the excerpts below against the live file.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 015 (DONE — this fixes a problem 015 exposed)
- **Category**: direction (visual design)
- **Planned at**: commit `700769d` + merged plans 012/015/016/017/018, 2026-07-25

## Why this matters

Plan 015 moved the default table felt off generic green to the warm tan
`bamboo-mat`. The felt itself is a clear improvement — real fibre texture, a
softer vignette, a proper wood rail. But it exposed a hidden coupling: **the
in-game panels and dock are hardcoded to dark-green surface colours that were
tuned back when the felt was always green.**

The visible result at the new default: a warm tan table with a dark-green
discard panel floating on it, and a hard tan/green seam across the top edge of
the bottom dock. Two unrelated colour systems sitting adjacent. Board coherence
is arguably worse than before 015, even though the felt is better.

This affects every non-green felt. `tournament-red` and `bamboo-mat` clash
most; `casino-black` is least affected. The fix makes the chrome read as
*shadow over whatever felt is beneath*, so all four felts work.

**The codebase already contains the correct pattern** — `.game-hud-surface`
uses neutral translucent black and is completely felt-agnostic. This plan
brings the dock and the in-game panel in line with it.

## Current state

### The exemplar to copy — `web/app/globals.css:106-113`

This is already correct. Do not change it; match it.

```css
  .game-hud-surface {
    border-radius: 0.75rem;
    border: 1px solid rgb(92 61 46 / 0.4);
    background: rgb(0 0 0 / 0.28);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.28), 0 2px 6px rgb(0 0 0 / 0.18);
    backdrop-filter: blur(12px);
```

Neutral black at 28% over blur — it darkens whatever is beneath without
imposing a hue. That is exactly the behaviour wanted everywhere on the board.

### Offender 1 — the dock, `web/app/globals.css:85-99`

```css
  .game-dock {
    position: relative;
    border-radius: 1rem 1rem 0 0;
    border-top: 1px solid rgb(201 168 76 / 0.22);
    border-left: 1px solid rgb(92 61 46 / 0.35);
    border-right: 1px solid rgb(92 61 46 / 0.35);
    padding: 0.75rem 0.5rem 0.5rem;
    box-shadow: 0 -12px 40px rgb(0 0 0 / 0.45);
    backdrop-filter: blur(20px);
    background: linear-gradient(
      to bottom,
      rgb(44 58 48 / 0.96) 0%,
      rgb(13 15 20 / 0.94) 100%
    );
  }
```

`rgb(44 58 48)` is dark green, at 96% opacity — effectively opaque. This is the
hard seam.

### Offender 2 — the discard panel

`web/app/globals.css:22-24`:

```css
  .ds-panel {
    @apply rounded-lg border border-border/60 bg-elevated/80 backdrop-blur-md shadow-ds-sm;
  }
```

`elevated` is `rgb(36 53 40)` (`web/tailwind.config.ts:23`) — dark green, at 80%
over a tan felt reads muddy.

`.ds-panel` is applied by `web/components/game/DiscardPool.tsx:100` (the
sectioned view) and again in its fallback single-grid view further down.

⚠️ **`.ds-panel` is used app-wide**, not just in game — grep it and you will
find it across learning screens where the dark-green surface is correct
(there is no felt behind it there). **Do NOT change `.ds-panel` globally.**
Scope the override to the board.

## Commands you will need

From the `web/` subdirectory of your worktree:

| Purpose   | Command                                    | Expected |
|-----------|--------------------------------------------|----------|
| Install   | `npm install`                              | exit 0   |
| Typecheck | `npm run typecheck`                        | exit 0   |
| Lint      | `npm run lint`                             | exit 0   |
| Unit test | `npm test`                                 | all pass |
| E2E       | `npm run test:e2e -- play-game.spec.ts`    | all pass |

## Scope

**In scope**:
- `web/app/globals.css` — the `.game-dock` rule, and a new board-scoped
  `.ds-panel` override.

**Out of scope** (do NOT touch):
- The global `.ds-panel` rule itself (line ~22). Learning screens depend on it.
- `.game-hud-surface` — already correct, it is the reference.
- Any `.felt-*` rule or `.game-table-felt` — plan 015 just landed there.
- `web/tailwind.config.ts` — do not retune semantic tokens.
- `web/components/game/DiscardPool.tsx` — prefer a CSS-only fix. Only touch it
  if the CSS-only approach provably cannot work, and say so in NOTES.

## Git workflow

- Branch: `feature/felt-agnostic-chrome`
- Conventional commits, e.g. `fix(visual): make board chrome felt-agnostic`
- Do NOT push or open a PR.

## Steps

### Step 1: Neutralise the dock

Replace `.game-dock`'s green gradient with a neutral one, keeping every other
property (radius, borders, padding, shadow, blur) exactly as-is:

```css
    background: linear-gradient(
      to bottom,
      rgb(0 0 0 / 0.42) 0%,
      rgb(0 0 0 / 0.72) 100%
    );
```

The gradient is retained deliberately — it still grounds the dock as heavier at
the bottom — but it now darkens the felt rather than tinting it green.

Keep the warm gold top border (`rgb(201 168 76 / 0.22)`); it reads as a rail
highlight and works on all four felts.

**Verify**: `npm run lint` → exit 0.

### Step 2: Scope a felt-agnostic panel override to the board

Add, in the same `@layer components` block, AFTER the global `.ds-panel` rule
so it wins on source order:

```css
  /* On the game board a felt shows through, so panels must not impose their
     own hue — any non-green felt would clash. Match .game-hud-surface:
     neutral translucent black over blur. Off-board .ds-panel is unchanged. */
  .game-board-scene .ds-panel {
    background: rgb(0 0 0 / 0.28);
    border-color: rgb(92 61 46 / 0.4);
  }
```

Confirm `.game-board-scene` is an ancestor of the discard pool before relying
on this. If it is not, use `.game-dock .ds-panel` or add a dedicated class —
and say which you used in NOTES.

**Verify**: `npm run lint` → exit 0, and confirm the global `.ds-panel` rule is
textually unchanged (`git diff` should show it as context, not a change).

### Step 3: Look at all four felts

**Worktree dev-server note**: `preview_start({name})` reads
`.claude/launch.json` from the MAIN REPO ROOT and will serve stale code. Start
your own: `cd web && npx next dev -p 3140` in the background, then use the
Browser pane's `navigate` / `javascript_tool` / `computer{action:"screenshot"}`
against `http://localhost:3140`.

**The Browser pane is shared with other agents and tabs may be hijacked.**
Confirm `window.location.href` before every screenshot. The tab cap is 9 — if
`tabs_create` fails, reuse an existing tab and re-navigate.

Go to `/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`. Switch
felts by setting the cosmetics preference (inspect `web/lib/cosmetics.ts` for
the storage key, or use the `/cosmetics` page — it is now linked from Settings).

Screenshot **all four felts** at **1280×800** and at **375×812**. For each,
judge:
- Does the discard panel read as a shadow on the felt, rather than a
  differently-coloured box sitting on top of it?
- Is the dock seam gone — does the dock feel like part of the same table?
- Are discarded tiles and their labels still clearly readable?
- Is text contrast still adequate against the lighter `bamboo-mat`?

`bamboo-mat` (the new default) and `tournament-red` are the important cases —
they clash most today. Report what you observed per felt.

**If text contrast fails on `bamboo-mat`**, darken the panel toward
`rgb(0 0 0 / 0.38)` rather than reintroducing a hue.

### Step 4: Confirm off-board screens are untouched

The global `.ds-panel` is used across learning screens. Visit `/`, `/learn`,
and `/progress` at 1280×800 and confirm they look exactly as before — dark
green panels, unchanged.

This is the main regression risk of this plan.

**Verify**: screenshots of those three routes; report whether anything shifted.

## Test plan

This is a presentation-only change; automated coverage is thin by nature.

- **Existing tests must stay green**: `npm test` and
  `npm run test:e2e -- play-game.spec.ts`. If any e2e asserts on specific
  colours, STOP and report rather than loosening the assertion.
- **The real test is Step 3 + Step 4** — eight board screenshots (4 felts × 2
  viewports) plus three off-board screenshots.
- No new unit test is warranted: asserting computed CSS colours in jsdom tests
  the stylesheet, not the behaviour, and would break on every future retune.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0, no newly failing tests
- [ ] `npm run test:e2e -- play-game.spec.ts` passes
- [ ] The global `.ds-panel` rule is textually unchanged
- [ ] `git diff --stat` shows only `web/app/globals.css` changed
- [ ] All four felts screenshotted at both viewports; no hue clash on any
- [ ] `/`, `/learn`, `/progress` visually unchanged

## STOP conditions

Stop and report back if:

- `.game-board-scene` is not an ancestor of the discard pool (report what the
  real ancestor chain is).
- Off-board screens change appearance at all.
- Text contrast on `bamboo-mat` cannot be made adequate without reintroducing
  a colour tint.
- An e2e test asserts on specific chrome colours.
- The fix appears to require editing `DiscardPool.tsx` or `tailwind.config.ts`.

## Maintenance notes

- **What interacts with this**: any new felt only needs a `background`; the
  chrome is now hue-neutral and will work automatically. Note that in the felt
  rules comment.
- **What a reviewer should scrutinise**: off-board screens. The scoped selector
  is the whole safety mechanism — if it leaks, every learning screen changes.
- **Related**: this closes finding F1 in `plans/README.md`.
