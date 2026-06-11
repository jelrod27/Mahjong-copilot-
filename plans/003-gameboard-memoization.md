# Plan 003: Memoize game-board hot-path components and stabilize inline props

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/components/game/GameBoard.tsx web/components/game/PlayerHand.tsx web/components/game/DiscardPool.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

`GameBoard.tsx` re-renders on every game-state tick (every draw, discard, claim, AI
action). The leaf tile component `RetroTile` is memoized, but the containers between
it and GameBoard — `PlayerHand` and `DiscardPool` — are plain function components, so
every board render re-renders the full human hand (13-14 tiles with FLIP animation
bookkeeping) and the entire discard pool even when their data did not change.
GameBoard also constructs a fresh `playerNames` object inline on every render, which
would defeat memoization of `DiscardPool` even after it is added. This is a small,
low-risk change with visible effect during AI turns (3 of every 4 turns).

## Current state

- `web/components/game/PlayerHand.tsx:17` — plain export, narrow props:

  ```ts
  export default function PlayerHand({
    tiles, selectedTileId, suggestedTileId, onTileSelect, lastDrawnTileId,
    disabled = false, tileClassifications,
  }: PlayerHandProps) {
  ```

  It uses `useRef` + `useLayoutEffect` for FLIP animation keyed on
  `orderSig = tiles.map(t => t.id).join('|')` — memoization does not interfere with
  that (the effect only needs to run when tiles actually change).

- `web/components/game/DiscardPool.tsx:89` — plain export:

  ```ts
  export default function DiscardPool({
    discards, lastDiscardedTile, claimHighlight,
    playerDiscards, playerNames,
  }: DiscardPoolProps) {
  ```

- `web/components/game/GameBoard.tsx:282-288` — the inline-object prop:

  ```tsx
  <DiscardPool
    discards={gameState.discardPile}
    lastDiscardedTile={gameState.lastDiscardedTile}
    claimHighlight={showClaimHighlight}
    playerDiscards={gameState.playerDiscards}
    playerNames={Object.fromEntries(gameState.players.map(p => [p.id, p.name]))}
  />
  ```

- `web/components/game/GameBoard.tsx:419` — the `<PlayerHand` call site.
- `web/components/game/OpponentSeat.tsx` is **deliberately NOT in scope**: it takes the
  whole `gameState` as a prop (OpponentSeat.tsx:27), so `memo()` would never bail out;
  narrowing its props is a larger refactor (its `useNpcEmotion` hook consumes
  gameState) and is deferred.
- Convention: components in this directory are function components with default
  exports; `RetroTile.tsx` already uses `memo` (see `RetroTile.tsx:164` area) — match
  its style.

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Build | `npm run build` | exit 0 |
| E2E smoke (optional, if Playwright browsers installed) | `npx playwright test e2e/beginner-smoke.spec.ts` | passes |

## Scope

**In scope** (the only files you should modify):
- `web/components/game/PlayerHand.tsx`
- `web/components/game/DiscardPool.tsx`
- `web/components/game/GameBoard.tsx` (ONLY the `playerNames` line and, if needed, a `useMemo` import)

**Out of scope** (do NOT touch):
- `web/components/game/OpponentSeat.tsx` — memo is useless with a whole-gameState prop (see above).
- `web/components/game/RetroTile.tsx` — already memoized.
- `web/components/game/useGameController.ts` — covered by other plans.
- Any behavioral/visual change — this is identity-stability only.

## Git workflow

- Branch: `feature/gameboard-memoization`
- Commit message style: `perf(game): memoize PlayerHand/DiscardPool and stabilize playerNames prop`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Memoize PlayerHand

In `PlayerHand.tsx`: import `memo` from `react`, convert the default export to a named
function wrapped at export:

```ts
function PlayerHand({ ... }: PlayerHandProps) { ... }
export default memo(PlayerHand);
```

Do not add a custom comparator — shallow compare is correct here (all props are
primitives, stable callbacks, or arrays/Maps whose identity changes exactly when
their content changes).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Memoize DiscardPool

Same `memo()` treatment in `DiscardPool.tsx`. Note its internal
`useDiscardAnimation(discards)` hook keys off the `discards` array — memo only skips
renders when `discards` identity is unchanged, so animation behavior is unaffected.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Stabilize playerNames in GameBoard

In `GameBoard.tsx`, hoist the inline object into a `useMemo` near the top of the
component (with the other hooks — find the existing hook block):

```ts
const playerNames = useMemo(
  () => Object.fromEntries(gameState.players.map(p => [p.id, p.name])),
  [gameState.players],
);
```

and pass `playerNames={playerNames}` at line ~287. (`gameState.players` is an
acceptable dep: names never change mid-hand, and player-array identity changes far
less often than render frequency.)

**Verify**: `grep -n "Object.fromEntries(gameState.players" web/components/game/GameBoard.tsx` inside the JSX → no matches (only the useMemo remains).

### Step 4: Full verification

**Verify**, in order:
- `npm test` → exit 0 (component tests in `components/game/__tests__/` still pass)
- `npm run lint` → exit 0
- `npm run build` → exit 0
- Optional: run the e2e smoke spec if browsers are installed; skip with a note otherwise.

## Test plan

No new tests — memoization is identity-preserving and not meaningfully unit-testable
without render-count instrumentation. The existing component suite
(`components/game/__tests__/`) plus build/e2e smoke is the regression net. If any
existing test fails after memoization, that is a STOP condition (it implies a
hidden render-frequency dependency), not something to patch around.

## Done criteria

- [ ] `grep -n "export default memo(PlayerHand)" web/components/game/PlayerHand.tsx` → 1 match
- [ ] `grep -n "export default memo(DiscardPool)" web/components/game/DiscardPool.tsx` → 1 match
- [ ] No inline `Object.fromEntries` in GameBoard JSX (step 3 grep)
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all exit 0
- [ ] `git status` shows only the three in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any existing test fails after adding `memo` — report which component and which test.
- The FLIP animation logic in PlayerHand has changed from the excerpt (the
  `orderSig`-keyed `useLayoutEffect`) — re-evaluate whether memo interacts with it.
- You feel the urge to memoize OpponentSeat or refactor its props — that is explicitly
  deferred; report instead.

## Maintenance notes

- If new props are added to PlayerHand/DiscardPool, they must be identity-stable
  (no inline objects/arrays/closures at the GameBoard call sites) or memo silently
  stops helping. Reviewer should check the call sites, not just the components.
- OpponentSeat remains unmemoized by design; the follow-up (deferred) is narrowing its
  `gameState` prop to the specific fields `useNpcEmotion` needs.
