# Changelog

## The Legendary Elevation Pass — 2026-06-10

One sustained pass to take 16 Bit Mahjong from a functional learning
platform to a game with rules you can trust, tiles you can feel, a world
to climb, and a reason to come back tomorrow. Full findings live in
docs/review/ (phases 0-7); design docs in docs/design/.

### Engine correctness (the foundation)

- Fixed seven P0 rules bugs found by audit, including: a player holding a
  kong could never win; any winner with exposed melds scored a 0-fan
  chicken hand (and so could never legally win at a 3-faan table); payment
  was non-monotonic at the limit (a 9-fan hand paid 16x more than a limit
  hand); chow claims were accepted from any seat; rob-the-kong windows
  accepted tile-duplicating claims; AI win declarations below the minimum
  faan froze the hand; discard wins leaked a tile from the 144-tile set.
- Fixed nine P1 scoring/flow bugs (seven-pairs fan stacking, flower
  double-counting, phantom self-draws after claims, unreachable last-tile
  fans, missing heavenly/earthly hands, and more).
- The engine is now fully seedable: the same seed deals the same wall for
  everyone, AI included — powering replays, puzzles, and the Daily Hand.
- Exact tenpai detection in the money path; unified claim-priority
  resolution; +100 engine tests including a full-game AI simulation that
  asserts 144-tile conservation on every action.

### Game feel (the Balatro pass)

- Tiles travel: discards arc from hand to pool and land with a clack (no
  two clacks identical); claimed tiles snap across the table.
- Manual hand sort with FLIP animation; gaps close smoothly after discards.
- Win sequences escalate by magnitude: a limit hand brings a screen flash,
  table shake, gold confetti shower, rising fan ticks, and a jackpot
  cascade that a 3-fan win simply does not get.
- Danger reads on the table: a breathing crimson vignette and heartbeat
  wall counter in the last stretch; threat-glow on opponents sitting on
  three melds.
- Once-per-session CRT power-on boot; optional scanline overlay.

### The Jade Parlour (story mode)

- A nine-floor mahjong house gone quiet, re-lit floor by floor. Each
  rival's obsession is the skill their floor teaches.
- Ten characters with backstories, dialogue, and event-driven barks —
  including Uncle Gam (the one teaching voice), Bo the builder, Auntie
  Pearl who never deals in, and Master Jin at the top. Beat Jin with a
  6+ faan hand for the epilogue.
- AI personality is mechanical, not cosmetic: claim appetite, fan greed,
  defense bias, and speed bias tune every tier inside the no-cheating
  envelope. Characters play differently everywhere, including free play.

### Identity and progression

- A nine-tier rank ladder (Newcomer through Parlour Legend) with rank-up
  ceremonies; the home screen now leads with who you are and where you
  are climbing, and the stale fake progress cards are gone.

### Audio

- A procedural chiptune score: warm parlour theme, danger motif on the
  last eight wall tiles, floor-wing intensity variants, and ducking under
  the win sequence. Zero audio assets; the tile clack always reads on top.

### The daily loop

- The Daily Hand: one seeded hand per UTC day, identical for every player
  in the world, with an emoji-free ASCII share card and a streak the
  mentor greets you by. Streaks reward showing up and never punish.
- Ten HK-flavored pixel badges derived from real play.
- Local-first throughout: no feature requires an account. The online
  leaderboard seam is documented, not smuggled in.

### Accessibility and polish

- Colorblind-safe High Contrast tile palette (Okabe-Ito suit colors).
- Proper error states replace bare "not found" text.
- prefers-reduced-motion honored across every new animation system.
