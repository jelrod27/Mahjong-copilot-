# Plan 028: Simultaneous claim window — prompt everyone eligible, wait for no one else

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Read first**: `docs/adr/0003-simultaneous-claim-window.md`. It records a
> deliberately accepted information leak. Do not "improve" the timing behaviour
> without reading it.
>
> **Drift check (run first)**: `git diff --stat 630ba76..HEAD -- web/engine/turnManager.ts web/components/game/aiTurnRunner.ts web/components/game/useGameController.ts web/components/game/GameBoard.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM (core state machine + AI orchestration; plan 013 documented
  several wedge bugs in exactly this code)
- **Depends on**: none
- **Category**: correctness / direction
- **Planned at**: commit `630ba76`, 2026-08-22
- **Part of**: `plans/027-multiplayer-architecture.md`

## Why this matters

The claim window is a **sequential poll**. After a discard, the engine rotates
`currentPlayerIndex` through claimants one at a time and rejects anyone whose
turn it is not. Worse, it waits for **every** non-discarder to act, including
players with no legal claim at all.

Against instant AI this is invisible. Against three humans it is up to three
consecutive decision windows per discard, and it forces two people with nothing
to do to tap "pass" before play can resume. That makes it a hard blocker for
`plans/027-multiplayer-architecture.md`.

It is worth doing on its own merits regardless of whether multiplayer follows:

- It deletes a class of wedge bug. Because the engine demands a `PASS` from
  players who cannot claim, the controller has to synthesise one — the retrying
  `forcePass()` machinery at `useGameController.ts:1030-1045` exists to stop a
  single rejected auto-pass from wedging the hand forever. Stop asking for the
  pass and most of that pressure goes away.
- The human's claim window currently opens only once the rotation reaches their
  seat, not when the discard happens.
- It removes dead code that already states the correct intent.

## Current state (verified at `630ba76`)

### The dead line that names the right behaviour

`web/engine/turnManager.ts:373-382`:

```ts
// Check if any other player can claim
const claims = getAllClaims(state, playerIndex, tile, newPlayers);

// Only include players who actually have claims available
const claimableIds = claims.length > 0
  ? claims.map(c => c.playerId)
  : [];

// All non-discarder players need to act during claim phase (claim or pass)
const allNonDiscarderIds = claims.length > 0
  ? getClaimablePlayerIds(playerIndex, newPlayers)
  : [];
```

`claimableIds` is assigned and never read — confirm with
`grep -n "claimableIds" web/engine/turnManager.ts`, which returns exactly one
line. `claimablePlayers` receives `allNonDiscarderIds` at `:395`.

### The rotation guards

- `handleClaim` — `web/engine/turnManager.ts:554`: `if (state.currentPlayerIndex !== playerIndex) return null;`
- `handlePass` — `web/engine/turnManager.ts:778`: `if (state.currentPlayerIndex !== playerIndex) return null;`
- `advanceClaimRound` — `web/engine/turnManager.ts:725-750` sets
  `currentPlayerIndex: nextClaimantIndex(...)` while waiting for the rest.
- `nextClaimantIndex` — `web/engine/turnManager.ts:703`.

`advanceClaimRound` already computes the correct membership test:

```ts
const actedPlayerIds = new Set([
  ...opts.passedPlayers,
  ...opts.pendingClaims.map(c => c.playerId),
]);
```

### What is already correct and must not be touched

`resolveClaimRequests` (`web/engine/claiming.ts:220`) resolves priority over a
set of claims with no notion of arrival order, with the HK turn-order tie-break.
It needs no change, and it is the reason this conversion is safe.

### Claim-phase consumers of `currentPlayerIndex` outside the engine

These are the only ones not already guarded on `turnPhase === 'discard'`:

- `web/components/game/aiTurnRunner.ts:112-127` — the AI claim branch reads
  `getLegalClaims(live, live.currentPlayerIndex)` and
  `getAIClaimDecision(live, live.currentPlayerIndex, claims)` while applying as
  `player.id`. Those are the same seat only because the rotation guarantees it.
- `web/components/game/useGameController.ts:495` — `submitClaim` guard.
- `web/components/game/useGameController.ts:1020` — claim-timer tick guard,
  with a comment explaining that retrying off-turn can never succeed.
- `web/components/game/GameBoard.tsx:166` — `isMyClaimTurn`, derived from
  `isHumanTurn`, with a comment describing the sequential rotation.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Engine tests | `cd web && npx vitest run engine/__tests__/turnManager.test.ts engine/__tests__/claiming.test.ts` | pass |
| Controller tests | `cd web && npx vitest run components/game/__tests__` | pass |
| Full suite | `cd web && npm test` | exit 0 |
| Types | `cd web && npm run typecheck` | exit 0 |
| Lint | `cd web && npm run lint` | exit 0 |
| Dead code gone | `grep -rn "nextClaimantIndex\|claimableIds\|getClaimablePlayerIds" web/engine/turnManager.ts` | only intended matches |

## Scope

**In scope (edit):**
- `web/engine/turnManager.ts`
- `web/components/game/aiTurnRunner.ts`
- `web/components/game/useGameController.ts`
- `web/components/game/GameBoard.tsx`
- `web/engine/__tests__/turnManager.test.ts`
- `web/components/game/__tests__/` — existing specs that assert rotation

**Explicitly out of scope:**
- `web/engine/claiming.ts` — already order-independent.
- The **uniform pacing floor**. ADR 0003 mitigates the timing leak with a short
  floor before the next draw, but that only matters when opponents are human.
  Adding it to solo would cost roughly 45 seconds a hand for no benefit. It
  belongs to the online client work (plan 033), not here.
- The glossary defects at `web/content/glossary.ts:33` and `:41` (noted in
  plan 027).
- Any server, transport, or redaction work.

## Git workflow

Branch `feature/simultaneous-claim-window` off `main`. Conventional commits
(`fix(engine): ...`, `refactor(game): ...`).

## Steps

### Step 1: Make `claimablePlayers` mean "eligible"

In `handleDiscard`, delete `allNonDiscarderIds` and assign `claimableIds` to
`claimablePlayers`. Delete `getClaimablePlayerIds` if nothing else calls it
(`:503` also calls it — check that call site first and convert it the same way
if it is the rob-the-kong window; a rob-kong window is win-only, so its
eligible set is players who can win on that tile).

**Verify**: `npx vitest run engine/__tests__/turnManager.test.ts` — expect
failures asserting the old membership. Read each before changing it.

### Step 2: Replace the rotation guards with an eligibility test

In `handleClaim` and `handlePass`, replace
`if (state.currentPlayerIndex !== playerIndex) return null;` with a check that
the player is in `state.claimablePlayers` and has not already acted (present in
neither `passedPlayers` nor `pendingClaims`). Extract that as a small named
helper so both call sites share one definition.

**Verify**: `npm run typecheck` clean.

### Step 3: Stop rotating during the claim window

In `advanceClaimRound`, remove the `currentPlayerIndex: nextClaimantIndex(...)`
assignment from the not-yet-all-acted branch. `handleDiscard` already sets
`currentPlayerIndex` to the next drawer at `:396`, and the all-passed branch
sets the same value — so leaving it alone is consistent throughout the window.
Delete `nextClaimantIndex`.

**Invariant to preserve**: during `turnPhase === 'claim'`, `currentPlayerIndex`
is the seat that will draw if every claim is declined. It is **not** a claimant.

**Verify**: `npx vitest run engine/__tests__/turnManager.test.ts`.

### Step 4: Fan the AI claim decision out per seat

`startAiTurn` currently infers the seat from `currentPlayerIndex`. Give the
claim branch an explicit seat index and use it for both `getLegalClaims` and
`getAIClaimDecision`, so it can no longer silently disagree with `player.id`.

In `useGameController`, the AI effect (`:875-919`) must, during a claim window,
schedule a decision for **every** AI seat in `claimablePlayers` that has not yet
acted — not just the seat at `currentPlayerIndex`. Keep the existing
`claimDelayMs` stagger so claims do not all land in the same tick.

**Verify**: `npx vitest run components/game/__tests__` and play a hand in the
browser; AI pungs must still work.

### Step 5: Re-derive `isMyClaimTurn`

`GameBoard.tsx:166` becomes: the human is in `claimablePlayers` and has not yet
acted. Update the comment above it — it currently describes the sequential
rotation this plan removes. Rename to `canHumanClaimNow` if the old name reads
as rotation-flavoured.

### Step 6: Fix the claim-timer guard

`useGameController.ts:1020` drops its `live.currentPlayerIndex !== humanIndex`
condition in favour of the same eligibility test. Update the comment above it,
which explains a rejection that will no longer happen.

**Verify**: let a claim window expire without acting — auto-pass must still fire
exactly once and the hand must advance.

### Step 7: Update and extend tests

Existing engine specs asserting turn-ordered claiming must be rewritten to the
new semantics rather than deleted. Add cases in
`engine/__tests__/turnManager.test.ts`:

1. Two eligible players claim out of turn order → `resolveClaimRequests` picks
   by priority, not arrival.
2. A non-eligible player's `CLAIM` and `PASS` are both rejected.
3. A player who has already acted cannot act twice.
4. One eligible player, two ineligible → the window resolves as soon as the one
   acts; the other two are never waited for.
5. `currentPlayerIndex` is unchanged for the whole claim window.
6. Rob-the-kong window still admits only `win`.

### Step 8: Confirm in a browser

`cd web && npm run dev`. Play a full hand at the standard table and one at the
training table. Confirm: the claim prompt appears the instant an opponent
discards a tile you can claim; you are never prompted for a tile you cannot
claim; the countdown still reads 10s / 20s; the hand never wedges.

## Test plan

- `npm test` — full suite green.
- `npm run typecheck`, `npm run lint` — clean.
- `npm run test:e2e` — Playwright specs that drive a hand must still pass.
- Manual: the Step 8 browser pass.

## Done criteria

1. `claimablePlayers` contains only players with a legal claim.
2. Any eligible player may claim or pass at any point in the window; ineligible
   or already-acted players are rejected.
3. `currentPlayerIndex` does not change during a claim window.
4. `nextClaimantIndex`, `claimableIds` as dead code, and any now-unused
   `getClaimablePlayerIds` are gone.
5. AI claims still work from every seat.
6. Full suite, typecheck, lint, and e2e green.
7. `plans/README.md` status row updated.

## STOP conditions

- **Claim priority changes.** If any test shows a different claimant winning a
  contested tile than before, stop. `resolveClaimRequests` is order-independent
  and must not need edits; if it does, the conversion is wrong.
- **A hand wedges.** If any path leaves `turnPhase === 'claim'` with nothing
  able to advance it, stop and report — this is the exact bug class plan 013
  fixed and it must not return.
- **The 144-tile invariant breaks.** Any test asserting tile conservation
  failing means claim resolution is double-applying.
- Drift check mismatch against the excerpts above.

## Maintenance notes

- The invariant from Step 3 — `currentPlayerIndex` during a claim window is the
  *next drawer*, never a claimant — is the thing most likely to be
  misunderstood later. Keep it in a comment on `advanceClaimRound`.
- ADR 0003 records that the timing leak is deliberate. A future reader who
  notices that unclaimable discards resume faster is not looking at a bug.
