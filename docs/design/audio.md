# Audio Spec: 16 Bit Mahjong

The audio identity is half the retro fantasy. Everything is generated with
the Web Audio API — zero assets — which keeps the 16-bit character honest
and the bundle weightless. Two systems share one philosophy: the tile clack
always reads above everything else.

## Systems

### SFX (`lib/soundManager.ts`)

Procedural 8-bit tones. Current palette:

| Sound | Character | Notes |
|---|---|---|
| tilePlace | square + click transient | Per-play pitch (±7%) and duration variance: no two clacks identical |
| tileDraw | two rising triangles | varied per play |
| claim | three-step square sting | chow/pung claim |
| kong | four-step saw-to-square escalation | bigger than claim by design |
| pass | single soft sine | barely-there |
| turnAlert | double high blip | claim window opens |
| win / winSelfDraw / winLimitHand | major arpeggio, escalating lengths | tiered by win type |
| playFanTick(step) | rising semitone ticks | one per fan row on the result screen |
| playJackpot() | descending-ascending shower over a low rumble | limit hands only |

Mixing rules:
- Master SFX gain 0.3; polyphony capped at 4 *concurrently sounding*
  voices. Scheduled-but-unstarted notes are never evicted (sequential
  fanfares survive intact).
- 80ms same-sound debounce kills spam without eating distinct events.

### Music (`lib/musicEngine.ts`)

A chiptune sequencer: lookahead scheduler (25ms tick, 120ms horizon —
the standard two-clocks pattern), 16th-note step patterns, three channels
(square lead 0.16, triangle bass 0.30, sine pad 0.07), exact loop points
(loop start advances by pattern duration, never re-quantized).

Tracks:
- **parlour** — 84bpm, 64 steps, A minor pentatonic. Sparse lead phrases
  over a patient walking bass; the warm lamplight default.
- **danger** — 96bpm, 32 steps. Heartbeat bass with a flattened second
  leaning against the root; thin held lead that creeps a semitone.

Floor intensity: one pattern, three moods. `play(track, intensity 0-2)`
transposes +2 semitones and adds 8% tempo per step — Novice wing hears the
theme at rest, Master wing hears it brighter and urgent.

Music master gain is 0.14 — roughly half the perceived level of the tile
clack, by design. The clack is the protagonist.

### Behavior wiring

- Theme starts when a hand is in play; switches to the danger motif when
  the wall reaches 8 tiles; back again next hand.
- `duck(ms, level)` pulls music to 12% under the win sequence and recovers
  on a linear ramp; draws duck to 40% briefly.
- Music stops on leaving the game route.
- Autoplay policy: the AudioContext unlocks on the first pointer
  interaction (a one-time listener retries the loop) — no silent failures,
  no console warnings.

## Settings and platform behavior

- `musicEnabled` (default on) and `soundEnabled` (existing) persist in
  localStorage and gate their engines independently. Toggles live in
  Settings ("Parlour music", "Game sounds").
- iOS silent switch: Web Audio is classified as media playback on modern
  iOS and does not reliably follow the ringer switch; the honest mitigations
  are the in-game mute button (already in the HUD), the persisted settings,
  and starting music only inside the game route. Documented as a platform
  limitation rather than pretended away.
- `prefers-reduced-motion` does not gate audio (separate concern); a future
  `prefers-reduced-sound` media query has no browser support yet.

## Path to commissioned tracks

The engine API (`play / stop / duck / setEnabled`) is the contract. To move
from procedural placeholders to commissioned audio:

1. Commission loops as seamless OGG/M4A (intro + loop pair preferred:
   `parlour_intro.ogg`, `parlour_loop.ogg`), target -14 LUFS, peak -1dB.
2. Add a `BufferTrack` implementation behind the same `MusicTrack` id:
   decode into an AudioBuffer, loop via `AudioBufferSourceNode.loop` with
   `loopStart`/`loopEnd` sample-accurate points provided by the composer.
3. Keep the procedural patterns as the zero-download fallback and for the
   intensity variants until per-wing stems are commissioned.
4. SFX stay procedural permanently — the variance system (every clack
   unique) is better than any single sample, and it is already in
   character.

Track wishlist for commissioning, in priority order: parlour theme (with
per-wing stems), danger motif, Jade Room theme (Jin's floor deserves its
own), win fanfare set (3 tiers), epilogue theme.
