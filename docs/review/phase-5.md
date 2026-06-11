# Phase 5: Audio Identity

Date: 2026-06-10. The app went from nine context-free beeps to a scored,
mixed, behavior-aware audio identity — still entirely procedural (zero
assets), per the spec in docs/design/audio.md.

## Shipped

- **Chiptune music engine** (`lib/musicEngine.ts`): Web Audio sequencer
  with a lookahead scheduler, exact loop points, three channels (square
  lead, triangle bass, sine pad), and a ducking API.
- **Two compositions**: the parlour theme (84bpm pentatonic, sparse and
  warm) and the danger motif (heartbeat bass with a flat-two lean) that
  takes over when the wall reaches its last 8 tiles — the audio half of
  the Phase 2 danger vignette.
- **Floor intensity variants**: one pattern, three moods — +2 semitones
  and +8% tempo per Parlour wing, so the Master floors literally play
  sharper.
- **Ducking**: music drops to 12% under the win sequence and ramps back;
  the fan ticks, jackpot cascade, and fanfares own the foreground.
- **Mixing discipline**: music master at 0.14 versus SFX at 0.3 — the
  tile clack always reads on top (the spec's first rule).
- **Settings**: "Parlour music" toggle, persisted, independent of game
  sounds; default on.
- **Autoplay correctness**: the AudioContext unlocks on first interaction
  via a one-time listener; music stops on leaving the game route.
- (Phase 2, counted here): per-play pitch/duration variance on tile
  sounds, rising fan-reveal ticks, the limit-hand jackpot cascade, and a
  polyphony fix so scheduled fanfares never get clipped.

## Documented (docs/design/audio.md)

Full palette table, mixing rules, scheduler design, the iOS silent-switch
reality (Web Audio ignores the ringer switch on modern iOS; mitigated with
the in-HUD mute and persisted settings rather than pretended away), and a
concrete commissioning path: seamless intro+loop pairs behind the same
play/stop/duck API, with procedural patterns kept as the zero-download
fallback. SFX stay procedural by design — the variance system beats static
samples for tile feel.

## Not done (backlog)

- Per-floor commissioned stems and a distinct Jade Room theme (wishlist
  and delivery format specced).
- Victory fanfares scaled continuously by faan (currently 3 tiers + the
  jackpot cascade at limit).
- A master volume slider (boolean toggles only today).
