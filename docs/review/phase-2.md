# Phase 2: Game Feel (The Balatro Pass)

Date: 2026-06-10. Verified live in the dev server and with the full test
suite (521 passing), typecheck, lint, and a production build.

## What changed

### Tiles travel now

`components/game/TileFlightLayer.tsx` — a Web Animations API flight layer.
- **Discards arc.** A clone tile lifts off from the discarder (the exact hand
  slot for the human, the seat portrait for AI), arcs with a tilt, and lands
  in its discard-pool slot with a settle and a clack. The real tile is hidden
  during flight and revealed on landing.
- **Claims SNAP.** When a meld appears, the claimed tile flies fast and
  straight from its pool position to the claimant's meld row with an
  overshoot scale — the "snatched off the table" feel.
- Position plumbing via `data-flight-tile` / `data-seat-anchor` /
  `data-meld-anchor` attributes; missing anchors and
  `prefers-reduced-motion` degrade silently to the pre-existing arrive/ghost
  CSS animations.
- **No two clacks are identical**: `soundManager` adds per-play pitch and
  duration variance plus a click transient to `tilePlace`.

### Hand sorting

- Manual **Sort button** in the player bar → `useGameController.sortHand()`.
- `PlayerHand` runs a FLIP pass on any order change, so sorts — and the gap
  closing after every discard — slide tiles instead of teleporting them.

### The win sequence escalates

`HandResultScreen` now derives a magnitude tier from the result:
| Tier | Fan | Treatment |
|---|---|---|
| 1 | <6 | spotlight, slide-up, 40 confetti, 1s count-up |
| 2 | 6-9 | 90 gold-heavy confetti, 1.5s count-up |
| 3 | 10+ (limit) | 170 gold confetti, screen flash, sheet shake, 2.2s count-up, jackpot cascade |

Every fan row reveal plays a rising-pitch tick (`playFanTick`), so a hand
stacking eight fans audibly climbs. Limit hands cap the sequence with
`playJackpot` (a descending-ascending shower over a low rumble).

### Danger has a face

- Wall at 8 tiles or fewer: a breathing crimson vignette over the table and
  a heartbeat pulse on the wall counter.
- Any opponent with 3+ exposed melds: their seat glows destructive-red, and
  the table vignette engages.

### Retro identity in motion

- **Cartridge boot**: once per session entering the table — CRT power-on
  sweep, logo glow-in ("THE JADE PARLOUR AWAITS"), click-to-skip, hidden
  under reduced motion. (Fixed a StrictMode double-effect bug that stranded
  the overlay; documented in the component.)
- **CRT scanlines toggle**: new `crtEffect` setting (persisted, default off,
  toggle in Settings) renders a scanline + flicker + vignette overlay over
  the table only.

### Performance

- `RetroTile` is memoized (every board action re-rendered every tile).
- The tenpai-badge effect now keys on hand/meld signatures instead of the
  whole players array — it was brute-forcing 34 tile kinds through
  `canPlayerWin` on every opponent action.
- Animation state stays component-local; nothing new touches Redux.

## Verified

- Live: boot plays and clears, CRT toggles via settings, sort reorders with
  FLIP, discards/claims animate, danger states trigger, full suite green,
  production build passes.
- Reduced motion: all new animation paths check `prefers-reduced-motion`
  (flights skipped, boot hidden, loops disabled in CSS).

## Deliberately not done (noted for backlog)

- Custom chunky cursor: pointer cursors on a touch-first game add little and
  risk feeling gimmicky; revisit with real pixel art direction in Phase 3+.
- True 60fps device profiling: the targeted fixes above remove the known
  hot paths, but a real mid-range-device profile should happen before launch.
- Win-sequence tile flip-in-sequence (tiles already loop `tile-win`; a
  sequential flip needs the result-screen layout rework planned with the
  Phase 4 review screen).
