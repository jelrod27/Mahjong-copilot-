# Online Seam: Local-First Leaderboards and Beyond

Constraint (non-negotiable): nothing in the solo game requires an account.
This document describes the seam where accounts and online features attach
later WITHOUT rewriting local systems.

## What exists locally (the sources of truth)

| Store | Key | Contents |
|---|---|---|
| Game stats | `16bit-mahjong-stats` | matches, wins, placements, best fan, quiz mastery |
| Parlour | `16bit-mahjong-parlour` | floors cleared, attempts, epilogue |
| Daily Hand | `16bit-mahjong-daily` | per-day results, best streak |
| Rank seen | `16bit-mahjong-rank-seen` | ceremony bookkeeping |
| Settings | per-key | preferences |

Every derived surface (ranks, achievements, share cards, Gam's greetings)
reads these stores through pure functions in `lib/` — `getCurrentRank()`,
`getAchievements()`, `getDailyState()`, `getParlourProgress()`. UI never
reads localStorage directly.

## The seam

The pure-function layer IS the seam. Online attachment is three steps, none
of which touch game logic:

1. **Identity (optional)**: Supabase auth already exists for multiplayer.
   Solo stays anonymous; linking an account is an upgrade, never a gate.
2. **Sync up (publish)**: a `lib/sync.ts` publisher that, when (and only
   when) a session exists, POSTs snapshots of the four stores to
   per-user rows (`daily_results`, `parlour_progress`, `solo_stats`).
   Local remains the write path; the server is a mirror. Conflict rule:
   server keeps maxima (best streak, highest floor, best fan) — these
   stores are monotonic by design, which makes sync trivially mergeable.
3. **Read down (leaderboards)**: a daily leaderboard is one query over
   `daily_results` for today's date key (fan desc, points desc). The Daily
   Hand result dialog gains a "Global today" panel when signed in; the
   share card already carries the same numbers for the signed-out world.

## Why the local stores were shaped this way

- **Date-keyed daily results** (`results[YYYY-MM-DD]`) map 1:1 to a
  leaderboard table partitioned by day; the UTC date key is already the
  global tournament id.
- **Deterministic seeds** (`daily-YYYY-MM-DD`) mean the server never needs
  to deal hands or validate shuffles for the daily — every client plays
  the same wall by construction. Server-side replay validation of a
  claimed score is possible later (submit the action log; replay it
  against the seed with the pure engine — the engine runs identically in
  an edge function).
- **Monotonic progress** (floors, streak bests, fan bests) merges without
  vector clocks: `max()` is the whole conflict strategy.

## Anti-goals

- No write-through requirement: offline play must never queue-block.
- No server authority over solo scores pre-launch of replay validation;
  the daily leaderboard ships as honor-system with the validation path
  documented above.
- No telemetry smuggled in with sync.
