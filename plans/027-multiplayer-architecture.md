# Plan 027: Multiplayer architecture — private rooms on Durable Objects

> **Executor instructions**: This is an ARCHITECTURE document, not a build
> plan. It records the decisions taken in the design session of 2026-08-22 and
> sequences the build plans (028–036) that implement them. No production code
> changes belong to this plan. Read it before executing any of 028–036, and
> re-read the ADRs it cites.
>
> **Drift check (run first)**: `git diff --stat 630ba76..HEAD -- web/engine/turnManager.ts web/components/game/useGameController.ts web/lib/gameStats.ts web/components/game/OpponentHand.tsx`
> Every "Current state" excerpt below was verified at `630ba76`. On a mismatch,
> re-verify before relying on the excerpt.

## Status

- **Priority**: P2
- **Effort**: XL (38–60 dev-days across 028–036)
- **Risk**: HIGH (new deploy target, new trust boundary)
- **Depends on**: none (028 and 029 are independently shippable)
- **Category**: direction
- **Planned at**: commit `630ba76`, 2026-08-22

## What this supersedes

`plans/ROADMAP-round-3.md` §P3 recommended deferring multiplayer on the grounds
that the binding constraint is population, not architecture. That assessment
still stands and is **not** contradicted here: the operator has chosen to build
anyway, accepting that Find Match will mostly seat AI tables at current scale.
See "Accepted risks" below.

The engine-readiness claims in §P3 were re-verified at `630ba76` and hold.

## The shape

Private rooms, joined by code or link, for four humans. A **Find Match** button
seats the player with AI when nobody else is online. A room is always created by
a real player — AI never initiates a room, it only fills seats in a room a human
made.

Vocabulary is fixed in `CONTEXT.md` at the repo root. The load-bearing points:

- **Hand → Round → Match.** Standard Hong Kong terminology, except at the top
  level: HK sources say "Game", which we cannot use because `GameState` means
  *hand* in 336 places across 77 files. **"Game" is banned** as a domain term.
- **Seat and Occupant are separate.** A seat is continuous for the life of a
  match and holds the score, the seat wind, the melds and the discards. Who is
  driving it — a player, or the AI standing in for an absent one — can change
  mid-match. Every reconnect, takeover and stats question resolves cleanly once
  these are distinct, and is unrepresentable when they are not.

## Decisions

Recorded as ADRs; read those for the reasoning and the rejected alternatives.

| Decision | Where |
|---|---|
| Guest identity via claimable server-issued player tokens | `docs/adr/0001-guest-identity-with-claimable-player-tokens.md` |
| Durable Objects hold authoritative room state | `docs/adr/0002-durable-objects-for-room-authority.md` |
| Simultaneous claim window, eligible players only | `docs/adr/0003-simultaneous-claim-window.md` |

Decisions that did not warrant an ADR, recorded here:

- **Redaction shape.** `redactFor(state, seat) → RedactedState` substitutes
  face-down placeholder tiles while preserving array lengths (wall count and
  opponent hand size are legitimately public). `RedactedState` is a **branded
  type** and the transport accepts only that, so sending unredacted state is a
  compile error. Chosen over a separate `PlayerView` type because it fixes
  existing leaks *by construction* rather than requiring every consumer to be
  audited — see "The verified leak" below.
- **Seed handling.** The DO holds the hand seed and never sends it during play.
  It is revealed at hand end, so all four players can replay-verify the deal
  against the pure engine. This closes the shared-seed hole flagged in
  `plans/spikes/replay-format-design.md` §7 Q5 and reuses that spike's design.
- **Client seam.** A separate `useOnlineController` implementing the existing
  `GameController` interface, rather than injecting a transport driver into
  `useGameController`. The solo path is not modified at all, so solo play cannot
  regress. Solo-only interface members are nulled online; if `GameBoard` starts
  branching on those nulls, that is the signal to split the interface — do not
  pre-split it.
- **Assists are a room setting**, chosen by the host and visible to everyone at
  the table. Default on. A learning product should not ban its own teaching
  aids, and visibility removes any sense of a hidden advantage.
- **Rooms expire after 7 days idle.**

## Current state (verified at `630ba76`)

### What is already right

- `applyAction(state, playerId, action)` (`web/engine/turnManager.ts:248`) takes
  the actor explicitly and validates it. Exactly the shape server authority
  needs; no refactor.
- The engine is deterministic and seeded (`web/engine/rng.ts`), with
  `randomSeed()` documented as the only non-deterministic call site.
- Zero runtime dependencies, no React/DOM imports — runs in the Workers runtime
  unmodified.
- `resolveClaimRequests` (`web/engine/claiming.ts:220`) resolves claim priority
  over a *set*, with no notion of arrival order and the correct HK turn-order
  tie-break. Network jitter cannot change an outcome. This is the single most
  valuable thing the existing code contributes.
- `presentation/events.ts` derives what visibly moved from
  `(prev, action, next)`, so a client receiving new authoritative state can
  animate it without the server sending animation instructions.
- Exactly **one** call site of `applyAction` outside the engine —
  `web/components/game/useGameController.ts:373`.

### The verified leak

`web/components/game/OpponentHand.tsx` builds face-down tiles as:

```tsx
tile={player.hand[i] || { id: `ph-${i}`, ... }}
```

The **real tile** is passed to `RetroTile` and `showBack` hides it visually.
Harmless in solo; every opponent's hand is DOM-readable in multiplayer. Under
the chosen redaction shape this component becomes correct with **no change** —
the tile it receives is already a placeholder.

### Timers are client-side and must invert

Both authoritative clocks live in React effects and are trivially disabled from
devtools:

- Discard timeout — `web/components/game/useGameController.ts:785-823`, default
  20s (`game.turnTimeLimit ?? 20`), auto-discard falling back in the order
  selected tile → last drawn tile → last tile in hand.
- Claim timeout — `CLAIM_TIMEOUT_STANDARD = 10000`,
  `CLAIM_TIMEOUT_TRAINING = 20000` (`:75-77`).

Online, the DO alarm becomes authoritative and the client countdown becomes
decoration.

### Pre-existing defects found during design (not in scope here)

- `claimableIds` is assigned and never read at
  `web/engine/turnManager.ts:375`. Its comment states the correct intent
  ("Only include players who actually have claims available") while the state
  receives `allNonDiscarderIds`. Addressed by plan 028.
- `web/content/glossary.ts:33` defines Seat Wind as "for the current round"; it
  rotates per hand (`getSeatWinds` derives it from the dealer, and the dealer
  rotates each hand). `web/content/glossary.ts:41` defines Exhaustive Draw as
  "the round ends with no winner"; the hand ends. Both are player-facing
  teaching content. Not scoped to a plan yet.

## Build ladder

Each rung adds one layer. 028 and 029 are independently shippable and improve
the product whether or not multiplayer follows.

| # | Plan | Effort | Depends on |
|---|---|---|---|
| 028 | Simultaneous claim window (**solo first**) | M | — |
| 029 | Redaction layer, branded `RedactedState`, CSPRNG seed | M | — |
| 030 | Worker + DO skeleton: room create/join by code, guest tokens, seat claim links | L | 029 |
| 031 | Authoritative hand loop: intents → `applyAction` → redacted broadcast; seed revealed at hand end | L | 028, 029, 030 |
| 032 | Deadlines and AI takeover via DO alarms | M | 031 |
| 033 | `useOnlineController` + `GameBoard` wiring | M | 031 |
| 034 | Match layer online (`quick`), between-hands flow, room persistence and 7-day expiry | M | 031 |
| 035 | Find Match, AI fallback, honest labelling | S | 034 |
| 036 | Stats: `online` bucket, classification by human seat count at deal | S | 034 |

**Milestone `single`** is reached at 033 — one hand, four humans, redacted,
deadline-enforced. It is a milestone, not a release: nobody organises four
friends for five minutes.

**Release target is `quick`** (East round), reached at 036. `full` is gated —
not because it is much code, but because a two-hour match is where every
reconnect and abandonment problem surfaces.

### Out of scope for v1

No spectating, no chat, no ranked, no accounts, no rematch history, no public
matchmaking beyond the Find Match button described above. The archived Elo
helpers (`docs/archive/ranked-elo/`) stay archived.

## Stats integration (detail for 036)

`MatchResult` (`web/lib/gameStats.ts:94`) requires
`difficulty: 'easy' | 'medium' | 'hard'`, which a table of four humans does not
have. `getCurrentRank()` and `getAchievements()` both derive from this store, so
the decision propagates.

- Add an `online: { played, won }` bucket to `GameStats`. **Not** a fourth
  difficulty.
- Classify by **what the table was, not which button was pressed**: four seats
  human-occupied at the deal records as online; a Find Match table filled with
  AI records as solo at medium.
- A match that started with four humans stays an online match even if AI stood
  in for a departed occupant. Record the fact for the result screen; do not
  reclassify.
- Both count toward ranks.
- `loadStats()` must merge defaults over existing payloads, or players with a
  stored `16bit-mahjong-stats` get `undefined` where a counter belongs.

## Accepted risks

1. **Population.** At the user base `ROADMAP-round-3.md` describes, Find Match
   will seat AI tables on essentially every press. The operator has accepted
   this knowingly; the mitigation is honest labelling, not a fake queue.
2. **Second deploy target.** The Worker carries its own CI, secrets, and
   `wrangler` local-development story, and it falls on a solo maintainer. This
   is the main cost of ADR 0002.
3. **Two controllers to keep in step** when `GameController` changes.
4. **Claim-window timing leak**, accepted deliberately — see ADR 0003. Do not
   "fix" it without reading that ADR.
5. **`Date.now()` in the Workers runtime** is pinned to the last I/O for
   side-channel reasons. The engine calls `new Date()` for `createdAt`,
   `turnStartedAt` and `finishedAt`. `plans/spikes/replay-format-design.md` §5
   already excludes all four timestamp fields from replay comparison, so this
   does not affect verification — but do not introduce logic that depends on
   wall-clock precision inside the engine.

## Open questions for the operator

1. **Host powers beyond settings.** The host picks match mode, faan minimum and
   assists. Can they also kick a seat, or start short-handed? Not decided.
2. **What the room shows a returning player** who missed three hands. A
   summary, or straight back into live play?
3. **`full` match gating** — ship it when `quick` is stable, or hold until
   reconnect has been exercised against real abandonment?
