# Plan 013: Make the claim window honest — gate the buttons, never wedge, always respond

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 700769d..HEAD -- web/components/game/useGameController.ts web/components/game/ActionBar.tsx web/components/game/GameBoard.tsx`
> On a mismatch with the "Current state" excerpts, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but land after 012 to keep the two timer changes reviewable separately)
- **Category**: bug
- **Planned at**: commit `700769d`, 2026-07-25

## Why this matters

Claiming a discard (chow/pung/kong/win) is the highest-stakes interaction in
mahjong. Today it has three defects that compound into "the buttons sometimes
just don't work":

1. **Buttons appear before they are usable.** Claim options are published as
   soon as the claim phase starts, but the engine only accepts the human's
   claim once the sequential claim rotation reaches them. For up to ~450ms the
   player sees live-looking "Take discard" / "Pass" buttons with a running
   countdown, and both are inert.
2. **The auto-pass can permanently wedge the hand.** When the countdown hits
   zero it calls `pass()` exactly once. If that call is rejected — by the 200ms
   action debounce or by the engine's turn guard — nothing retries, and the
   interval has already stopped. The engine waits forever for a human who will
   never act.
3. **Rejected actions are silent.** Every human action returns `null` on
   rejection and every call site does nothing with it. No sound, no shake, no
   message. The player cannot tell "I was too early" from "the app is broken".

Together these teach the player that the claim buttons are unreliable, which is
corrosive to trust in the whole game.

## Current state

### The gating mismatch

`web/components/game/ActionBar.tsx:157` — renders claim UI with no check that
it is actually the human's turn to claim:

```tsx
  if (turnPhase === 'claim' && hasClaimOptions && claimOptions.length > 0) {
    const best = getBestClaimSubmission(claimOptions);
    const timerPct = claimTimer > 0 ? (claimTimer / claimTimeout) * 100 : 0;
```

But the controller rejects the action unless the rotation has reached the
human — `web/components/game/useGameController.ts:399` (inside `claimBest`):

```ts
    if (current.currentPlayerIndex !== humanIndex) return;
```

and the engine agrees — `web/engine/turnManager.ts:775-776` (`handlePass`)
returns `null` for the same reason. Claims resolve sequentially via
`nextClaimantIndex` (`web/engine/turnManager.ts:747`).

Meanwhile `web/components/game/GameBoard.tsx:125-126` gates the discard-pool
claim highlight on the *stricter* `isHumanTurn`, so the spotlight and the
buttons already disagree with each other on screen.

### The wedge — `web/components/game/useGameController.ts:795-820`

```ts
    if (claimTimer <= 0 || claimOptions.length === 0) return;
    ...
    const interval = setInterval(() => {
      const live = gameRef.current;
      if (!live || live.phase !== GamePhase.PLAYING || live.turnPhase !== 'claim') {
        updateClaimTimer(0);
        return;
      }
      const prev = claimTimerRef.current;
      const next = Math.max(0, prev - 100);
      updateClaimTimer(next);
      if (next === 0 && prev > 0) {
        // Time's up — auto-pass (side effect in callback, not a state updater).
        // Guard prev > 0 so we only fire once: on the tick that transitions to 0,
        // not on subsequent ticks before the interval is cleared.
        pass();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [claimTimer > 0, claimOptions.length, game?.phase, game?.turnPhase, pass]);
```

The dependency `claimTimer > 0` flips to `false` on the zero tick, which tears
down the interval. If that single `pass()` returned `null`, there is no second
attempt.

### The silence — `web/components/game/useGameController.ts:285-288`

`doAction` returns `null` when a human action fires within `DEBOUNCE_MS` (200,
declared at line 41). Every caller then guards on `if (next)` and otherwise
returns silently: `submitClaim` (:387), `claimBest` (:405), `submitChow` (:416),
`pass` (:427), `discardSelected` (:336-340).

`web/lib/soundManager.ts:6-15` — the `SoundName` union has no failure sound:
`tilePlace, tileDraw, claim, win, winSelfDraw, winLimitHand, pass, turnAlert, kong`.

### Repo conventions

- Controller returns state + callbacks; `ActionBar` is presentational.
- Transition guards use the `next === X && prev > X` idiom (see the excerpt
  above). Reuse it.
- Refs (`gameRef`, `claimTimerRef`, `humanDiscardInFlightRef`) are the
  established way to read live values inside timers without re-triggering
  effects.

## Commands you will need

From `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose   | Command                                              | Expected |
|-----------|------------------------------------------------------|----------|
| Typecheck | `npm run typecheck`                                  | exit 0   |
| Lint      | `npm run lint`                                       | exit 0   |
| Unit test | `npm test`                                           | all pass |
| Targeted  | `npx vitest run components/game/__tests__/ActionBar.claim.test.tsx` | all pass |
| Targeted  | `npx vitest run components/game/__tests__/useGameController.timers.test.tsx` | all pass |

## Scope

**In scope**:
- `web/components/game/useGameController.ts`
- `web/components/game/ActionBar.tsx`
- `web/components/game/GameBoard.tsx` (prop plumbing only)
- `web/components/game/__tests__/ActionBar.claim.test.tsx` (add cases)
- `web/components/game/__tests__/useGameController.timers.test.tsx` (add cases)

**Out of scope** (do NOT touch):
- `web/engine/turnManager.ts` and everything under `web/engine/` — the engine's
  sequential claim rotation is **correct**. This plan makes the UI tell the
  truth about it; it does not change the rules.
- `web/lib/soundManager.ts` — reuse the existing `pass` sound for the rejection
  cue rather than adding a new asset. If you conclude a distinct buzz is
  required, that is a STOP condition, not a licence to add one.
- The claim timeout durations (`CLAIM_TIMEOUT_STANDARD` / `_TRAINING`).
- `ChowSelector.tsx` — it is already correct.

## Git workflow

- Branch: `feature/claim-window-reliability`
- Conventional commits, e.g. `fix(play): gate claim buttons to the human's claim turn and retry auto-pass`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Derive and expose `isMyClaimTurn`

In `useGameController.ts`, compute whether the human may act on the current
claim right now:

```ts
const isMyClaimTurn =
  !!game &&
  game.phase === GamePhase.PLAYING &&
  game.turnPhase === 'claim' &&
  game.currentPlayerIndex === humanIndex;
```

Return it from the hook alongside `claimOptions` / `claimTimer`.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Gate the claim UI on it

Thread `isMyClaimTurn` through `GameBoard.tsx` into `ActionBar.tsx` (follow how
`claimTimer` is already threaded — `grep -n "claimTimer" web/components/game/GameBoard.tsx`).

In `ActionBar.tsx`, keep the existing `turnPhase === 'claim' && hasClaimOptions
&& claimOptions.length > 0` branch, but inside it:

- When `isMyClaimTurn` is **false**: render the countdown bar plus a waiting
  state — text such as "Opponents deciding…" — and **do not render the
  claim/pass buttons at all**. Do not render disabled buttons; an absent
  control is honest, a dead-looking one still invites the tap.
- When `isMyClaimTurn` is **true**: render exactly what is rendered today.

Also update `GameBoard.tsx:125-126` so the discard-pool `showClaimHighlight`
uses this same `isMyClaimTurn` value, so the spotlight and the buttons finally
agree.

**Verify**: `npm run typecheck && npm run lint` → both exit 0.

### Step 3: Make the auto-pass retry until it takes

Add a `forcePass` callback in the controller that performs the same work as
`pass()` but bypasses the `DEBOUNCE_MS` check (the debounce exists to stop
double-taps from a human finger; a timer expiry is not a double-tap).

Then change the countdown effect so it does not stop at zero:

- Keep the interval alive while `turnPhase === 'claim'` and the human still has
  outstanding claim options, rather than tearing down on `claimTimer > 0`
  flipping false.
- On every tick where remaining time is 0, call `forcePass()` again.
- Stop the interval when `turnPhase` leaves `'claim'` **or** `claimOptions`
  becomes empty.

Change the dependency array accordingly — replace `claimTimer > 0` with a
condition that stays true through the zero state (e.g. gate on
`claimOptions.length > 0 && game?.turnPhase === 'claim'`).

Keep the existing one-shot `next === 0 && prev > 0` guard for anything that
should fire only once (such as a sound); the *retry* is intentionally not
one-shot.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Give rejected actions a response

Change the human action callbacks (`submitClaim`, `claimBest`, `submitChow`,
`pass`, `discardSelected`) to return a `boolean` indicating whether the action
was accepted — `true` when `doAction` returned non-null, `false` otherwise.

In `ActionBar.tsx`, when a handler returns `false`:
- play `soundManager.play('pass')` as a short "not now" cue, and
- apply a brief shake to the pressed button.

For the shake, check whether a suitable animation already exists before adding
one: `grep -n "shake\|animate-" web/app/globals.css | head -30`. If a shake
keyframe exists, use it. If not, add a single small `@keyframes shake` +
`.animate-shake` pair to `globals.css` following the style of the neighbouring
animation utilities, and honour the existing `@media (prefers-reduced-motion:
reduce)` block at `web/app/globals.css:325` by making the shake a no-op there.

**Verify**: `npm run lint` → exit 0.

### Step 5: Confirm in a browser

`npm run dev`, then
`http://localhost:3000/play/game?table=training&mode=quick&difficulty=easy&minFaan=0`.

1. Discard, then watch an opponent discard a tile you can claim. Confirm you
   briefly see the waiting state, then the buttons appear.
2. Let a claim window expire fully without acting. Confirm play continues and
   the claim UI clears — it must not sit at 0% with a dead bar.
3. Tap "Take discard" twice rapidly. Confirm the second tap produces a shake +
   sound rather than nothing.

## Test plan

Read `web/components/game/__tests__/ActionBar.claim.test.tsx` and
`useGameController.timers.test.tsx` first and match their structure. One
behaviour per test.

New cases:

1. `ActionBar.claim.test.tsx` — **"claim buttons are not rendered before the
   human's claim turn"**: render with `isMyClaimTurn={false}` and claim options
   present; assert `claim-best-button` is absent and the waiting text is present.
2. `ActionBar.claim.test.tsx` — **"claim buttons render on the human's claim
   turn"**: same props with `isMyClaimTurn={true}`; assert the button exists.
   (Pins that Step 2 did not over-narrow the gate.)
3. `useGameController.timers.test.tsx` — **"auto-pass retries when the first
   attempt is rejected"**: put the controller in a claim phase, arrange for the
   first pass to be rejected (fire a human action immediately before expiry so
   the debounce swallows it), advance fake timers past zero by several ticks,
   and assert the claim phase is exited.
4. `useGameController.timers.test.tsx` — **"claim countdown stops once the
   claim phase ends"**: assert no further pass attempts occur after the phase
   leaves `'claim'` (guards against Step 3 creating an infinite retry loop).

**Verify**: both targeted vitest commands pass with 4 new tests.

## Done criteria

ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0; the 4 new tests exist and pass
- [ ] `grep -n "isMyClaimTurn" web/components/game/ActionBar.tsx` returns a match
- [ ] Browser check: an expired claim window always advances play
- [ ] No files under `web/engine/` are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- "Current state" excerpts do not match the live code.
- You conclude the fix requires changing `web/engine/turnManager.ts`. The
  engine is out of scope and its sequential claim resolution is intended.
- The Step 3 retry causes an infinite loop in tests (pass never accepted).
  That means `forcePass` is being rejected for a reason other than the
  debounce — report the actual rejection cause rather than adding a retry cap.
- You believe a new sound asset is required.

## Maintenance notes

- **What interacts with this**: if multiplayer ever lands, `isMyClaimTurn` must
  be derived from server state rather than local `currentPlayerIndex`. The name
  is deliberately intent-revealing so that substitution is obvious.
- **What a reviewer should scrutinise**: that the countdown interval's teardown
  condition genuinely becomes false when the claim phase ends. Getting this
  wrong turns a wedge bug into a busy-loop bug — case 4 in the test plan exists
  specifically to catch that.
- **Deliberately deferred**: the ~450ms wait itself. It comes from
  `claimDelayMs: 150` per AI claimant. Shortening it is a pacing decision
  handled in plan 014; this plan only makes the wait *honest*.
