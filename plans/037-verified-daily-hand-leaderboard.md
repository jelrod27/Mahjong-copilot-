# Plan 037: Verified Daily Hand leaderboard — the hedge ROADMAP §P3 recommended

> **Executor instructions**: Steps 1–3 are engine and storage work with no
> backend. Step 4 needs a hosting decision and must not begin before it is
> made. Honour the STOP conditions. Update the status row in `plans/README.md`
> when done.

## Status

- **Priority**: P1
- **Effort**: M (steps 1–3), L (step 4)
- **Risk**: LOW for steps 1–3 (pure additions, no runtime behaviour change)
- **Depends on**: 010 (design spike, DONE), 029 (CSPRNG seed, DONE)
- **Category**: direction
- **Planned at**: commit `59dc9bd`, 2026-08-30

### Why 037 and not 030

`027 §Build ladder` reserves **030–036** for the Cloudflare Worker ladder. This
plan is a different track and must not consume one of those numbers, or the
ladder's dependency table stops making sense. It takes the next free number.

## Why this matters

`ROADMAP-round-3.md §P3` assessed multiplayer as architecturally ready and
recommended against building it, on a ground that has not changed:

> The binding constraint is population, not architecture — mahjong needs *four*
> simultaneous humans, and an unfillable lobby is worse than no multiplayer.

It named a specific alternative — a verified-replay Daily Hand leaderboard —
and Round 4 then reassigned `027` to multiplayer architecture, so **the hedge
was never written**. This is that plan.

The product already ships the hard half. `lib/dailyHand.ts` serves one seeded
hand per UTC day, identical for every player worldwide, with streaks and a share
card. What it does not have is anybody to compare against: results live in
`localStorage` and no two players ever meet.

A leaderboard closes that with **twelve users and nobody online at the same
time**, which is the property multiplayer cannot have at this population.

**It is a hedge, not a detour.** §P3: the replay work is "a hard prerequisite
for competitive multiplayer anyway". Steps 1–3 are owed whether or not 030 is
ever built, and server-verified replay is also the anti-cheat story for ranked.

## Current state (verified at `59dc9bd`)

Spike `010` listed three prerequisites. Two have since landed:

| Prerequisite | State |
|---|---|
| CSPRNG-grade seed source | **Done** — `crypto.getRandomValues` in `engine/rng.ts`, delivered by 029 |
| Append-only action log | **Not built** — `actionLog` appears nowhere in the tree |
| `replayHand(seed, actions)` | **Not built** — nothing re-simulates |

Two facts that change the spike's scope and must be checked before coding:

1. **`SAVE_VERSION` is already 2**, and v2's addition was a *presentation* log
   (`PresentationLog` in `savedGameValidator.ts`), reserved for #120 and
   currently written by nothing. It is **not** an action log and must not be
   overloaded into one — they have different consumers, different retention, and
   #120 owns that slot.
2. **`GameState.turnHistory` already records `{turnNumber, playerId, action,
   tile, timestamp}` and already serialises** (`gameTurnToJson`). Decide in
   Step 1 whether it *is* the action log or merely resembles one. It carries a
   `timestamp: Date`, which is non-deterministic and must never feed re-simulation.

The spike's §8 sketch also routes the verifier to `web/supabase/`. **That is
stale**: there is no Supabase client in the tree. Step 4 revisits hosting.

## Scope

**In scope**: a persisted action log, a pure `replayHand`, and the verification
path that makes a submitted score trustworthy.

**Out of scope**: any Worker or Durable Object; ranked; Elo; matchmaking;
multiplayer transport of any kind. If a step seems to need one, stop.

## Commands you will need

```bash
cd web
npx vitest run engine/__tests__/replay.test.ts
npm run test:coverage   # thresholds are a CI gate, not a report
```

## Steps

### Step 1: Decide the action log's shape, and write it down

Answer, in `plans/spikes/replay-format-design.md` or a short ADR:

- Is `turnHistory` the action log, or does an `actionLog` sit beside it?
- Where does the log live in the save — a v3 bump, or an optional decoration on
  v2 the way `PresentationLog` is? **Note the trap already documented in
  `savedGameValidator.ts`:** `SUPPORTED_SAVE_VERSIONS` must list every version
  ever written literally, and adding one means teaching the migrator.
- What is dropped before logging? `timestamp` at minimum — a replay must not
  depend on a clock.

→ verify: the decision is written down before any code is edited.

### Step 2: Persist the log

Append on every accepted `applyAction` at the controller's funnel, and extend
`savedGameValidator.ts` to validate it. Bound its size the way
`MAX_PRESENTATION_LOG_EVENTS` bounds its neighbour.

→ verify: play a hand, reload, and the log survives with one entry per accepted
action and none for rejected ones.

### Step 3: `replayHand(seed, actions)`

Implement `web/engine/replay.ts` exactly as spiked in §2 — `ReplayResult`,
`ReplayError` with `kind`, `actionIndex` and `reason`. Pure module: no React, no
DOM, no clock. A rejected action is the tamper signal.

Tests, at least:

- **Round trip.** Play a hand to completion, serialise, replay, compare final
  state. This is the load-bearing test.
- **Kong replacement ordering.** Spike §7.3 flags dead-wall consumption across
  multiple kongs in one hand as never having been tested for replay. Do it here.
- **Tamper.** Mutate one logged action; assert a `REJECTED_ACTION` at that index.
- **Seed mismatch.** Replay a log against a different seed; assert failure.

→ verify: `npx vitest run engine/__tests__/replay.test.ts` green, and coverage
thresholds still met.

**Steps 1–3 ship on their own.** They make solo saves verifiable and are owed to
030 regardless. Stop here and the plan has still paid for itself.

### Step 4: Submission and leaderboard — needs a hosting decision first

**Do not start before answering: where does the verifier run?**

The requirement is a stateless HTTP endpoint that re-runs the pure engine over a
submitted `(seed, actionLog)` and stores a row. It needs no WebSocket, no
single-owner-per-room guarantee, no alarms, no hibernation — that is, **none of
the properties ADR 0002 chose Durable Objects for**. Do not reach for the Worker
ladder here; it is the wrong shape and it drags in the second deploy target that
ADR 0002 names as its main cost.

Then: submission requires a log; unverifiable submissions are rejected rather
than shown unverified; the board reads today's UTC key.

## Test plan

- Round-trip, tamper, seed-mismatch and kong-ordering tests from Step 3.
- A submission carrying a tampered log is rejected end to end.
- Existing daily-hand and match-storage tests stay green; `savedGameValidator`
  keeps accepting every version it accepted before.

## Done criteria

- [ ] The log's shape and storage are decided and written down before coding.
- [ ] An accepted action is logged; a rejected one is not.
- [ ] `replayHand` re-simulates a complete hand to an identical final state.
- [ ] Multiple kongs in one hand replay correctly.
- [ ] A tampered log fails with the offending action index.
- [ ] No clock value influences re-simulation.
- [ ] Coverage thresholds still met; no existing save version stops loading.
- [ ] Step 4 only: hosting decided and recorded as an ADR before any code.

## STOP conditions

- **Any step appears to need a Worker, a Durable Object, or a WebSocket.** It
  does not. Stop and re-read the scope.
- **The presentation-log slot looks like a convenient home for the action log.**
  It is not; #120 owns it.
- **A replay test fails in a way that implicates the engine's determinism.**
  That is a bigger finding than this plan — determinism is load-bearing for
  031's redacted broadcast too. Stop and report.
- **Step 4's hosting question is still open.** Steps 1–3 are complete work; ship
  them and stop rather than guessing.

## Relationship to the Worker ladder

This does not replace 030–036 and does not block them. If multiplayer is built
later, `replayHand` is already owed to it, and the leaderboard becomes the
asynchronous mode alongside live play rather than a substitute for it.

If multiplayer is *not* built, this is the version of "compete against real
people" that works at the population the product actually has.
