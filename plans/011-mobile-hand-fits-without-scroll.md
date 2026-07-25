# Plan 011: Make the player's full hand visible on portrait mobile without horizontal scrolling

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/app/globals.css web/components/game/PlayerHand.tsx web/components/game/GameBoard.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

On a 375×812 viewport (iPhone SE/13 mini class, the most common portrait phone
size), the player's 14-tile hand requires **608px** of horizontal space but is
given only **349px**. Only **8 of 14 tiles are fully visible**; the rest are
reachable only by horizontally scrolling the hand row.

Mahjong is a game of hand *shape*. Deciding what to discard requires seeing all
13–14 tiles simultaneously to spot pairs, partial sequences, and isolated tiles.
A hand you must scroll is a hand you cannot evaluate — the player is forced to
hold tile positions in working memory while dragging, on the single most
important decision surface in the product. This is the highest-severity
gameplay defect in the app.

The current behaviour is not an oversight — `app/globals.css` contains a
`.game-hand-scroll` class explicitly documented as a "horizontal scroll
fallback for hands that exceed viewport width on narrow portrait mobile." This
plan replaces that fallback with sizing that makes overflow impossible, because
scrolling is the wrong answer for this particular element.

## Current state

Measured live in a browser at 375×812 on commit `700769d`, training table,
14-tile hand:

```
viewport:            375x812
hand tile count:     14
fully visible tiles: 8
tile width:          32px
hand scroller:       clientWidth 349, scrollWidth 608, overflow 259px
```

### Relevant files

- `web/app/globals.css` — owns the whole tile-sizing system via CSS custom
  properties. Lines ~806–860 define the scale; the mobile override and the
  scroll fallback both live here.
- `web/components/game/PlayerHand.tsx` — renders the human player's hand row.
  It contains **no** width/overflow logic of its own; the only inline style is
  a font-size derived from `--tile-w` (line 91). Sizing is entirely CSS-driven.
- `web/components/game/GameBoard.tsx` — renders `<PlayerHand>` at line ~449
  inside the dock.

### Excerpts as they exist today

`web/app/globals.css:806-820` — the base and board-scoped tile width:

```css
/* Fallback tile scale outside the game board (practice, cosmetics, results). */
:root {
  --tile-base-w: clamp(26px, 4vmin, 52px);
}

/* Centered play area + fluid tiles from container size (width + height). */
.game-board-scene {
  container-type: size;
  container-name: game-board;
  --tile-base-w: clamp(26px, min(5.5cqw, max(4.8cqh, 2.7vw)), 60px);
}
```

`web/app/globals.css:822-836` — the mobile override (this is what produces the
32px tiles):

```css
@media (max-width: 767px) {
  .game-board-scene {
    --tile-base-w: clamp(22px, min(8.5cqw, max(7cqh, 3.6vmin)), 46px);
  }

  .game-board-scene .tile-size-lg {
    --tile-scale: 1;
  }
  ...
}
```

`web/app/globals.css:838-846` — the fallback this plan removes:

```css
.game-hand-scroll {
  /* Horizontal scroll fallback for hands that exceed viewport width on
     narrow portrait mobile. overflow-x: auto keeps the scrollbar hidden
     when the hand fits, and only appears when content overflows. */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
}
```

`web/app/globals.css:848-858` — how an individual tile consumes the width.
Note `flex-shrink: 0`, which is why tiles overflow rather than compress:

```css
.tile-scale-root {
  --tile-w: calc(var(--tile-base-w) * var(--tile-scale, 1));
  --tile-h: calc(var(--tile-w) * 1.5);
  width: var(--tile-w);
  height: var(--tile-h);
  flex-shrink: 0;
}
```

### The core defect

`--tile-base-w` is derived only from *viewport/container dimensions*. It has no
knowledge of **how many tiles must fit**. A hand of 14 tiles and a hand of 8
tiles (after melds) get identically-sized tiles, so the 14-tile case overflows.

### Repo conventions to match

- Tile sizing is expressed as CSS custom properties in `app/globals.css`, not
  as inline styles or Tailwind arbitrary values. Keep it that way.
- The codebase already passes a numeric value from React into CSS via inline
  custom properties — see `web/components/game/PlayerHand.tsx:91`
  (`style={{ fontSize: 'calc(var(--tile-w) * 0.2)' }}`) for the established
  "CSS does the math, React supplies the input" pattern.
- Components are functional, `'use client'`, default-exported. Match the
  existing file style.

## Commands you will need

All commands run from `/Users/justinelrod/Projects/Mahjong-copilot-/web`.

| Purpose   | Command                        | Expected on success       |
|-----------|--------------------------------|---------------------------|
| Typecheck | `npm run typecheck`            | exit 0, no errors         |
| Lint      | `npm run lint`                 | exit 0                    |
| Unit test | `npm test`                     | all pass                  |
| E2E       | `npm run test:e2e -- tile-scaling.spec.ts` | all pass      |
| Dev serve | `npm run dev`                  | serves on localhost:3000  |

## Scope

**In scope** (the only files you should modify):
- `web/app/globals.css`
- `web/components/game/PlayerHand.tsx`
- `web/e2e/tile-scaling.spec.ts` (add a case)

**Out of scope** (do NOT touch, even though they look related):
- `web/components/game/RetroTile.tsx` — the tile renderer is shared by the
  discard pool, melds, opponent hands, results screens and the practice quiz.
  Changing its sizing contract has blast radius far beyond the player hand.
- `web/components/game/DiscardPool.tsx`, `OpponentHand.tsx`, `ExposedMelds.tsx`
  — these legitimately use viewport-derived sizing; they are not overflowing.
- The `--tile-base-w` value itself for non-hand surfaces. Add a *new* variable
  for the hand; do not retune the global scale.
- Any change to `GameBoard.tsx`'s layout structure or the dock's vertical
  space allocation. That is a separate concern (see Maintenance notes).

## Git workflow

- Branch: `feature/mobile-hand-fits` (repo convention is `feature/<description>`
  per `CLAUDE.md`).
- Commit style is conventional commits — see `git log --oneline`, e.g.
  `fix(ui): fluid game board scaling + hand overflow on portrait mobile (#89)`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pass the hand's tile count into CSS

In `web/components/game/PlayerHand.tsx`, find the element that wraps the row of
tile buttons (the flex container whose children are the tiles). Add an inline
custom property carrying the number of tiles currently rendered in that row.

Target shape (adapt to the actual variable names in the file — the tile array
may be called `tiles`, `hand`, or similar):

```tsx
<div
  className="... game-hand-row ..."
  style={{ '--hand-count': tiles.length } as React.CSSProperties}
>
```

Add `game-hand-row` to that container's className. Keep every existing class
except `game-hand-scroll` (removed in Step 3).

The `as React.CSSProperties` cast is required — TypeScript does not allow
arbitrary custom properties on the style object without it.

**Verify**: `npm run typecheck` → exit 0, no errors.

### Step 2: Make hand tiles shrink to fit

In `web/app/globals.css`, add a new rule **after** the `.tile-scale-root` block
(so it wins on specificity order for the hand case only):

```css
/* The hand must always fit on one row — tile width is capped by the space
   available divided by the number of tiles. Unlike every other tile surface,
   the hand's size is a function of tile COUNT, not just viewport size. */
.game-hand-row {
  display: flex;
  justify-content: center;
  --hand-gap: 2px;
  gap: var(--hand-gap);
}

.game-hand-row .tile-scale-root {
  width: min(
    var(--tile-w),
    calc(
      (100% - (var(--hand-count, 14) - 1) * var(--hand-gap))
      / var(--hand-count, 14)
    )
  );
  height: calc(var(--tile-w) * 1.5);
  flex-shrink: 1;
  min-width: 0;
}
```

Two things are load-bearing here:

1. `flex-shrink: 1` and `min-width: 0` override the `flex-shrink: 0` on
   `.tile-scale-root`. Without both, the `width` cap is ignored under flex
   overflow and tiles still spill.
2. `height` stays keyed to `--tile-w`, not to the computed width, so tiles keep
   a consistent height as a row even when the width cap engages. Accept the
   resulting slightly-narrower aspect ratio on the tightest viewports — a
   marginally narrow tile you can see beats a correct-ratio tile you cannot.

**Verify**: `npm run lint` → exit 0.

### Step 3: Remove the horizontal-scroll fallback

In `web/app/globals.css`, delete the entire `.game-hand-scroll` rule quoted in
"Current state".

Then remove the `game-hand-scroll` class from wherever it is applied:

```bash
grep -rn "game-hand-scroll" web/
```

Remove every occurrence in `web/app/` and `web/components/`. If it appears in a
file **not** in this plan's scope, that is a STOP condition.

**Verify**: `grep -rn "game-hand-scroll" web/app web/components` → no matches.

### Step 4: Confirm the fix in a real browser

Start the dev server (`npm run dev`), open `http://localhost:3000/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`,
dismiss the intro dialog, set the viewport to 375×812, and run this in the
browser console:

```js
const btns = [...document.querySelectorAll('button[aria-label^="Mahjong tile"]')];
const visible = btns.filter(b => {
  const r = b.getBoundingClientRect();
  return r.left >= 0 && r.right <= window.innerWidth;
});
({ total: btns.length, fullyVisible: visible.length,
   tileW: Math.round(btns[0].getBoundingClientRect().width) });
```

**Expected**: `total === fullyVisible` (every tile fully on screen), and
`tileW >= 20`.

If `tileW` comes out below 20px, STOP and report — the hand does not fit even
at minimum legibility and this needs a two-row layout decision from the
maintainer rather than an improvised tweak.

### Step 5: Pin the behaviour with an e2e test

`web/e2e/tile-scaling.spec.ts` already exercises tile sizing. Read it first and
match its structure, fixtures, and naming exactly.

Add one test asserting that at 375×812, on the training table, every element
matching `button[aria-label^="Mahjong tile"]` in the player's hand has its right
edge within the viewport width.

Assert the *behaviour* (all tiles fully visible), not a specific pixel width —
a hardcoded tile width would break on the next legitimate scale tweak.

**Verify**: `npm run test:e2e -- tile-scaling.spec.ts` → all pass, including
the new test.

## Test plan

- **New test**: one case in `web/e2e/tile-scaling.spec.ts` — "player hand fits
  within viewport on portrait mobile". Covers the 14-tile case (immediately
  after a draw, the worst case) at 375×812.
- **Structural pattern**: model it on the existing tests in that same file.
- **Regression risk to check manually**: after claiming a meld the hand shrinks
  to 11 or 8 tiles. Confirm tiles grow back toward `--tile-w` rather than
  staying pinned at the 14-tile size — this is what `min()` gives you, and it
  is the reason the count is passed in rather than hardcoded.
- **Verification**: `npm test` → all pass (no unit tests should be affected;
  if any fail, that is a STOP condition, not something to update).

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 with no newly failing tests
- [ ] `npm run test:e2e -- tile-scaling.spec.ts` passes including the new case
- [ ] `grep -rn "game-hand-scroll" web/app web/components` returns no matches
- [ ] Browser check from Step 4: `total === fullyVisible` at 375×812
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code (drift since
  `700769d`).
- `game-hand-scroll` is applied in a file outside this plan's scope.
- The computed tile width at 375×812 falls below 20px — the maintainer needs to
  choose between a two-row hand and a landscape prompt; do not pick one
  yourself.
- Removing `flex-shrink: 0` behaviour for the hand visibly breaks the discard
  pool, opponent hands, or the results screen. That would mean
  `.tile-scale-root` is more entangled than this plan assumes.
- Any unit test starts failing. Do not edit tests to make them pass.

## Maintenance notes

- **What interacts with this**: any future change to `--tile-base-w` in
  `globals.css` now has a second consumer with different semantics. The hand
  caps that value; every other surface uses it directly.
- **What a reviewer should scrutinise**: that `flex-shrink: 1` + `min-width: 0`
  were added together (either alone silently fails), and that `--hand-count`
  reflects tiles *in that row* — if the hand row ever renders melds inline, the
  count must include them or the cap will be computed against the wrong total.
- **Deliberately deferred**: the vertical-space imbalance on mobile. An *empty*
  discard pool currently occupies roughly 40% of the 812px viewport while the
  hand is squeezed against the bottom edge. Rebalancing the dock is a larger
  layout change and is intentionally not in this plan — fixing the horizontal
  clipping is the load-bearing fix and is independently shippable.
- **Also deferred**: tile touch targets are ~32px wide, below the 44px iOS /
  48px Android minimum, and this plan makes them narrower still. Tap accuracy
  is partly mitigated because tiles are ~48px tall. If mis-taps are reported,
  the fix is an invisible expanded hit area (`::after` inset overlay), not
  larger tiles.
