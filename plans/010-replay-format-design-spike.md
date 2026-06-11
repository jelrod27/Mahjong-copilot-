# Plan 010: Design spike — seed + action-log replay format (pre-multiplayer gate)

> **Executor instructions**: This is a DESIGN SPIKE, not a build plan. The
> deliverable is a design document plus a small proof-of-concept test — no
> production code changes. Follow the steps, honor the STOP conditions, and
> update the status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat efb5a21..HEAD -- web/engine/rng.ts web/engine/turnManager.ts web/lib/matchStorage.ts SECURITY_REMEDIATION.md`
> If these changed since planning, re-read them before writing the design.

## Status

- **Priority**: P2
- **Effort**: M (time-boxed spike: ~1 day)
- **Risk**: LOW (no production code changes)
- **Depends on**: none (plan 007 touches the same save-version gate — coordinate, don't block)
- **Category**: direction
- **Planned at**: commit `efb5a21`, 2026-06-11

## Why this matters

Multiplayer, ranked play, anti-cheat, and shareable replays all hang off one
capability: re-simulating a hand from `(seed, action-sequence)` and getting an
identical result. `SECURITY_REMEDIATION.md` lists this as the "[Before-multiplayer]"
gate. **Half of it is already built** — and the tracker is stale about that:
`web/engine/rng.ts` ships a seeded deterministic RNG (mulberry32 + FNV-1a hash),
`turnManager.initializeGame` threads a seed through the shuffle, and the AI uses
stateless `deterministicNoise` (verified: `easyAI.ts` imports it; no `Math.random` in
AI decision paths). What does NOT exist: an append-only action log in the save format,
a `replayGame(seed, actions)` re-simulation function, and a CSPRNG-grade seed source.
This spike produces the design that makes the build plan honest, and corrects the
stale tracker entry.

## Current state (verified at planning time)

- `web/engine/rng.ts` — complete deterministic RNG module. Header comment: "Every game
  carries a seed; the wall shuffle and all AI randomness derive from it, so a
  (seed, action-sequence) pair fully determines a game." Exports `createRng(seed)`,
  `deterministicNoise(...parts)`, `shuffleInPlace(arr, rng)`, and:

  ```ts
  export function randomSeed(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  ```

  (`Math.random`-derived — fine for solo, guessable for competitive integrity.)

- `web/engine/turnManager.ts:135-175` — `initializeGame` uses
  `options.seed ?? randomSeed()`, shuffles with `createRng(seed)`, stores `seed` on
  the state and derives `gameId = "game_" + seed`.
- `web/engine/matchManager.ts:30-41` — `initializeMatch` accepts `seed` for the FIRST
  hand only ("Daily Hand / seeded puzzles"); subsequent hands via `createHand(...)`
  (line 249 region) take an optional seed parameter.
- `web/engine/turnManager.ts` — `applyAction(state, playerId, action) → newState | null`
  is the single mutation path; `GameState.turnHistory` already records per-turn
  entries (see `gameTurnToJson` in `web/models/GameState.ts`), but turnHistory is a
  UI/review artifact, NOT a verified replay log (it does not claim to be replayable
  input).
- `web/lib/matchStorage.ts` — saves full state snapshots, `SAVE_VERSION = 1`. Snapshot
  saves can never be verified after the fact; only seed+log saves can.
- `SECURITY_REMEDIATION.md` — "[Before-multiplayer] Seedable CSPRNG and seed+log
  replay format", Status: Open. Its description ("Shuffle and gameId use Math.random
  and timestamps; easy AI adds non-deterministic jitter") is **stale** — rng.ts
  superseded it.
- Engine test conventions: `web/engine/__tests__/` — pure TS tests, see
  `fullGameSimulation.test.ts` for driving full hands through `applyAction`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| PoC test | `cd web && npx vitest run engine/__tests__/replayDeterminism.spike.test.ts` | passes |
| Suite still green | `cd web && npm test` | exit 0 |

## Scope

**In scope** (creations only):
- `plans/spikes/replay-format-design.md` (create — the deliverable)
- `web/engine/__tests__/replayDeterminism.spike.test.ts` (create — proof-of-concept)
- `SECURITY_REMEDIATION.md` (update the stale "[Before-multiplayer]" item: mark the
  seedable-RNG half done, pointing at `web/engine/rng.ts`; keep the replay-log half
  Open, pointing at the new design doc)

**Out of scope** (do NOT touch):
- Any production code in `web/engine/`, `web/lib/`, `web/models/` — this spike ships
  zero behavior changes.
- Implementing the v2 save format, the replay function, or the CSPRNG seed — those
  become build plans after the design is reviewed.
- Multiplayer transport, rooms, or Supabase schema.

## Git workflow

- Branch: `feature/replay-format-spike`
- Commit message style: `docs(spike): seed+action-log replay format design`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prove determinism empirically (the PoC test)

Create `web/engine/__tests__/replayDeterminism.spike.test.ts`:

1. **Same seed → same deal**: call `initializeGame` twice with
   `{ seed: 'spike-1', ... }` (mirror the options shape used in existing engine tests
   — copy setup from `fullGameSimulation.test.ts`) and assert deep-equal walls and
   hands.
2. **Same seed + same action sequence → same end state**: drive a scripted sequence
   of ~10 `applyAction` calls (draw/discard loops; reuse helpers from
   `engine/__tests__/testHelpers.ts` if suitable) against two independently
   initialized games with the same seed; assert the resulting states are deep-equal
   (compare via `gameStateToJson` to normalize Dates — or strip `createdAt`/
   `turnStartedAt`/`finishedAt` fields first; document which fields are
   non-deterministic).
3. **AI determinism**: with identical states, assert `getAIDecision(state, idx)`
   returns identical decisions across repeated calls.

The non-deterministic fields you discover in (2) — timestamps, anything else — are a
KEY design input: list every one in the design doc.

**Verify**: `npx vitest run engine/__tests__/replayDeterminism.spike.test.ts` → passes;
`npm test` → exit 0.

### Step 2: Write the design doc

Create `plans/spikes/replay-format-design.md` covering, concretely:

1. **SavedGame v2 format** — proposed shape:
   `{ version: 2, matchSeed, handSeeds: string[], actionLog: LoggedAction[], snapshot?: ... }`
   where `LoggedAction = { handIndex, playerId, action: GameAction }`. Decide and
   justify: are AI actions logged (recommended: YES — log every applyAction input;
   re-deriving AI decisions couples replay validity to AI version) vs re-derived.
2. **Re-simulation API** — `replayHand(seed, actions): GameState` in a new
   `web/engine/replay.ts`; define its failure mode (an action the engine rejects →
   structured error with index, for tamper detection).
3. **Versioning & migration** — how v1 snapshot saves are handled (recommendation:
   v1 loads keep working until expiry; new saves write v2; document that v1 saves are
   not verifiable). Note the interaction with plan 007's validator (it gates on
   `version === 1` — v2 needs its own validation branch).
4. **CSPRNG seed** — replace `randomSeed()`'s `Math.random` with
   `crypto.getRandomValues` (available in browsers and Node 18+; engine stays
   dependency-free). State the constraint: rng.ts header says non-determinism is
   allowed ONLY in `randomSeed`.
5. **Non-deterministic fields inventory** — from Step 1; for each: exclude from
   comparison, or make it derived/logged.
6. **Mid-hand resume vs replay** — resume needs either (snapshot) or
   (seed + log replayed to current point); recommend log-replay resume and keep the
   snapshot only as a fallback/migration artifact, OR justify keeping both.
7. **Open questions for the operator** — e.g. retention/size budget for action logs in
   localStorage, whether Daily Hand leaderboards should require log submission, kong
   replacement-draw ordering edge cases to test in the build phase.
8. **Build-plan sketch** — ordered list of the 3–4 implementation plans this design
   implies, with rough effort.

**Verify**: doc exists and addresses all 8 sections (self-check against this list).

### Step 3: Correct the stale tracker

In `SECURITY_REMEDIATION.md`, edit the "[Before-multiplayer]" item: status stays Open,
but the Description/Fix text gets a dated note: seedable deterministic RNG landed in
`web/engine/rng.ts` (shuffle + AI noise are seed-derived; verified 2026-06-11); the
remaining work is the CSPRNG seed source and the seed+action-log persistence/replay
format, designed in `plans/spikes/replay-format-design.md`.

**Verify**: `grep -n "rng.ts" SECURITY_REMEDIATION.md` → at least 1 match.

## Test plan

The PoC test from Step 1 (3 cases). It is a spike artifact — name it
`*.spike.test.ts` so a future build plan can promote or replace it; it must
nonetheless pass in CI (`npm test` green).

## Done criteria

- [ ] `plans/spikes/replay-format-design.md` exists with all 8 sections
- [ ] `web/engine/__tests__/replayDeterminism.spike.test.ts` passes; `npm test` exit 0
- [ ] `SECURITY_REMEDIATION.md` updated (RNG half marked done with evidence; replay half points at design doc)
- [ ] Zero production code modified (`git status`: only the three in-scope files)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 case 2 FAILS — the engine is NOT deterministic for same seed + same actions.
  That is a major finding on its own: identify the non-deterministic source
  (timestamps in decision paths? residual Math.random?) and report it; the design
  cannot proceed on a false premise.
- `initializeGame`'s options no longer accept `seed` (drift).
- You find yourself implementing `replay.ts` or the v2 format for real — that's the
  build phase; the spike delivers the design.

## Maintenance notes

- This design gates: multiplayer, ranked/leaderboard, shareable replays, Daily Hand
  score verification. Sequencing recommendation remains: replay format → multiplayer
  transport → leaderboard (trusting client scores without replay verification is the
  failure mode to avoid).
- Plan 007's validator and this design both touch the save-version gate in
  `matchStorage.ts` — whichever lands second must account for the other.
- The `turnHistory` field already serialized in saves overlaps conceptually with the
  action log; the design doc should explicitly decide whether to unify or keep them
  separate (review/UI artifact vs verified input log).
