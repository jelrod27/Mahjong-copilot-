# Plan 012: Show the turn timer and make auto-discard respect the player's selection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/components/game/useGameController.ts web/components/game/ActionBar.tsx web/components/game/TurnTimer.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

The player has a 20-second limit to discard. When it expires the game discards
a tile for them. Today that event is **invisible before, during, and after**:

- There is no countdown anywhere on screen.
- The auto-discard **ignores the tile the player selected** and instead throws
  away the tile they just drew.
- No sound and no toast fires when it happens.

So a player who taps 9-Bamboo, thinks for twenty seconds, and looks back finds
a *different* tile gone from their hand, with nothing explaining why. On the
training table — beginners, same 20s limit — this is inflicted on exactly the
audience least able to work out what happened.

A fully-built `TurnTimer` component already exists in the repo and is imported
by nothing. This plan wires it up and makes the forced discard obey the
player's stated intent.

## Current state

### Relevant files

- `web/components/game/TurnTimer.tsx` — a complete, working countdown bar with
  low/critical colour tiers. **Dead code**: `grep -rn "TurnTimer" web/` returns
  only matches inside this file itself.
- `web/components/game/useGameController.ts` — owns the discard timeout effect
  and all game actions.
- `web/components/game/ActionBar.tsx` — renders the discard-phase UI where the
  timer belongs.

### The dead component, in full — `web/components/game/TurnTimer.tsx`

```tsx
'use client';

interface TurnTimerProps {
  timeRemaining: number; // ms remaining
  totalTime: number;     // ms total
}

export default function TurnTimer({ timeRemaining, totalTime }: TurnTimerProps) {
  if (totalTime <= 0) return null;

  const pct = Math.max(0, (timeRemaining / totalTime) * 100);
  const seconds = Math.ceil(timeRemaining / 1000);
  const isLow = pct < 30;
  const isCritical = pct < 15;
  ...
}
```

### The defective auto-discard — `web/components/game/useGameController.ts:655-690`

```ts
  // === Discard timeout — auto-discard if human takes too long ===
  useEffect(() => {
    if (!game || game.phase !== GamePhase.PLAYING) return;
    if (game.turnPhase !== 'discard' || game.currentPlayerIndex !== humanIndex) return;

    // Release any stale mutex when a fresh discard phase begins (next hand, new turn).
    humanDiscardInFlightRef.current = false;

    const timer = setTimeout(() => {
      // Bug #7: mutex against manual discardSelected() — whichever fires first wins.
      if (humanDiscardInFlightRef.current) return;
      const current = gameRef.current;
      if (!current || current.turnPhase !== 'discard' || current.currentPlayerIndex !== humanIndex) return;
      const hand = current.players[humanIndex].hand;
      // Auto-discard last drawn tile, or last tile in hand
      const autoTile = current.lastDrawnTile
        ? hand.find(t => t.id === current.lastDrawnTile?.id)
        : hand[hand.length - 1];
      if (autoTile) {
        humanDiscardInFlightRef.current = true;
        const next = doAction(HUMAN_ID, { type: 'DISCARD', tile: autoTile });
        if (!next) {
          humanDiscardInFlightRef.current = false;
          return;
        }
        setSelectedTileId(undefined);
      }
    }, (game.turnTimeLimit ?? 20) * 1000);
    return () => clearTimeout(timer);
  }, [game?.turnPhase, game?.currentPlayerIndex, game?.phase, humanIndex, doAction]);
```

`selectedTileId` is state in this same hook and is **never consulted** by this
effect. Note also there is no `soundManager.play(...)` call on this path,
unlike the auto-draw effect just above it (line ~658) which plays `tileDraw`.

### Sound names available — `web/lib/soundManager.ts:6-15`

The `SoundName` union is:
`tilePlace, tileDraw, claim, win, winSelfDraw, winLimitHand, pass, turnAlert, kong`.

`turnAlert` already exists and is the correct sound for the warning in Step 3.
Do **not** add new sound assets in this plan.

### Repo conventions to match

- The controller exposes state and callbacks through its return object; UI
  components are presentational and receive them as props. Do not read
  controller state directly in `ActionBar`.
- Timing constants live as module-level `const`s at the top of
  `useGameController.ts` (see `DELAYS`, `CLAIM_TIMEOUT_STANDARD`,
  `DEBOUNCE_MS` at lines 32–41). Add new ones there, not inline.
- `ActionBar.tsx` already renders a claim countdown bar with the same
  colour-tier idea (lines ~168–176). Match that visual language.

## Commands you will need

All commands run from `/Users/justinelrod/Projects/Mahjong-copilot-/web`.

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| Typecheck | `npm run typecheck`                                  | exit 0, no errors   |
| Lint      | `npm run lint`                                       | exit 0              |
| Unit test | `npm test`                                           | all pass            |
| Targeted  | `npx vitest run components/game/__tests__/useGameController.timers.test.tsx` | all pass |

## Scope

**In scope**:
- `web/components/game/useGameController.ts`
- `web/components/game/ActionBar.tsx`
- `web/components/game/GameBoard.tsx` (prop plumbing only)
- `web/components/game/__tests__/useGameController.timers.test.tsx` (add cases)

**Out of scope** (do NOT touch):
- `web/components/game/TurnTimer.tsx` — use it as-is. It is already correct;
  resist the urge to restyle it in this plan.
- `web/lib/soundManager.ts` — no new sound names. `turnAlert` suffices.
- The claim-window countdown in `ActionBar.tsx` and its controller effect —
  that is plan 013's territory and touching both at once makes review harder.
- `web/engine/**` — this is entirely a UI/controller concern.
- The 20-second default itself. Changing the limit is a pacing decision, not a
  correctness one.

## Git workflow

- Branch: `feature/turn-timer-honest-autodiscard`
- Conventional commits, e.g. `fix(play): show turn timer and respect selected tile on auto-discard`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make auto-discard prefer the selected tile

In the discard-timeout effect quoted above, change the `autoTile` resolution to
try the player's selection first, then fall back to the current behaviour:

```ts
const selected = selectedTileId
  ? hand.find(t => t.id === selectedTileId)
  : undefined;
const autoTile =
  selected ??
  (current.lastDrawnTile
    ? hand.find(t => t.id === current.lastDrawnTile?.id)
    : undefined) ??
  hand[hand.length - 1];
```

Note the fallback chain is now three-deep and ends at `hand[hand.length - 1]`
unconditionally — the original code only reached that last fallback when
`lastDrawnTile` was absent, so a `lastDrawnTile` that is no longer in hand
would have produced `undefined` and silently skipped the discard entirely.
This chain closes that hole too.

Reading `selectedTileId` inside the effect would normally oblige you to add it
to the dependency array — but doing so tears down and restarts the effect's
`setTimeout` on every tile tap, resetting the player's clock each time they
change their mind. Read it from a ref instead:

- Add a `selectedTileIdRef` alongside the existing `gameRef` /
  `humanDiscardInFlightRef` refs (search for `useRef` in the file to find the
  established pattern), keep it in sync with a small effect, and read
  `selectedTileIdRef.current` inside the timeout callback.
- Do **not** add `selectedTileId` to the dependency array.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Expose turn-timer state from the controller

Add a countdown for the human's discard phase, mirroring the existing claim
countdown pattern in this file (search for `updateClaimTimer` and its
`setInterval` effect around line 795 to copy the structure).

- Add a module-level `const TURN_TIMER_TICK_MS = 100;` next to `DEBOUNCE_MS`.
- Add `turnTimer` state (ms remaining) and drive it with a 100ms interval that
  runs only while `turnPhase === 'discard' && currentPlayerIndex === humanIndex
  && phase === PLAYING`.
- Reset it to `(game.turnTimeLimit ?? 20) * 1000` whenever a fresh human
  discard phase begins.
- Clear it to 0 when the phase leaves discard.
- Return `turnTimer` and `turnTimeout` (the total, in ms) from the hook.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Play a warning sound at 5 seconds remaining

Inside the countdown tick, when the remaining time crosses from above 5000ms to
at or below 5000ms, call `soundManager.play('turnAlert')`.

Guard it so it fires **exactly once** per turn — use the same
`next === X && prev > X` transition-guard idiom the claim countdown already
uses:

```ts
if (next <= 5000 && prev > 5000) {
  soundManager.play('turnAlert');
}
```

Also play `soundManager.play('tilePlace')` on the forced discard in Step 1's
effect, immediately after a successful `doAction`, so the auto-discard is
audible like a manual one.

**Verify**: `npm run lint` → exit 0.

### Step 4: Render the timer in the action bar

Thread `turnTimer` and `turnTimeout` from the controller through
`GameBoard.tsx` into `ActionBar.tsx` as props (follow how `claimTimer` and
`claimTimeout` are already threaded — grep for `claimTimeout` to see all three
sites).

In `ActionBar.tsx`, render `<TurnTimer timeRemaining={turnTimer} totalTime={turnTimeout} />`
inside the discard-phase branch (the branch that renders the "Discard" button),
positioned above the button.

`TurnTimer` already returns `null` when `totalTime <= 0`, so no extra guard is
needed for phases where the timer is inactive.

**Verify**: `npm run typecheck && npm run lint` → both exit 0, and
`grep -rn "TurnTimer" web/components` now returns matches in `ActionBar.tsx`
as well as `TurnTimer.tsx`.

### Step 5: Confirm in a browser

Run `npm run dev`, open
`http://localhost:3000/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`,
dismiss the intro, and on your turn:

1. Confirm a countdown bar and a seconds number appear during your discard
   phase and tick down.
2. Select a tile, then wait out the full timer without pressing Discard.
3. Confirm **the tile you selected** is the one that leaves your hand.

**Expected**: the selected tile is discarded, a sound plays, and the bar
resets on the next turn.

## Test plan

`web/components/game/__tests__/useGameController.timers.test.tsx` already
exists and covers timer behaviour with fake timers. **Read it first** and match
its setup helpers, fake-timer usage, and assertion style exactly.

Add these cases:

1. **"auto-discard discards the selected tile"** — select a tile that is *not*
   `lastDrawnTile`, advance fake timers past the limit, assert the selected
   tile is the one passed to the DISCARD action.
2. **"auto-discard falls back to the drawn tile when nothing is selected"** —
   no selection, advance timers, assert `lastDrawnTile` is discarded
   (pins the existing behaviour so the fallback is not lost).
3. **"changing the selection does not reset the turn timer"** — this is the
   specific regression the ref in Step 1 exists to prevent. Select a tile,
   advance timers partway, select a different tile, advance past the original
   deadline, and assert the discard fired.

Follow the repo's one-behaviour-per-test convention: one assertion target per
test, no combined cases.

**Verify**: `npx vitest run components/game/__tests__/useGameController.timers.test.tsx`
→ all pass, including 3 new tests.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0; the 3 new tests exist and pass
- [ ] `grep -rn "TurnTimer" web/components/game/ActionBar.tsx` returns a match
- [ ] Browser check from Step 5: selected tile is the one auto-discarded
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code.
- `selectedTileId` turns out not to be state inside `useGameController.ts`
  (this plan assumes it is; verify with `grep -n "selectedTileId" web/components/game/useGameController.ts`).
- Adding the turn-timer interval causes existing tests in
  `useGameController.timers.test.tsx` or `useGameController.flow.test.tsx` to
  fail. That signals the new interval is interfering with the AI turn chain —
  report rather than loosening the tests.
- You find yourself needing to modify `TurnTimer.tsx` to make it render.

## Maintenance notes

- **What interacts with this**: the new turn-timer interval is a *second*
  100ms interval in this hook alongside the claim countdown. They should never
  run simultaneously (different `turnPhase` values), but if a future change
  makes claim and discard phases overlap, both will tick and the controller
  will re-render 20×/second. Plan 013 addresses the re-render cost of these
  intervals.
- **What a reviewer should scrutinise**: that `selectedTileId` is read from a
  ref and is absent from the effect deps — the whole point is that the clock
  must not restart when the player changes their mind.
- **Deliberately deferred**: the 20-second limit is unchanged. Whether beginners
  should get a longer window (the training table already gets a longer *claim*
  window via `CLAIM_TIMEOUT_TRAINING`, but the same 20s *discard* limit) is a
  product call, not a bug fix.
