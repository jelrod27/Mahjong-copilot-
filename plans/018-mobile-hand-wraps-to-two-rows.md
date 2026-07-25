# Plan 018: Wrap the player's hand to two rows on portrait mobile

> **Supersedes plan 011**, which is BLOCKED. Read "Why 011 failed" below before
> starting — it documents the real DOM and will stop you repeating the mistake.
>
> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/app/globals.css web/components/game/PlayerHand.tsx web/components/game/GameBoard.tsx`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Supersedes**: plan 011 (BLOCKED — wrong approach, see below)
- **Category**: bug
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

At 375×812 (the most common portrait phone size), the player's 14-tile hand
needs **608px** of horizontal space and is given **349px**. Only **8 of 14
tiles are fully visible**; the rest require horizontally scrolling the hand.

Mahjong is a game of hand *shape*. Choosing a discard means seeing all 13–14
tiles at once to spot pairs, partial sequences, and isolated tiles. A hand you
must scroll is a hand you cannot evaluate. This is the highest-severity
gameplay defect in the app.

## Why 011 failed — read this first

Plan 011 tried to shrink tiles so 14 fit on one row. It assumed
`.tile-scale-root` was the direct flex child of the hand row. **It is not.**
The real DOM, confirmed in `web/components/game/PlayerHand.tsx:59-99`:

```tsx
<div
  ref={containerRef}
  className="flex min-w-min flex-nowrap items-end justify-center gap-px px-1 sm:gap-0.5"
>
  {tiles.map((tile) => {
    ...
    return (
      <div
        key={tile.id}
        className={`shrink-0 ${isLastDrawn ? 'ml-1 sm:ml-3' : ''}`}
        data-testid="human-hand-tile"
        data-flight-tile={tile.id}
      >
        <RetroTile tile={tile} size="lg" ... />
        {tutorLabel && (
          <div
            className="mt-0.5 text-center font-sans text-muted-foreground"
            style={{ fontSize: 'calc(var(--tile-w) * 0.2)' }}
            aria-hidden="true"
          >
            {tutorLabel}
          </div>
        )}
      </div>
    );
  })}
</div>
```

Three reasons the 011 approach cannot work:

1. **The flex item is the `shrink-0` wrapper `<div>`, not `.tile-scale-root`.**
   Putting `flex-shrink: 1` on `.tile-scale-root` does nothing to the row,
   because the wrapper keeps Tailwind's `shrink-0`.
2. **The row has `min-w-min` and `flex-nowrap`**, which force it to at least
   min-content width and forbid wrapping.
3. **The wrapper also contains the tutor label** ("GOOD"/"OK"/"KEEP"), which
   has its own intrinsic text width. Even when the tile shrank, the label held
   the wrapper open.

Measured result of the 011 attempt at 375×812: tile width collapsed to **2px**
while the wrapper stayed at **39px**, and the row still overflowed to 610px —
**0 of 14 tiles fully visible**, strictly worse than before.

Do not retry the shrink-to-fit approach. Even if the CSS were corrected, 14
tiles in 349px yields ~23px per tile, which is below the existing 22px clamp
floor and far below any reasonable touch target.

## The approach this plan takes instead

**Let the hand wrap to two rows on narrow portrait.** Roughly 7 tiles per row
at ~48px each — comfortably readable, above touch-target minimums, and vastly
simpler CSS than percentage math. The vertical space exists: an *empty* discard
pool currently occupies about 40% of the 812px viewport.

The change is essentially: stop forbidding wrapping on small screens.

## Current state

### Files

- `web/components/game/PlayerHand.tsx` — the hand row (excerpt above). The row
  container is at line 59-63.
- `web/app/globals.css` — tile sizing system. `.game-hand-scroll` (the scroll
  fallback being removed) is at lines ~838-846:

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

- `web/components/game/GameBoard.tsx:~448` — applies `game-hand-scroll` to the
  hand wrapper. **This file IS in scope** for that one class removal (011's
  executor correctly identified that the removal is impossible otherwise).

### Mobile tile sizing — `web/app/globals.css:822-826`

```css
@media (max-width: 767px) {
  .game-board-scene {
    --tile-base-w: clamp(22px, min(8.5cqw, max(7cqh, 3.6vmin)), 46px);
  }

  .game-board-scene .tile-size-lg {
    --tile-scale: 1;
  }
```

Measured `--tile-w` at 375px today: **32px**. With wrapping, tiles no longer
need to be this small — Step 3 raises the floor.

### Conventions

- Tile sizing lives in `web/app/globals.css` as CSS custom properties, not
  inline styles or Tailwind arbitrary values.
- The row's Tailwind classes are authored in `PlayerHand.tsx`. Changing
  `flex-nowrap` there is the natural place, not a CSS override.

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web` (or the `web/`
subdirectory of your worktree).

| Purpose   | Command                                     | Expected |
|-----------|---------------------------------------------|----------|
| Install   | `npm install`                               | exit 0   |
| Typecheck | `npm run typecheck`                         | exit 0   |
| Lint      | `npm run lint`                              | exit 0   |
| Unit test | `npm test`                                  | all pass |
| E2E       | `npm run test:e2e -- tile-scaling.spec.ts`  | all pass |

## Scope

**In scope**:
- `web/components/game/PlayerHand.tsx`
- `web/app/globals.css`
- `web/components/game/GameBoard.tsx` — **only** to remove the
  `game-hand-scroll` class token and its now-stale comment. No layout or
  structural changes.
- `web/e2e/tile-scaling.spec.ts`

**Out of scope**:
- `web/components/game/RetroTile.tsx` — shared by the discard pool, melds,
  opponent hands, results screens and the practice quiz. Do not touch.
- `DiscardPool.tsx`, `OpponentHand.tsx`, `ExposedMelds.tsx`.
- The dock's vertical space allocation / the discard pool's height. Real
  problem, separate change.
- `--tile-base-w` for non-hand surfaces.

## Git workflow

- Branch: `feature/mobile-hand-wrap`
- Conventional commits, e.g. `fix(ui): wrap player hand to two rows on portrait mobile`
- Do NOT push or open a PR.

## Steps

### Step 1: Allow the hand row to wrap on small screens

In `web/components/game/PlayerHand.tsx`, change the row container's className
(line ~61) so it wraps below the `sm` breakpoint and keeps single-row
behaviour above it.

Current:
```
flex min-w-min flex-nowrap items-end justify-center gap-px px-1 sm:gap-0.5
```

Target shape — wrap by default, no-wrap from `sm` up, and drop `min-w-min`
(which forces min-content width and defeats wrapping):
```
flex flex-wrap sm:flex-nowrap items-end justify-center gap-px gap-y-1 px-1 sm:min-w-min sm:gap-0.5
```

Add `game-hand-row` to the className as well — Step 3 uses it as a hook.

Note `items-end` still applies per flex line, which is what you want: tiles in
each row sit on a common baseline.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Remove the horizontal-scroll fallback

Delete the `.game-hand-scroll` rule from `web/app/globals.css` (quoted in
Current state).

Remove the `game-hand-scroll` class from `web/components/game/GameBoard.tsx`
(~line 448) and update the stale comment on that line.

```bash
grep -rn "game-hand-scroll" web/
```

If it appears anywhere besides `globals.css`, `GameBoard.tsx`, and
`e2e/tile-scaling.spec.ts`, STOP and report.

**Verify**: `grep -rn "game-hand-scroll" web/app web/components` → no matches.

### Step 3: Let tiles use the space wrapping freed up

With two rows, tiles no longer need to be 32px. In `web/app/globals.css`, raise
the mobile floor and ceiling:

⚠️ Scope this to the hand row, **not** `.game-board-scene`. `--tile-base-w` is
inherited, so setting it on the scene enlarges every tile surface on the board
— discard pool, opponent hands, melds, results — when only the hand wraps.
(The first execution of this plan made exactly that mistake; non-hand tiles
grew ~28% and the discard panel swelled to 37% of the mobile viewport.)

```css
@media (max-width: 767px) {
  /* Leave .game-board-scene's --tile-base-w alone. */
  .game-hand-row {
    /* Hand wraps to two rows on narrow portrait (PlayerHand.tsx), so tiles
       no longer have to fit 14-across. Bigger tiles, comfortable touch.
       Scoped to the hand — the pool and opponent seats keep their size. */
    --tile-base-w: clamp(30px, min(11cqw, max(7cqh, 3.6vmin)), 52px);
  }
}
```

Tune the `11cqw` and the clamp bounds by eye in Step 4 — the target is roughly
7 tiles per row at 375px with tiles at or above 44px where possible.

**Verify**: `npm run lint` → exit 0.

### Step 4: Measure it in a real browser

**Worktree dev-server note**: `.claude/launch.json` points at the *main repo's*
`web/`, not your worktree, so `preview_start({name:"web-dev"})` would serve
stale code. Start your own server from your worktree instead:

```bash
cd web && npx next dev -p 3110
```

then `preview_start({url: "http://localhost:3110"})`.

**Browser-pane contention note**: the Browser pane may be shared with other
concurrent agents. Before every measurement, confirm you are on your own server:

```js
window.location.href   // must start with http://localhost:3110
```

If it has been navigated away, open a fresh tab and re-navigate.

Navigate to
`http://localhost:3110/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`,
dismiss the intro dialog, set the viewport to 375×812, then run:

```js
const btns = [...document.querySelectorAll('button[aria-label^="Mahjong tile"]')];
const visible = btns.filter(b => {
  const r = b.getBoundingClientRect();
  return r.left >= 0 && r.right <= window.innerWidth
      && r.top >= 0 && r.bottom <= window.innerHeight;
});
const rows = new Set(btns.map(b => Math.round(b.getBoundingClientRect().top)));
({ total: btns.length,
   fullyVisible: visible.length,
   rowCount: rows.size,
   tileW: Math.round(btns[0].getBoundingClientRect().width) });
```

**Expected**: `total === fullyVisible`, `rowCount` is 1 or 2, and `tileW >= 30`.

Also take a screenshot and look at it. Confirm the hand reads as a hand — tiles
grouped, labels legible, nothing clipped by the viewport bottom.

If `fullyVisible < total` because tiles are clipped **vertically** (cut off at
the bottom of the screen), that is the dock height problem, not a wrapping
problem — STOP and report it, since fixing dock vertical allocation is
explicitly out of scope.

### Step 5: Pin it with an e2e test

Read `web/e2e/tile-scaling.spec.ts` first and match its structure and fixtures.

Note: an existing test in that file references `.game-hand-scroll`. Since Step
2 removes that class, update that existing assertion — this is expected, not
scope creep.

Add one test: at 375×812 on the training table, every
`button[aria-label^="Mahjong tile"]` in the player's hand has its right edge
within the viewport width. Assert the behaviour (all tiles visible), never a
specific pixel width.

**Verify**: `npm run test:e2e -- tile-scaling.spec.ts` → all pass.

## Test plan

- **New test**: "player hand is fully visible on portrait mobile" in
  `web/e2e/tile-scaling.spec.ts`, covering the 14-tile case at 375×812.
- **Updated test**: the existing `.game-hand-scroll` reference in that file.
- **Manual regression**: after claiming a meld the hand drops to 11 or 8 tiles.
  Confirm it collapses back to a single row and does not leave an empty second
  row.
- **Desktop regression**: at 1280×800 the hand must still be one row —
  `sm:flex-nowrap` guarantees this, but verify it.
- **Verify**: `npm test` → all pass. Any unit-test failure is a STOP condition,
  not something to edit away.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0, no newly failing tests
- [ ] `npm run test:e2e -- tile-scaling.spec.ts` passes including the new case
- [ ] `grep -rn "game-hand-scroll" web/app web/components` → no matches
- [ ] Browser check: `total === fullyVisible` at 375×812, `tileW >= 30`
- [ ] Desktop 1280×800 still renders the hand on one row
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

Stop and report back if:

- The `PlayerHand.tsx` row container className does not match the excerpt above.
- `game-hand-scroll` appears in a file outside the three named.
- Tiles are clipped **vertically** by the dock after wrapping (out-of-scope
  fix — report the measurement).
- Wrapping breaks the tile-flight animation such that tiles visibly fly from
  wrong positions (`TileFlightLayer` caches rects; report what you observe).
- Any unit test fails.

## Maintenance notes

- **What interacts with this**: `TileFlightLayer` measures `[data-flight-tile]`
  rects live, so wrapping should be transparent to it — but it is the most
  likely place for a subtle regression. Worth a reviewer's attention.
- **What a reviewer should scrutinise**: the `sm:` breakpoint choice. Wrapping
  below `sm` and not above assumes tablets have room for one row; verify at
  768px.
- **Deliberately deferred**: the dock's vertical space imbalance (empty discard
  pool taking ~40% of the mobile viewport). Wrapping consumes some of the
  freed-up space, making that rebalance more valuable, not less.
