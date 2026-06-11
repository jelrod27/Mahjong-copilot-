# Replay Format Design — Seed + Action-Log

**Status:** Spike complete  
**Date:** 2026-06-11  
**Author:** Claude Fable 5 (spike) / jelrod27 (operator review needed)  
**Related plan:** `plans/010-replay-format-design-spike.md`  
**PoC test:** `web/engine/__tests__/replayDeterminism.spike.test.ts` (all 3 cases pass)

---

## 1. SavedGame v2 Format

The current `SavedGame` (version 1) persists full state snapshots. The v2 format replaces the `game` snapshot with a seed-plus-log pair that lets the engine re-derive any state from first principles.

### Proposed shape

```ts
// web/lib/matchStorage.ts (future)

interface LoggedAction {
  handIndex: number;      // which hand within the match (0-based)
  playerId: string;       // id of the acting player
  action: GameAction;     // the exact value passed to applyAction()
}

interface SavedGameV2 {
  version: 2;
  matchSeed: string;          // seed used for matchManager (fed to first hand)
  handSeeds: string[];        // per-hand seeds; index = handIndex in LoggedAction
  actionLog: LoggedAction[];  // append-only; one entry per applyAction() call
  snapshot?: {                // optional: last-checkpoint state as JSON for fast resume
    handIndex: number;
    actionCount: number;      // number of actions already replayed to reach this snapshot
    state: Record<string, unknown>;
  };
}
```

### Why log AI actions (recommended: YES)

Every `applyAction` call — including AI draws, discards, and claims — must be logged.
Re-deriving AI decisions during replay couples replay validity to the AI version in
use at replay time. If the AI is ever updated (even a minor tuning change), old logs
would replay differently from what actually happened. Logging AI actions decouples
replay correctness from AI evolution.

The action log is therefore a complete transcript of every `applyAction` call made
during the hand, in order, regardless of who made the decision.

### Size budget (rough)

A full hand averages ~120 actions (draw + discard per turn, ~15 turns × 4 players,
plus claims and bonus tile replacements). Each `LoggedAction` is ~40–80 bytes as JSON.
That is ~5–10 KB per hand, ~20–40 KB per quick match (4 hands), and ~80–160 KB for a
full 16-hand match — well within the ~5 MB localStorage budget for solo play.

---

## 2. Re-simulation API

A future `web/engine/replay.ts` module (pure TypeScript, no React/Redux imports) would
export:

```ts
// web/engine/replay.ts (not yet implemented)

export interface ReplayError {
  kind: 'REJECTED_ACTION' | 'SEED_MISMATCH';
  actionIndex: number;
  action: LoggedAction;
  reason: string;
}

export type ReplayResult =
  | { ok: true; finalState: GameState }
  | { ok: false; error: ReplayError; partialState: GameState };

/**
 * Re-simulate a single hand from its seed and the ordered action log.
 * Returns the final state if every action was accepted, or a structured error
 * at the first rejected action.
 *
 * A rejected action is the canonical tamper signal: if the engine rejects an
 * action that the original client logged, either the log was corrupted/modified,
 * the seed was wrong, or a bug was introduced in the engine since the game was
 * played.
 */
export function replayHand(
  seed: string,
  actions: LoggedAction[],
): ReplayResult;
```

The caller (match storage, leaderboard verifier, or a future server-side edge
function) is responsible for deciding what to do with a `ReplayError`. For client
solo saves, a non-verifiable hand is treated as a draw or discarded. For ranked
submissions, a `ReplayError` causes the submission to be rejected.

---

## 3. Versioning and Migration

### How v1 saves are handled

- `loadGame` already rejects any payload where `version !== 1` (see `web/lib/matchStorage.ts:56-59`).
- v2 saves must change `version` to `2` in the `SavedGame` shape.
- The version gate in `loadGame` must grow a v2 branch:

  ```ts
  if (parsed.version === 1) { /* existing path */ }
  else if (parsed.version === 2) { /* new replay path */ }
  else { clearSavedGame(); return null; }
  ```

- **No automatic v1 → v2 migration.** A v1 save is not re-playable (no action log);
  the only upgrade path is to either replay the action log from scratch (impossible for
  v1) or keep the v1 snapshot revival path alive. Recommendation: keep v1 loads
  working until an expiry date is set by the operator (e.g. 90 days after v2 ships);
  after expiry, clear stale v1 saves on load.

### Interaction with `savedGameValidator.ts`

The current validator at `web/lib/savedGameValidator.ts` gates on `version === 1` and
validates the snapshot structure. A v2 format needs its own validation branch in that
file:

- v2 validator must check: `handSeeds` is a non-empty array of strings, `actionLog` is
  an array of objects with `{ handIndex, playerId, action }`, `matchSeed` is a
  non-empty string, and the optional `snapshot` if present has consistent
  `actionCount` ≤ `actionLog.length`.
- v2 validation does NOT replay the actions (that would be too slow on load); it only
  validates the shape of the persisted data. Full replay happens on leaderboard
  submission or explicit "verify game" user action.

### v1 saves are not cryptographically verifiable

A v1 save can still be loaded and resumed as before, but it cannot be submitted to
the leaderboard for verification. The UI should note this distinction in the "resume"
flow (e.g. a badge "Unverified save — cannot submit to leaderboard").

---

## 4. CSPRNG Seed

`randomSeed()` in `web/engine/rng.ts` currently uses `Math.random()` plus a
`Date.now()` timestamp. This is fine for solo play but guessable by an adversary who
knows approximately when a hand started.

### Replacement

```ts
// web/engine/rng.ts — replace randomSeed() body only

export function randomSeed(): string {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf); // available in browsers (Web Crypto) and Node 18+
  return `${buf[0].toString(36)}-${buf[1].toString(36)}`;
}
```

`crypto.getRandomValues` is the single sanctioned non-deterministic call site in the
engine. All other engine code must be deterministic given a seed.

**Constraint:** the RNG module itself (`rng.ts`) must remain dependency-free and must
not import anything that would pull in Node-only or browser-only polyfills. `crypto`
(the Web Crypto global) satisfies this: it is available unqualified in all supported
runtimes (browsers, Node 18+, Vercel edge). No `import crypto from 'crypto'` needed;
use the global directly.

**Scope:** The change is a one-line body replacement inside `randomSeed()`. Nothing
else in `rng.ts` changes. The caller (`initializeGame`) already threads the seed
through the whole shuffle, so the security upgrade is a single-function edit.

---

## 5. Non-Deterministic Fields Inventory

This inventory was established empirically by the PoC test
(`replayDeterminism.spike.test.ts`, case 2). The test compares two independently
initialised and driven game states after stripping these fields and confirms structural
equality.

| Field | Location | Why non-deterministic | Replay treatment |
|-------|----------|-----------------------|------------------|
| `createdAt` | `GameState.createdAt` | `new Date()` at `initializeGame` call | Exclude from replay comparison; not needed for verification |
| `turnStartedAt` | `GameState.turnStartedAt` | `new Date()` when each turn begins | Exclude from replay comparison; not needed for verification |
| `finishedAt` | `GameState.finishedAt` | `new Date()` when hand finishes | Exclude from replay comparison; record separately if needed for display |
| `turnHistory[*].timestamp` | `GameState.turnHistory[n].timestamp` | `new Date()` at each action | Exclude from comparison; turnHistory is a UI/review artifact, not the replay log |

No other fields were found to be non-deterministic. Specifically confirmed deterministic
(same across independently seeded runs): `id` (derived from seed), `wall`, `deadWall`,
`discardPile`, `playerDiscards`, `players[*].hand`, `players[*].melds`,
`players[*].flowers`, `pendingClaims`, `claimablePlayers`, `passedPlayers`,
`turnPhase`, `phase`, `currentPlayerIndex`, `winnerId`, `winningTile`,
`isSelfDrawn`, `winMethod`, `finalScores`, `drawResult`, `totalKongsDeclared`.

**Design implication:** The replay verifier must strip all four timestamp fields before
comparing the replayed state to a reference. These fields should NOT be included in any
cryptographic hash used for anti-cheat; only the seed, action log, and structural game
fields count.

---

## 6. Mid-Hand Resume vs Full Replay

Two strategies exist for resuming a mid-hand save:

**Option A — Snapshot resume:** Persist a state snapshot at the save point. On load,
deserialise the snapshot directly. Fast (no replay needed), but the snapshot is
unverifiable (a malicious client could modify it).

**Option B — Seed + log replay:** Persist the seed and all actions up to the save
point. On resume, replay the full action log to reconstruct state. Slower (O(n) in
action count) but fully verifiable. A 40-action sequence replays in ~1 ms on current
hardware (confirmed by the PoC test timing).

**Recommendation: Option B with optional snapshot acceleration.**

The `SavedGame v2` format above includes an optional `snapshot` field for exactly this
purpose. The resume path should:

1. If `snapshot` is present and `actionCount === actionLog.length`, use the snapshot
   directly (zero replay cost; the snapshot was generated by the engine from a known
   good state).
2. If `snapshot` is absent or `actionCount < actionLog.length` (new actions were taken
   after the last snapshot), replay the remaining `actionLog.slice(snapshot.actionCount)`
   from the snapshot state (or replay the full log from seed if no snapshot).

This makes snapshots a performance hint, not a trust boundary. The verifier can ignore
snapshots entirely and replay from `(seed, actionLog)`.

Checkpointing strategy: write a snapshot every 20 actions. This bounds the worst-case
replay on load to ~20 actions regardless of hand length.

---

## 7. Open Questions for the Operator

1. **localStorage budget.** The rough size estimate above (~10 KB/hand) is comfortable
   for solo saves. If the app ever stores action logs for multiple past hands (e.g.
   "review your last 10 hands"), the total budget rises to ~100–400 KB. Is that
   acceptable, or should old logs be pruned after submission?

2. **Daily Hand leaderboard requirement.** Should Daily Hand submissions require an
   action log to be included (enabling server-side verification)? Without it, the
   leaderboard is trust-only. Recommendation: yes — require log on submission; display
   "unverified" badge for v1 saves submitted before log support shipped.

3. **Kong replacement-draw ordering edge cases.** The PoC confirmed determinism for
   draw/discard/claim cycles. Kong replacement draws pull from `deadWall`, and the
   ordering of dead-wall consumption across multiple kongs in a single hand has not been
   explicitly tested for replay. This should be a targeted test case in the build phase
   before shipping `replayHand()`.

4. **Server-side replay verification.** Is the target for replay verification purely
   client-side (trust on load, verify on leaderboard submission), or should it happen
   in a Supabase edge function? An edge function can re-run the pure-TS engine in
   Deno with the submitted `(seed, actionLog)` and reject submissions where the
   final state does not match the claimed score. This is the strongest anti-cheat
   posture and does not require any multiplayer transport.

5. **Seed exposure.** The seed is stored in `GameState.id` (as `"game_" + seed`) and
   in `SavedGameV2.matchSeed`/`handSeeds`. For solo play this is fine. For multiplayer,
   all four players sharing a seed means any player could pre-compute the full wall.
   The multiplayer design must either (a) keep the seed server-side and only expose
   each player their own tiles, or (b) use commitment schemes (hash-then-reveal).
   This is out of scope for this spike but must be addressed before any multiplayer
   hand uses a shared seed.

---

## 8. Build-Plan Sketch

The following implementation plans are implied by this design, in recommended order:

| # | Plan | Effort | Depends on |
|---|------|--------|------------|
| 1 | **CSPRNG seed source** — replace `randomSeed()` body with `crypto.getRandomValues`. Wire smoke test. | S | This spike |
| 2 | **SavedGame v2 format + action log** — extend `matchStorage.ts` with v2 shape; append to `actionLog` on every `applyAction` call from `useGameController`; extend `savedGameValidator.ts` with v2 branch. | M | Plan 1 |
| 3 | **`replayHand()` implementation + tests** — implement `web/engine/replay.ts` as designed in §2; add targeted tests for kong replacement ordering; add a round-trip test: play a hand, serialise, replay, compare final state. | M | Plan 2 |
| 4 | **Leaderboard / Daily Hand submission gate** — require v2 action log on submission; edge function verifier in `web/supabase/`; UI "unverified" badge for v1 saves. | L | Plan 3 |

Total estimated effort for plans 1–3 (not including leaderboard gate): ~3–5 engineer-days.
Plan 4 is the multiplayer gate item and should be scoped separately with the
multiplayer transport design.
