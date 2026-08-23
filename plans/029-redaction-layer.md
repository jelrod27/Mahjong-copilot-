# Plan 029: Redaction layer — a client may only be sent what its seat can see

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 35a2076..HEAD -- web/models/GameState.ts web/models/Tile.ts web/engine/turnManager.ts web/components/game/OpponentHand.tsx`
> Every "Current state" excerpt below was verified at `35a2076`. On a mismatch,
> re-verify before relying on the excerpt.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED — new module is additive, but the `Tile` placeholder shape is
  consumed by every renderer
- **Depends on**: none (independently shippable; improves solo on its own)
- **Category**: security / direction
- **Planned at**: commit `35a2076`, 2026-08-23
- **Architecture**: `plans/027-multiplayer-architecture.md`

## Why this matters

`GameState` carries the full wall in draw order and all four hands. Sending it
to a browser is not a partial leak, it is the whole game. Nothing online can
ship until a seat can be handed a view containing only what it may know.

**The leak is already live in solo.** `web/components/game/OpponentHand.tsx`
builds its face-down tiles as:

```tsx
tile={player.hand[i] || { id: `ph-${i}`, suit: 'dot' as any, ... }}
```

The **real tile** is passed to `RetroTile`, which draws the back of it. Every
opponent's hand is readable from the React tree today, hidden by CSS rather than
by absence. Under this plan that component becomes correct with **no change** —
the tile it receives is already a placeholder.

## Current state (verified at `35a2076`)

- `web/models/GameState.ts` — `GameState.wall`, `.deadWall`, and
  `players[].hand` hold real `Tile` objects. `gameStateToJson` serialises all of
  them.
- `web/engine/turnManager.ts:201` — `const gameId = \`game_${seed}\`;`
  **The state id contains the seed**, and the seed determines the entire
  shuffle. Redacting the hands while shipping the id leaks everything anyway.
  This is the least obvious target in this plan.
- `web/engine/turnManager.ts:387` — the **only** push to `turnHistory`, and its
  action is always `PlayerAction.DISCARD`. History therefore holds public
  information only and needs no redaction. Verify this still holds:
  `grep -n "turnHistory: \[" web/engine/turnManager.ts` must return one line.
- `web/models/Tile.ts` — `Tile` requires `id`, `suit`, `type`, `nameEnglish`,
  `nameChinese`, `nameJapanese`, `assetPath`. `TileSuit`/`TileType` have no
  "unknown" member.
- `web/engine/rng.ts` — `randomSeed()` is `Math.random()`-derived. Fine for
  solo, guessable for competitive play. `plans/spikes/replay-format-design.md`
  §4 specifies the replacement.

## What a seat may know

| Field | Treatment during play |
|---|---|
| `seed` | dropped |
| `id` | replaced — it embeds the seed |
| `wall`, `deadWall` | placeholders, **length preserved** |
| `players[i].hand`, `i !== viewer` | placeholders, **length preserved** |
| `lastDrawnTile` | dropped unless the viewer drew it |
| `pendingClaims[].tiles` for other claimants | emptied — the tiles a rival commits reveal their hand mid-window |

Public and untouched: `discardPile`, `playerDiscards`, `melds`, `flowers`,
`score`, `seatWind`, `turnPhase`, `currentPlayerIndex`, `claimablePlayers`,
`passedPlayers`, `turnHistory`.

Lengths are preserved deliberately: wall count and opponent hand size are
legitimately public at a real table, and the UI renders both.

**At `phase === FINISHED` the state is returned whole, seed included.** That is
the reveal-at-hand-end decision in `docs/adr/0003-simultaneous-claim-window.md`
and `plans/027`: once the hand is over, all four players can replay it against
the pure engine and verify the deal was never manipulated. It also keeps the
existing post-hand review and scoring screens working unchanged.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Unit tests | `cd web && npx vitest run engine/__tests__/redaction.test.ts` | passes |
| Full suite | `cd web && npm test` | exit 0 |
| Types | `cd web && npm run typecheck` | 0 errors |
| Lint | `cd web && npm run lint` | 0 errors |
| Build | `cd web && npm run build` | compiles |

## Scope

**In scope:**
- `web/engine/redaction.ts` (create)
- `web/engine/__tests__/redaction.test.ts` (create)
- `web/models/Tile.ts` (add the hidden-tile factory and predicate)
- `web/engine/rng.ts` (CSPRNG seed — §4 of the replay spike)
- `web/engine/index.ts` (export the new surface)

**Out of scope — do not touch:**
- Any transport, Worker, or room code. This plan ships a pure function.
- `OpponentHand.tsx` and every other renderer. If the placeholder shape is
  right they need no change, and that is the point.
- `useGameController`. Solo continues to hold unredacted state; redaction is
  applied at the seam a server will own.

## Steps

### Step 1: Hidden-tile factory and predicate

In `web/models/Tile.ts`, add `HIDDEN_TILE_ID_PREFIX = 'hidden_'`, a
`hiddenTile(key: string): Tile` factory, and `isHiddenTile(tile: Tile): boolean`
keyed off the id prefix.

The factory must produce a **stable** id per slot (`hidden_wall_0`,
`hidden_seat1_3`) so React keys do not thrash between renders, and
`nameEnglish: 'Hidden'` so a placeholder that leaks into a label reads as one
rather than impersonating a real tile.

`TileSuit`/`TileType` have no unknown member and adding one would touch every
exhaustive switch in the engine — out of proportion here. Pick concrete values,
and rely on `isHiddenTile` plus the id prefix for identity.

**Verify**: a test asserts `TileFactory.getAllTiles()` contains no id starting
with `HIDDEN_TILE_ID_PREFIX`, so a placeholder can never collide with a real
tile.

### Step 2: `redactFor` and the branded type

Create `web/engine/redaction.ts`:

```ts
declare const redacted: unique symbol;
export type RedactedState = GameState & { readonly [redacted]: true };

export function redactFor(state: GameState, viewerSeat: number): RedactedState;
```

Implement the table above. The brand must be unforgeable from outside the
module: only `redactFor` may produce a `RedactedState`, so a transport typed to
accept one cannot be handed raw state. Note the brand is a **compile-time**
guarantee only — it does not survive `JSON.stringify`, and it is not a runtime
check.

**Verify**: `npm run typecheck` clean, and assigning a bare `GameState` to a
`RedactedState` is a compile error.

### Step 3: Tests that actually try to cheat

`web/engine/__tests__/redaction.test.ts`. Write these as an attacker would:

1. **No real opponent tile survives anywhere.** Play a hand to mid-game, redact
   for seat 0, then walk the *entire serialised* view
   (`JSON.stringify(gameStateToJson(view))`) and assert that no tile id held by
   seats 1–3, and no tile id in the wall or dead wall, appears in the string.
   This is the test that matters: it catches leaks through fields nobody
   thought to enumerate.
2. **The seed does not survive**, and neither does the id that embeds it.
3. **Lengths are preserved** — `wall.length`, `deadWall.length`, and every
   `players[i].hand.length` match the source.
4. **The viewer's own hand is intact**, tile for tile.
5. **Public state is untouched** — discards, melds, flowers, scores, winds.
6. **`pendingClaims` tiles are hidden for rivals but kept for the viewer.**
7. **A finished hand is returned whole**, seed included.
8. **Redaction is pure** — the source state is not mutated (deep-equal it
   against a snapshot taken before the call).

### Step 4: CSPRNG seed

Replace the body of `randomSeed()` in `web/engine/rng.ts` per
`plans/spikes/replay-format-design.md` §4, using the global `crypto`
(`crypto.getRandomValues`) — available in browsers, Node 18+, Workers. Do not
add an import; `rng.ts` must stay dependency-free.

Nothing else in `rng.ts` changes. `initializeGame` already threads the seed.

**Verify**: full suite green — the deterministic tests all pass an explicit
seed, so only the unseeded path changes.

### Step 5: Export and confirm the leak is closed

Export `redactFor`, `RedactedState`, `isHiddenTile` from `web/engine/index.ts`.

Then confirm the original motivation: write a test that redacts a state for
seat 0 and asserts `players[1].hand` contains only tiles satisfying
`isHiddenTile`, i.e. exactly what `OpponentHand` would now render.

## Test plan

- `npx vitest run engine/__tests__/redaction.test.ts` — all cases above
- `npm test` — full suite, no regressions
- `npm run typecheck`, `npm run lint`, `npm run build`
- Playwright is not required: no rendered behaviour changes in solo.

## Done criteria

1. `redactFor` exists, is pure, and returns `RedactedState`.
2. The serialised-view test finds no opponent tile, no wall tile, and no seed.
3. Array lengths preserved; viewer's own hand intact; public state untouched.
4. A finished hand returns whole, seed included.
5. `randomSeed()` uses `crypto.getRandomValues`.
6. Full suite, typecheck, lint and build all clean.
7. No renderer changed.

## STOP conditions

- **Redaction requires changing a renderer.** If any component must change to
  cope with placeholders, the placeholder shape is wrong. Stop and report —
  fixing `OpponentHand` by construction is the whole thesis.
- **A `TileSuit`/`TileType` enum member is needed.** That touches exhaustive
  switches across the engine and is a bigger decision than this plan. Stop.
- **The serialised-view test cannot be made to pass** because a leak lives in a
  field this plan did not enumerate. Stop and report the field — the table above
  is wrong and needs amending before code proceeds.
- **`crypto.getRandomValues` is unavailable** in any target runtime under test.
  Stop rather than adding a polyfill or an import.

## Maintenance notes

Redaction is a **projection, not a filter**: it never removes fields, only
replaces their contents, so every consumer keeps working on shape. If a future
field carries secret information, it must be added to the table above — the
serialised-view test in Step 3 is what makes that failure loud instead of
silent.
