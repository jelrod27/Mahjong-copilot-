# Plan 001: Add game-flow integration tests for useGameController

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/components/game/useGameController.ts web/components/game/__tests__/ web/lib/matchStorage.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

`web/components/game/useGameController.ts` (887 lines) is the bridge between the pure
game engine and the React UI. It owns game initialization, saved-game resume, AI turn
timing, claim detection/timeouts, and scoring/match advancement. It is one of the
highest-churn files in the repo (8 commits in the last 50), yet its only tests are
three timer-race regression tests. Any regression in claim detection, resume, scoring,
or AI fallback currently ships silently. This plan adds characterization/integration
tests so future changes (including the planned refactor of this hook) have a safety net.

## Current state

- `web/components/game/useGameController.ts` — the hook under test. Exports a default
  function `useGameController(initialDifficulty, initialMode, showTutor, liveFaanMeter, initialMinFaan, tileVoice, tablePreset, npcRosterMode, fixedNpcRoster, onMatchRosterResolved, parlourFloor, dailyMode)` returning a `GameController` object (`game`, `match`, `claimOptions`, `claimTimer`, `scoringResult`, action methods, etc.).
- `web/components/game/__tests__/useGameController.timers.test.tsx` — the ONLY existing
  tests for this hook (3 tests for timer races). **Use this file as the structural
  pattern**: it mocks the engine surface (`@/engine/turnManager`, `@/engine/matchManager`,
  `@/engine/claiming`, `@/engine/winDetection`, `@/engine/scoring`, `@/engine/ai`,
  `@/engine/tutor`), `@/lib/soundManager`, and partially mocks `@/models/Tile` so
  `TileFactory.getAllTiles()` returns `[]`. It provides `makeTile`, `makeGame`,
  `makeMatch` fixture builders and uses `vi.useFakeTimers()` + `renderHook` from
  `@testing-library/react`.
- Key facts about the hook you will exercise:
  - `HUMAN_ID = 'human-player'` (useGameController.ts:30).
  - Mount-init effect (useGameController.ts:237-247): resumes from
    `loadGame()` (real module `@/lib/matchStorage`, localStorage key
    `mahjong_match_in_progress`) **unless** `parlourFloor` or `dailyMode` is set:
    ```ts
    const saved = (parlourFloor || dailyMode) ? null : loadGame();
    if (saved?.match && saved.match.phase !== 'finished') {
      setMatch(saved.match);
      setGame(saved.game ?? saved.match.currentHand ?? null);
      setDifficulty(saved.match.difficulty);
      setMode(saved.match.mode);
    } else {
      startNewGame(initialDifficulty, initialMode);
    }
    ```
  - Auto-save effect (useGameController.ts:271-282): `saveGame(match, game)` on every
    match/game change; `clearSavedGame()` when `match.phase === 'finished'`.
  - Claim detection effect (useGameController.ts:747-797): when `turnPhase === 'claim'`
    and the human has legal claims, sets `claimOptions` and arms `claimTimer` to
    `claimTimeoutMs` (10000 for 'standard' preset, 20000 for 'training'). If the human
    already passed/claimed (`game.passedPlayers` / `game.pendingClaims`), options clear.
  - **Important mock-wiring detail**: the hook imports `getLegalClaims` from
    `@/engine/turnManager` (NOT from `@/engine/claiming`). The exemplar test maps the
    turnManager mock's `getLegalClaims` to a shared `getAvailableClaimsMock` — copy
    that wiring.
  - Claim countdown (useGameController.ts:800-828): 100ms interval; auto-`pass()` when
    the timer reaches ≤100ms.
  - Scoring effect (useGameController.ts:831-876): on `game.phase === FINISHED` with a
    `winnerId` + `winningTile`, calls `calculateScore` + `calculatePayment`
    (both mocked), sets `scoringResult`, then `advanceMatch(currentMatch, game, result)`.
  - AI discard fallback (useGameController.ts:708-724): if `getAIDecision` returns a
    special action (e.g. `DECLARE_WIN`) and `applyAction` (i.e. `doAction`) returns
    null for it, the hook falls back to discarding the first non-bonus tile so the
    game never stalls.
- Test runner: Vitest with jsdom (`web/vitest.config.ts`), setup `web/vitest.setup.ts`.
  jsdom provides a working `localStorage`.

## Commands you will need

All from `/Users/justinelrod/Projects/Mahjong-copilot-/web`:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run new test file | `npx vitest run components/game/__tests__/useGameController.flow.test.tsx` | all pass |
| Run existing hook tests | `npx vitest run components/game/__tests__/useGameController.timers.test.tsx` | 3 pass (unchanged) |
| Full unit suite | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `web/components/game/__tests__/useGameController.flow.test.tsx` (create)

**Out of scope** (do NOT touch):
- `web/components/game/useGameController.ts` — this plan is tests-only. If a test
  reveals a real bug, write the test to pin CURRENT behavior, and note the suspected
  bug in your report. (Plan 006 makes one targeted change to this file later.)
- `web/components/game/__tests__/useGameController.timers.test.tsx` — leave as is.
- Engine modules under `web/engine/`.

## Git workflow

- Branch: `feature/usegamecontroller-flow-tests` (repo convention is `feature/<description>`)
- Commit message style (match git log): `test(game): add useGameController game-flow integration tests`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the test file with the mock scaffold

Create `web/components/game/__tests__/useGameController.flow.test.tsx`. Copy the mock
block, fixture builders (`makeTile`, `makeGame`, `makeMatch`), and fake-timer
`beforeEach`/`afterEach` from `useGameController.timers.test.tsx` verbatim, including
the `import useGameController from '../useGameController';` placed AFTER the mocks.
Add one more mock so daily-mode tests are deterministic:

```ts
vi.mock('@/lib/dailyHand', () => ({ dailySeed: vi.fn(() => 'daily-2026-06-11') }));
```

Also clear localStorage in `beforeEach` (`localStorage.clear()`).

**Verify**: `npx vitest run components/game/__tests__/useGameController.flow.test.tsx` → file runs (0 tests is fine at this point, no import errors).

### Step 2: Initialization tests

Add a `describe('initialization')` block with:

1. **Fresh start**: render `useGameController('easy', 'quick')` with
   `initializeMatchMock` returning `makeMatch(makeGame())`. Assert
   `initializeMatchMock` was called once with an options object whose
   `mode === 'quick'` and `difficulty === 'easy'`, and `result.current.game` /
   `result.current.match` are non-null.
2. **Daily mode**: render with `dailyMode: true` (12th positional arg — pass
   intermediate defaults explicitly: `useGameController('easy', 'quick', true, true, undefined, 'off', 'standard', 'auto', 'default', undefined, undefined, true)`).
   Assert `initializeMatchMock` was called with `seed: 'daily-2026-06-11'`,
   `mode: 'single'`, `difficulty: 'medium'`.

**Verify**: test file → 2 passing.

### Step 3: Resume-path tests

Add a `describe('saved-game resume')` block. To seed a saved game, write directly to
localStorage with the same shape `saveGame` produces (see `web/lib/matchStorage.ts:33-46`):

```ts
const match = makeMatch(makeGame());
localStorage.setItem('mahjong_match_in_progress', JSON.stringify({
  match, game: match.currentHand, savedAt: new Date().toISOString(), version: 1,
}));
```

Note: `loadGame()` runs the parsed objects through `matchStateFromJson` /
`gameStateFromJson` (real, unmocked `@/models/*` modules), so the fixtures must
serialize cleanly — `makeGame()`'s shape already does, but `gameStateFromJson` calls
`new Date(json.createdAt)`; add `createdAt: new Date()` and `turnHistory: []` to the
`makeGame` base object if not already present in your copied fixture.

Tests:

3. **Resumes a saved match**: with localStorage seeded as above, render the hook.
   Assert `initializeMatchMock` was NOT called and `result.current.match` is non-null
   with `mode === 'quick'`.
4. **Skips resume for parlour floors**: seed localStorage, render with
   `parlourFloor: 1` (11th arg). Assert `initializeMatchMock` WAS called (fresh start).
5. **Skips resume when saved match is finished**: seed with `match.phase = 'finished'`.
   Assert `initializeMatchMock` WAS called.
6. **Auto-save round-trip**: fresh start; after init, read
   `localStorage.getItem('mahjong_match_in_progress')` and assert it parses with
   `version === 1` and a non-null `match`.

**Verify**: test file → 6 passing.

### Step 4: Claim-flow tests

Model directly on the exemplar's Bug #8 test (claim game fixture with
`turnPhase: 'claim'`, `lastDiscardedBy: 'ai1'`, `lastDiscardedTile`, and
`getAvailableClaimsMock.mockReturnValue([{ claimType: 'pung', tilesFromHand: [], priority: 2 }])`).

7. **Claim options arm the timer**: assert `result.current.claimOptions` has length 1
   and `result.current.claimTimer === 10000` (standard preset).
8. **Claim timeout auto-passes exactly once**: advance fake timers by 11_000ms; filter
   `applyActionMock.mock.calls` for `[, HUMAN_ID, { type: 'PASS' }]` and assert exactly
   one PASS was issued, and `result.current.claimTimer === 0`.
9. **No options when human already acted**: same fixture but with
   `passedPlayers: [HUMAN_ID]`. Assert `claimOptions` stays empty and `claimTimer === 0`.

**Verify**: test file → 9 passing.

### Step 5: Scoring and AI-fallback tests

10. **Scoring on win**: start from a PLAYING game, then simulate the hand finishing:
    make `applyActionMock` return a FINISHED state with `winnerId: HUMAN_ID`,
    `winningTile: makeTile('w1')`, `isSelfDrawn: false`, and trigger it via
    `act(() => result.current.pass())` (any action works — it just needs `setGame` to
    receive the FINISHED state). Mock `buildWinScoringContext` to return a minimal
    context object (non-null) and `calculateScore` to return
    `{ totalFan: 3, faans: [], handName: undefined }`. Assert `advanceMatchMock` was
    called and `result.current.scoringResult` is non-null with `totalFan === 3`.
    Note: `calculatePayment`'s return is assigned to `result.payment` — the mock from
    the exemplar already returns an object.
11. **AI special-action fallback never stalls**: fixture with the current player being
    AI (`currentPlayerIndex: 1`, `turnPhase: 'discard'`, ai1 hand containing one
    suit tile). `getAIDecision` mock returns `{ action: { type: 'DECLARE_WIN' } }`;
    `applyActionMock` returns `null` for DECLARE_WIN and a valid state for DISCARD
    (use `mockImplementation` switching on `action.type`). Advance timers past the
    easy-difficulty discard delay (2000ms). Assert a DISCARD action for `'ai1'` was
    issued.

**Verify**: test file → 11 passing.

### Step 6: Full verification

**Verify**, in order:
- `npx vitest run components/game/__tests__/useGameController.flow.test.tsx` → 11 pass
- `npx vitest run components/game/__tests__/useGameController.timers.test.tsx` → 3 pass
- `npm test` → exit 0
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0

## Test plan

This plan IS the test plan — 11 new tests listed in steps 2–5, structurally modeled
on `useGameController.timers.test.tsx`.

## Done criteria

- [ ] `web/components/game/__tests__/useGameController.flow.test.tsx` exists with ≥11 tests covering init, resume, claim flow, scoring, AI fallback
- [ ] `npm test` exits 0 (entire suite)
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The hook's parameter order at `useGameController.ts:98-111` doesn't match the
  signature excerpt above (positional args are load-bearing for tests 2 and 4).
- The mock-wiring detail is wrong (i.e. the hook no longer imports `getLegalClaims`
  from `@/engine/turnManager`).
- A test fails in a way that suggests a REAL bug in the hook (not a wrong fixture)
  twice in a row — pin current behavior only if it is clearly intentional; otherwise
  report the suspected bug with the failing assertion.
- `localStorage` is unavailable in the test environment.

## Maintenance notes

- Plan 006 (claim-countdown hardening) and any future refactor of useGameController
  depend on this suite as their safety net — run it before and after.
- Reviewer should scrutinize: tests must assert on hook-returned state and
  `applyActionMock` call patterns, not on mock internals.
- Deferred: real-engine (unmocked) integration tests. The engine supports seeded
  determinism (`engine/rng.ts`), but the hook only accepts a seed via daily mode, so
  full-hand real-engine tests through the hook are awkward today; revisit after the
  RNG/replay spike (plan 010).
