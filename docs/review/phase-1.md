# Phase 1: Engine and Rules Audit

Date: 2026-06-10. Method: deep code audit by a rules-expert agent with
empirical repro verification, plus hands-on fixes and a new test pass
(engineCorrectness, faanPatterns, fullGameSimulation). All findings below
were reproduced through the real `applyAction`/`calculateScore` paths before
fixing. Suite: 521 tests passing, typecheck and lint clean.

## Fixed this phase

### P0 — wrong winner / wrong payment / illegal state

1. **A player with a kong could never win.** `canPlayerWin` required exactly
   14 physical tiles; a kong contributes 4, so any kong-holding hand was
   rejected forever. Fixed with an effective-tile count (kong counts as 3).
   `winDetection.ts`.
2. **Winners with exposed melds scored 0-fan chicken hands.** `calculateScore`
   decomposed only concealed tiles through a path requiring exactly 14, so any
   claimed pung/chow/kong collapsed the hand to chicken — and therefore could
   never pass the 3-faan minimum: claiming a single meld doomed the hand at
   standard tables. Fixed via `findDecompositionsWithMelds` (decomposition
   seeded with exposed melds). The entire pre-existing scoring suite passed
   before this fix because it only ever tested concealed hands.
3. **Payment was non-monotonic at the limit: a 9-fan hand paid 4096, a limit
   hand paid 256.** The best-decomposition loop would even prefer a 9-fan
   reading over a 10-fan limit reading. `MAX_PAYMENT` is now `8 × 2^10 = 8192`,
   making payment monotonic and the limit the most valuable hand. (CLAUDE.md
   updated to match.)
4. **Chow was accepted from any seat.** `handleClaim` validated meld shape but
   not seat; only UI convention prevented an off-seat chow. The engine now
   enforces chow-from-left at its trust boundary.
5. **Non-win claims during a rob-the-kong window duplicated tiles.** A chow or
   pung claimed against the kong tile formed a meld with a tile still in the
   declarer's hand, and left the rob flag set for the rest of the hand
   (silently awarding a bogus +1 fan to any later win). Rob windows are now
   win-only.
6. **AI declared wins the engine rejected, freezing the hand.** All tiers
   gated wins on `canPlayerWin` alone, ignoring the minimum faan; the engine
   refused, nothing re-triggered, permanent stall. Fixed three ways: AI now
   uses `canDeclareSelfDrawnWin` (full legality), claim offers flow through
   `getLegalClaims` (min-faan-filtered), and the controller has a
   never-stall fallback (failed special action degrades to discard/pass).
7. **A discard-win lost a tile from the 144-tile universe.** The winning tile
   was removed from the discard pile but never added to the winner's hand
   (and on a robbed kong it stayed in the declarer's hand). Caught by the new
   full-game simulation's conservation invariant; fixed in
   `resolveAndApplyClaim`.

### P1 — wrong fan counts / missed rules

8. **Seven Pairs stacked with chow fans for the same tiles** (e.g. an
   all-chows reading also pocketed +4 Seven Pairs). A hand is now scored
   under one decomposition at a time.
9. **Flowers were double-counted** (1 fan per flower plus 1 more per
   seat-match). Now standard HK: seat-matching flowers 1 fan each, complete
   set of 4 flowers or seasons 2 fan, no bonus tiles 1 fan, non-matching 0.
10. **Phantom self-draws after claims.** After claiming a pung/chow, a player
    could DECLARE_WIN against a stale `lastDrawnTile` from another player's
    turn — scored as self-draw with a tile not in their hand. Claim
    resolution now clears draw-derived state, and `handleSelfDrawnWin`
    verifies the drawn tile is in the declarer's hand.
11. **Deferred-kong flower replacement left the bonus tile in hand** (losing
    the flower and corrupting hand size). Now routed through flower handling
    like every other replacement path; discarding bonus tiles is also now
    rejected at the engine level.
12. **Duplicate tile references in a claim fabricated melds.** A pung claim
    citing the same physical tile twice grew the player's hand permanently.
    Claims now require distinct tile ids.
13. **Last-tile fans were unreachable from the engine** (the min-faan gate
    never derived them, so a hand legal only via Last Tile Draw/Claim was
    wrongly rejected). Win-method derivation (`deriveWinMethod`) is now the
    single source of truth, stored on the finished state, and used by gate,
    UI, and replays alike.
14. **Heavenly and earthly hands were missing.** Implemented as limit hands
    detected from real game state (dealer first-draw self-draw before any
    discard/claim; non-dealer claiming the dealer's very first discard).
15. **Four Concealed Pungs wrongly required self-draw in all cases.** Now
    also awarded when the discard completes the pair (standard HK).
16. **Initial flower replacement ignored the dealer order.** Replacements now
    proceed from East in turn order.

### Foundation: determinism

17. **The engine is now fully seedable.** `engine/rng.ts` (mulberry32 + FNV
    hash): `initializeGame` takes a `seed`, stores it on `GameState`, and the
    shuffle and all AI jitter (`deterministicNoise`) derive from it. A
    (seed, action-sequence) pair replays a game exactly — verified by test.
    This unblocks replays, seeded puzzles, and the Daily Hand (Phases 4-6).
18. **Exact tenpai in the money path.** Wall-exhaustion noten settlement used
    the explicitly-heuristic shanten estimate; it now brute-forces all 34
    tile kinds through `canPlayerWin` (authoritative).
19. **Claim resolution unified.** `resolveAndApplyClaim` reimplemented the
    priority logic privately; both now flow through
    `claiming.resolveClaimRequests` (win > kong > pung > chow, tie to the
    claimant closest to the discarder).

## Test coverage added

- `engineCorrectness.test.ts` (24): determinism, kong wins, exposed-meld
  scoring, win methods, heavenly/earthly, exact tenpai, claim priority.
- `faanPatterns.test.ts` (44): every implemented fan pattern positive +
  negative/boundary, payment math, min-faan boundaries.
- `fullGameSimulation.test.ts` (7): seeds × full AI-driven hands with
  144-tile conservation asserted at every step, termination, zero-sum
  settlement, full quick-match dealer rotation, seed-replay identity.
  This suite is what caught fix #7.

## Verified correct (audited, no bug)

- matchManager dealer rotation and round advancement across a full 4-round
  trace; quick mode ends after East; seat winds follow the dealer.
- Payments and noten settlements are zero-sum.
- Win+pung offered together on one discard resolves win-first.
- Turn continues to the claimant's right after claims.
- Wall exhaustion during any replacement path ends in a draw game.
- Own-discard claims are blocked.
- **No AI tier reads hidden information.** All three consume only public
  state (verified line by line; documented in docs/design/ai.md).

## Known gaps deliberately deferred (tracked for BACKLOG.md)

- Thirteen-orphans rob of a concealed kong (classic HK exception) is not
  implemented; concealed kongs currently cannot be robbed at all.
- Four-kong draw rule: `totalKongsDeclared` exists on GameState but nothing
  sets or reads it.
- Nine Gates accepts impure waits (lenient variant).
- Multiple simultaneous winners are resolved to the single highest-priority
  claimant (closest to discarder). This IS a legitimate HK rule choice, now
  documented and tested rather than accidental.
- The dead wall back-fills from the live wall for replacements (approximation
  of the held-back wall convention).
- Economy scale: noten penalty (1500) and starting stack (500) predate the
  monotonic payment fix and deserve a holistic balance pass.
- Nine-tile reshuffle rights: not implemented (was listed "if implemented" —
  it is not).

## Engine API additions for later phases

- `initializeGame({ seed })` / `GameState.seed` — Daily Hand, puzzles, replays.
- `deriveWinMethod`, `buildWinScoringContext` — single source of scoring truth.
- `canDeclareSelfDrawnWin`, `getLegalClaims` — legality-safe AI/UI surface.
- `isTenpai` (exact), `ALL_TILE_PROTOTYPES` — puzzle generation.
