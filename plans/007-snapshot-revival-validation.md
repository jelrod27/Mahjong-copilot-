# Plan 007: Validate saved-game snapshots before reviving them into the engine

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/lib/matchStorage.ts web/models/GameState.ts web/models/MatchState.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-usegamecontroller-integration-tests.md (soft — the resume tests there are a useful net; this plan can proceed without it if needed)
- **Category**: security
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

`loadGame()` revives whatever JSON sits in localStorage straight into the game engine
with only a version-number gate. A corrupted or hand-edited payload (impossible walls,
200-tile hands, five copies of a tile, bogus phases) becomes live engine state,
producing crashes or silent rule violations that are extremely hard to debug because
they surface deep in the engine, far from the storage layer. This is the open
**Medium** item "[On-next-touch] Schema validation on snapshot revival" in
`SECURITY_REMEDIATION.md`, and its stated trigger ("when the persistence layer is next
modified") is now met. The fix: validate the parsed snapshot and reject the WHOLE save
(clear + fresh start) on any violation — never partially revive.

## Current state

- `web/lib/matchStorage.ts:48-71` — `loadGame()` today:

  ```ts
  export function loadGame(): SavedGame | null {
    if (!isBrowser()) return null;
    try {
      const raw = localStorage.getItem(MATCH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedGame;

      if (parsed.version !== SAVE_VERSION) {
        clearSavedGame();
        return null;
      }

      // Deserialize dates and tile objects
      const match = parsed.match ? matchStateFromJson(parsed.match as Record<string, any>) : null;
      const game = parsed.game
        ? gameStateFromJson(parsed.game as Record<string, any>)
        : match?.currentHand ?? null;

      return { match, game, savedAt: parsed.savedAt, version: parsed.version };
    } catch {
      clearSavedGame();
      return null;
    }
  }
  ```

  Note the existing `try/catch` already clears-and-nulls on throw — the validator can
  simply `throw new Error(...)` to reuse that path, but prefer explicit returns for
  clarity (see Step 2).

- `web/models/GameState.ts` — `gameStateFromJson` (starts ~line 169) maps fields with
  `?? []` fallbacks and NO invariant checks. Key shapes: `players: PlayerJson[]` (each
  with `hand`, `melds`, `flowers` tile arrays), `wall`, `deadWall`, `discardPile` tile
  arrays, `playerDiscards: Record<string, Tile[]>`, `turnHistory` array,
  `phase`/`turnPhase` strings, `currentPlayerIndex` number.
- `web/models/MatchState.ts` — `matchStateFromJson` (~line 94); `MatchState` has
  `mode`, `difficulty`, `playerScores: number[]`, `handResults[]`,
  `currentHand: GameState | null`, `phase`, `playerNames: string[]`, `humanPlayerId`.
- `web/models/Tile.ts` — tile shape: `{ id, suit, type, number?, wind?, dragon?, ... }`.
  A full set is 144 tiles (136 standard + 8 bonus flowers/seasons); at most 4 copies of
  any standard tile kind, at most 1 of each bonus tile.
- Engine invariants worth enforcing (game mid-hand): 4 players;
  `0 <= currentPlayerIndex <= 3`; total tiles across wall + deadWall + discardPile +
  all hands + all melds + all flowers ≤ 144; per-kind copy counts ≤ 4 (≤1 for bonus);
  hand sizes ≤ 14 plus meld consistency; `phase` ∈ the `GamePhase` enum and
  `turnPhase` ∈ `'draw' | 'discard' | 'claim' | 'endOfTurn'`.
- **No new dependencies**: the repo avoids runtime deps for engine-adjacent code (the
  engine has zero). Write a hand-rolled validator, NOT Zod. (SECURITY_REMEDIATION
  allows "or extend *FromJson with validators".)
- Existing tests to model after: `web/lib/__tests__/storageService.test.ts` (exercises
  saveGame/loadGame against jsdom localStorage) and
  `web/models/__tests__/serialization-roundtrip.test.ts`.

## Commands you will need

All from the `web/` directory at the repository root:

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| New tests | `npx vitest run lib/__tests__/matchStorage.validation.test.ts` | all pass |
| Round-trip regression | `npx vitest run models/__tests__/serialization-roundtrip.test.ts lib/__tests__/storageService.test.ts` | all pass |
| Full suite | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**:
- `web/lib/savedGameValidator.ts` (create — the validator module)
- `web/lib/matchStorage.ts` (wire the validator into `loadGame`)
- `web/lib/__tests__/matchStorage.validation.test.ts` (create)
- `SECURITY_REMEDIATION.md` (update the item's Status to Fixed with a pointer to this change)

**Out of scope** (do NOT touch):
- `web/models/GameState.ts` / `web/models/MatchState.ts` / `web/models/Tile.ts` —
  validate BEFORE deserialization in the storage layer; do not complicate the
  `*FromJson` mappers.
- `web/engine/**` — the engine continues to trust its inputs by design.
- Adding any npm dependency (no Zod).
- `web/lib/storageService.ts` / `web/lib/settingsStorage.ts` — different stores,
  different threat profile.

## Git workflow

- Branch: `feature/snapshot-revival-validation`
- Commit message style: `fix(storage): validate saved-game snapshots before revival`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the validator

Create `web/lib/savedGameValidator.ts` exporting:

```ts
export interface ValidationFailure { ok: false; reason: string }
export interface ValidationOk { ok: true }
export type ValidationResult = ValidationOk | ValidationFailure;

export function validateSavedGamePayload(parsed: unknown): ValidationResult
```

Operating on the RAW parsed JSON (before `*FromJson`). Checks, in order (return the
first failure with a specific `reason` string):

1. `parsed` is a non-null object with `version === 1` and (if present) object-or-null
   `match` / `game`.
2. For the game payload (use `parsed.game ?? parsed.match?.currentHand`; if both are
   null/absent, that is valid — `loadGame` already handles it):
   - `players` is an array of exactly 4, each with string `id`, array `hand`,
     array `melds`, array `flowers`, and `hand.length <= 14`.
   - `currentPlayerIndex` is an integer 0..3.
   - `phase` ∈ `['waiting','dealing','playing','finished']` and `turnPhase` (if
     present) ∈ `['draw','discard','claim','endOfTurn']`. (Confirm the exact enum
     string values against `web/models/GameState.ts` — the `GamePhase` enum — before
     hardcoding; STOP if they differ from these.)
   - Array caps: `wall.length <= 144`, `deadWall.length <= 144`,
     `discardPile.length <= 144`, `turnHistory.length <= 2000`, each
     `playerDiscards` value an array ≤ 144.
   - Every tile (walk wall, deadWall, discardPile, each player's hand/flowers, each
     meld's `tiles`, each `playerDiscards` array, `lastDrawnTile`/`lastDiscardedTile`/
     `winningTile` when present) is an object with string `id` and string `suit`.
   - **Multiset legality**: count tiles by kind key
     (`${suit}_${number ?? wind ?? dragon}`) across wall + deadWall + discardPile +
     hands + melds + flowers; no standard kind > 4; total ≤ 144. (Bonus tiles: key by
     suit+number; no kind > 1 if the Tile model gives each flower/season a distinct
     number — verify in `web/models/Tile.ts` and relax to ≤8 total bonus tiles if not
     distinguishable.)
3. For the match payload (if present): `playerScores` array of 4 finite numbers,
   `playerNames` array of 4 strings, `phase` a string, `handResults` an array ≤ 200.

Keep it dependency-free and total (never throws — wrap field access defensively).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Wire it into loadGame

In `web/lib/matchStorage.ts`, after the version gate and BEFORE the `*FromJson` calls:

```ts
const validation = validateSavedGamePayload(parsed);
if (!validation.ok) {
  clearSavedGame();
  return null;
}
```

Behavior contract: invalid snapshot → storage cleared, `null` returned, caller
(`useGameController` init effect) falls through to `startNewGame` — a clean fresh
start, never partial revival.

**Verify**: `npx vitest run lib/__tests__/storageService.test.ts` → still passes
(valid saves are unaffected).

### Step 3: Write the validation tests

Create `web/lib/__tests__/matchStorage.validation.test.ts`, modeled structurally on
`web/lib/__tests__/storageService.test.ts`. Build a VALID baseline payload by
constructing a real match via `initializeMatch` from `@/engine/matchManager` (with a
fixed `seed: 'validation-test'` for determinism), saving it with `saveGame`, and then
tampering with `JSON.parse(localStorage.getItem('mahjong_match_in_progress'))` per case.

Cases (each: tamper → `loadGame()` returns `null` AND
`localStorage.getItem('mahjong_match_in_progress')` is null afterward):

1. Valid baseline → `loadGame()` returns non-null (control case; storage NOT cleared).
2. Player hand inflated to 200 copies of one tile.
3. Five copies of the same tile kind split across wall and a hand.
4. `players` array with 3 entries.
5. `currentPlayerIndex: 99`.
6. `phase: 'hacked'`.
7. `turnHistory` inflated to 5000 entries.
8. `playerScores: ['a','b','c','d']` on the match.
9. Non-object garbage: `localStorage.setItem(KEY, '"just a string"')`.

**Verify**: `npx vitest run lib/__tests__/matchStorage.validation.test.ts` → 9 pass.

### Step 4: Update the tracker and run everything

In `SECURITY_REMEDIATION.md`, find "### [On-next-touch] Schema validation on snapshot
revival" and change `- **Status:** Open` to
`- **Status:** Fixed — hand-rolled validator at web/lib/savedGameValidator.ts, wired into loadGame; rejected snapshots are cleared whole.`

**Verify**: `npm test` → exit 0; `npm run lint` → exit 0; `npm run typecheck` → exit 0.

## Test plan

Step 3 is the test plan: 1 control + 8 rejection cases in
`web/lib/__tests__/matchStorage.validation.test.ts`, following the existing
storage-test pattern (real jsdom localStorage, no mocks of the modules under test).

## Done criteria

- [ ] `web/lib/savedGameValidator.ts` exists, dependency-free, exported `validateSavedGamePayload`
- [ ] `loadGame` rejects invalid payloads by clearing storage and returning null (tests prove it)
- [ ] 9 new tests pass; `npm test`, `npm run typecheck`, `npm run lint` all exit 0
- [ ] `SECURITY_REMEDIATION.md` status updated
- [ ] `git status` shows only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `GamePhase`/`turnPhase` enum values in `web/models/GameState.ts` differ from the
  strings listed in Step 1 (use the real ones; if they're not plain strings, report).
- `initializeMatch` does not accept a `seed` option (check
  `web/engine/matchManager.ts:30-31` — it did at planning time).
- Validating the baseline (untampered) save FAILS — your invariant is stricter than
  reality; report which check and the actual value rather than loosening silently.
- You need to modify `gameStateFromJson`/`matchStateFromJson` to make validation work.

## Maintenance notes

- Any future change to `GameState`/`MatchState` serialized shape must update the
  validator in the same PR — reviewers should treat `savedGameValidator.ts` and the
  `*ToJson`/`*FromJson` functions as a matched pair.
- When the save format gains a v2 (the seed+action-log replay format — see plan 010),
  the validator needs a v2 branch; the version gate already exists in `loadGame`.
- Deliberately NOT validated: semantic legality of melds (e.g. chow sequences) —
  multiset + caps + shape checks cover the corruption/DoS threat at the storage
  boundary without re-implementing engine rules.
