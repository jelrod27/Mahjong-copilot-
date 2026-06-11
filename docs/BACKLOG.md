# Backlog

Prioritized work remaining after the Legendary Elevation Pass
(docs/review/phase-0.md through phase-7.md). P0 = correctness or
launch-blocking; P1 = high-impact next; P2 = valuable, not urgent.

## P0 — correctness and trust

- (none known) — the Phase 1 audit fixed all found P0/P1 engine bugs and
  the full-game simulation now guards the invariants. New rules issues
  should land here.

## P1 — high impact

- **Lessons become floor briefings**: restructure the 48 text lessons into
  9 floor briefings (concept under 90s, 3-5 drills, the floor match as
  exam). Spec: docs/review/phase-4.md section 1. Content-writing heavy.
- **Seeded skill puzzles** with 1-3 star grading ("win in one draw",
  "safest discard", "maximize the hand") reusing isTenpai /
  tileDangerScore / projectFaan. Spec: phase-4.md section 2. Also feeds a
  rotating Daily variant pool.
- **Mentor voice unification**: reskin the tutor panel and review insights
  as Uncle Gam (one teaching voice, per the story bible).
- **Thirteen-orphans rob of a concealed kong** (classic HK exception;
  concealed kongs currently cannot be robbed at all).
- **Commissioned art via portraitImageSet**: Bo, Gam, Pearl, and Jin
  especially need rigs beyond the current feminine SVG presets. Visual
  one-liners per character in docs/design/npcs.md.
- **Daily leaderboard panel** (signed-in only) per docs/design/online.md;
  honor-system first, replay-validation later.
- **Mid-range device 60fps profile** of the Phase 2 animation pass.

## P2 — valuable

- Four-kong draw rule (`totalKongsDeclared` exists on GameState, unused).
- Nine Gates purity (currently accepts impure waits — lenient variant).
- Economy balance pass: starting stack 500 vs noten penalty 1500 vs
  monotonic payments to 8192 deserve one coherent table.
- Spaced-repetition flashcards in dead moments (spec: phase-4.md s3).
- Achievement unlock toasts at earn time (currently visible on the
  progress screen at next visit).
- Daily Hand calendar/history view (data already stored per day).
- Win-sequence sequential tile flip (needs result screen layout rework).
- Per-floor commissioned music stems and a distinct Jade Room theme
  (delivery format in docs/design/audio.md).
- Master volume slider (toggles only today).
- Animation-speed setting and an in-app reduced-motion override (OS-level
  prefers-reduced-motion is honored everywhere today).
- Left-hand layout option.
- Full keyboard play map (tiles are focusable buttons today; no shortcut
  scheme).
- Custom chunky cursor (revisit with real pixel art direction).
- Pre-match dialogue currently overlays a live table (discard timer runs
  beneath); pause the table until dismissed.
- Consolidate the two progress stores (Redux progressReducer vs the
  gameStats localStorage blob) — vestigial duplication.
- Remove or repurpose the legacy Redux gameReducer (unused by solo play).
