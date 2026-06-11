# Phase 6: Retention and the Daily Loop

Date: 2026-06-10. The tomorrow-hook — the single biggest retention failure
named in Phase 0 — now exists. Suite green, verified live.

## The Daily Hand (live)

- One seeded hand per UTC day (`daily-YYYY-MM-DD`), identical for every
  player in the world — the Phase 1 seedable engine paying off. Fixed
  roster and personalities keep even the AI deterministic.
- New `single` match mode in the engine: the match ends after one hand
  (also the future home of skill puzzles).
- Flow: home card ("DAILY HAND · One seeded hand. Same deal as every
  player in the world.") → `/play/game?daily=1` → the result dialog with
  outcome, faan bar, Gam's streak-aware line, and the share card.
- **Share card**: emoji-free plain-ASCII text (verified by test) with the
  date, result, a `[######....]` faan bar, the streak, and the URL.
  Native share where available, clipboard otherwise.
- First play of the day is the recorded one; replays never overwrite.

## Streaks that never punish

- Streak = consecutive days PLAYED (win, draw, or loss — showing up is the
  metric). Missing a day resets the count but the best streak is kept
  forever; no content is ever lost.
- **The mentor carries the streak**: Uncle Gam's greeting changes with it
  ("Day 4 of your streak, if you sit down now." / "Seven days straight.
  The regulars are asking about you.") on the home card and in the daily
  result dialog.

## Achievements (pixel badges)

Ten HK-flavored badges derived purely from existing stores (no new write
paths, so they can never disagree with the stats screen): Sik Wu (first
win), Regular, Big Hand (6 faan), Limit Breaker, the three Parlour keys,
Parlour Legend, Three Mornings and The Full Week (daily streaks). Rendered
as glyph tiles on the progress screen, locked ones dimmed.

## The online seam (docs/design/online.md)

Local-first leaderboard plumbing documented as a real design: the
date-keyed daily results map 1:1 onto a leaderboard table; deterministic
seeds mean the server never deals hands (and can later validate claimed
scores by replaying action logs against the seed with the same pure
engine); monotonic progress stores make sync conflict-free via max().
Solo play never requires an account — identity is an upgrade, not a gate.

## Tests

`lib/__tests__/dailyHand.test.ts` (6): UTC date keying, streak extension
across outcomes, missed-day reset preserving best, alive streak with
unplayed today, first-play-wins, and the ASCII-only share card.

## Backlog

- Daily leaderboard panel (signed-in) per the online seam.
- Achievement unlock toasts (currently visible on next progress visit).
- Daily Hand calendar view (history exists in the store already).
