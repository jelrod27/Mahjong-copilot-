# Plan 006: Move the auto-pass side effect out of the claim-countdown state updater

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/components/game/useGameController.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpt against the live code (lines ~799-828) before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-usegamecontroller-integration-tests.md (safety net — must be DONE first)
- **Category**: bug
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

The claim-countdown interval in `useGameController` calls `pass()` from **inside a
`setClaimTimer` functional updater**. React state updaters must be pure: React may
invoke them more than once (it does so deliberately under StrictMode) and runs them
during render, so a side effect there can fire twice or at an unexpected time. Today
the double-fire is masked by the engine rejecting a second PASS, but it is exactly the
kind of latent bug that surfaces after an unrelated React upgrade or a StrictMode
enable. The fix is mechanical: compute the expiry decision in the interval callback,
not in the updater.

## Current state

- `web/components/game/useGameController.ts:799-828` — the effect as it exists today:

  ```ts
  // === Claim countdown ===
  useEffect(() => {
    // Bug #8: stop ticking as soon as the hand ends (robbing-the-kong win, wall
    // exhaustion, etc.) or the claim opportunity is gone — otherwise the
    // interval keeps calling pass() against a FINISHED state.
    if (claimTimer <= 0 || claimOptions.length === 0) return;
    if (!game || game.phase !== GamePhase.PLAYING || game.turnPhase !== 'claim') {
      // Reset timer synchronously so lingering UI also clears.
      if (claimTimer !== 0) setClaimTimer(0);
      return;
    }
    const interval = setInterval(() => {
      // Re-check inside the tick — phase may have flipped between scheduling
      // and firing.
      const live = gameRef.current;
      if (!live || live.phase !== GamePhase.PLAYING || live.turnPhase !== 'claim') {
        setClaimTimer(0);
        return;
      }
      setClaimTimer(prev => {
        if (prev <= 100) {
          // Time's up — auto-pass
          pass();
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [claimTimer > 0, claimOptions.length, game?.phase, game?.turnPhase, pass]);
  ```

- The dependency `claimTimer > 0` is **intentional** (it only flips at the zero
  boundary, preventing interval teardown every 100ms) — keep it.
- `claimTimer` state is declared at useGameController.ts:122
  (`const [claimTimer, setClaimTimer] = useState(0);`). Other `setClaimTimer` call
  sites: the claim-detection effect arms it
  (`setClaimTimer(prev => prev > 0 ? prev : claimTimeoutMs)` at ~line 781) and several
  action callbacks (`submitClaim`, `claimBest`, `submitChow`, `pass`,
  `resetHandState`) reset it to 0.
- `pass()` (useGameController.ts:443-452) issues `doAction(HUMAN_ID, { type: 'PASS' })`
  and clears claim UI state when it succeeds.
- The file has a top-of-file `/* eslint-disable react-hooks/exhaustive-deps */` — dep
  arrays here are hand-curated on purpose; do not "fix" them.
- Tests covering this region: `web/components/game/__tests__/useGameController.timers.test.tsx`
  (Bug #8 test) and, after plan 001, `useGameController.flow.test.tsx` (claim-timeout
  test asserting exactly one PASS).

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Hook tests | `npx vitest run components/game/__tests__/` | all pass |
| Full suite | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**:
- `web/components/game/useGameController.ts` — ONLY the claim-countdown effect
  (lines ~799-828) and, if you choose the ref-mirror approach, a small ref +
  helper next to the `claimTimer` state declaration.

**Out of scope** (do NOT touch):
- The claim-detection effect (lines ~747-797), the AI-turn effect, the scoring effect.
- The `claimTimer > 0` dependency-array pattern (keep it).
- Any other `setClaimTimer` call sites beyond optionally routing them through the
  helper described in Step 1.

## Git workflow

- Branch: `feature/claim-countdown-hardening`
- Commit message style: `fix(game): move claim auto-pass out of setState updater`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Mirror the timer in a ref and decide expiry in the interval callback

Add a ref mirror next to the state declaration (~line 122):

```ts
const [claimTimer, setClaimTimer] = useState(0);
const claimTimerRef = useRef(0);
const updateClaimTimer = useCallback((value: number) => {
  claimTimerRef.current = value;
  setClaimTimer(value);
}, []);
```

Replace every existing `setClaimTimer(...)` call site with `updateClaimTimer(...)`:
- the resets to `0` in `resetHandState`, `submitClaim`, `claimBest`, `submitChow`,
  `pass`, and the claim-detection effect;
- the arming call `setClaimTimer(prev => prev > 0 ? prev : claimTimeoutMs)` becomes
  `if (claimTimerRef.current <= 0) updateClaimTimer(claimTimeoutMs);`

Then rewrite the interval body so the updater is pure and the side effect happens in
the callback:

```ts
const interval = setInterval(() => {
  const live = gameRef.current;
  if (!live || live.phase !== GamePhase.PLAYING || live.turnPhase !== 'claim') {
    updateClaimTimer(0);
    return;
  }
  const next = Math.max(0, claimTimerRef.current - 100);
  updateClaimTimer(next);
  if (next === 0) {
    pass(); // side effect now in the interval callback, not a state updater
  }
}, 100);
```

Keep the effect's guard block and dependency array exactly as they are (including
`claimTimer > 0`).

**Verify**: `npm run typecheck` → exit 0, and
`grep -n "setClaimTimer" web/components/game/useGameController.ts` → only the
`useState` destructuring line and the body of `updateClaimTimer` remain.

### Step 2: Run the regression net

**Verify**, in order:
- `npx vitest run components/game/__tests__/useGameController.timers.test.tsx` → 3 pass
  (Bug #7/#8 behavior unchanged)
- `npx vitest run components/game/__tests__/useGameController.flow.test.tsx` → all pass
  (especially "claim timeout auto-passes exactly once")
- `npm test` → exit 0
- `npm run lint` → exit 0

### Step 3: Add one pinning test

In `useGameController.flow.test.tsx`, add: **"expiry fires PASS exactly once even
when ticks continue"** — arm a claim (as in the existing claim tests), advance fake
timers by 30_000ms (3× the timeout), and assert exactly ONE
`[, 'human-player', { type: 'PASS' }]` call in `applyActionMock.mock.calls`.

**Verify**: `npx vitest run components/game/__tests__/useGameController.flow.test.tsx` → all pass including the new test.

## Test plan

- Existing: timers suite (Bug #7/#8) and plan-001 flow suite must stay green.
- New: the single-PASS-on-expiry pinning test (Step 3).

## Done criteria

- [ ] No `pass()` (or any side effect) inside a `setClaimTimer`/state-updater function — `grep -n -A 6 "setClaimTimer(prev" web/components/game/useGameController.ts` returns nothing
- [ ] `npm test`, `npm run typecheck`, `npm run lint` all exit 0
- [ ] New pinning test exists and passes
- [ ] `git status` shows only `useGameController.ts` and the flow test file modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001's flow test suite does not exist yet (dependency not met).
- The countdown region has drifted from the excerpt (someone else fixed or changed it).
- After the rewrite, the Bug #8 test fails twice — the ref mirror is probably out of
  sync with a reset path you missed; report which call site.

## Maintenance notes

- The ref mirror means anyone adding a new `setClaimTimer` call must use
  `updateClaimTimer` instead — the Step-1 grep (only two `setClaimTimer` occurrences)
  is the reviewer's check, and worth re-running in future PRs touching claims.
- If the app ever enables React StrictMode, this change is what makes the claim
  countdown safe under double-invoked updaters.
