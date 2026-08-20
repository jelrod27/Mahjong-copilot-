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
the standard two-clocks pattern), 16th-note step patterns, exact loop points
(loop start advances by pattern duration, never re-quantized).

Five channels: `lead` and `arp` on band-limited pulse waves at 25% and 12.5%
duty, `bass` on a triangle, `pad` on a 50% pulse, and `perc` addressed by
drum-machine note numbers — kick as a pitch drop, snare and hats as filtered
noise. Every channel carries an ADSR rather than a single ramp to silence.

Six tracks rotate during a hand, each 256 steps (roughly 45 seconds) and each
a key, a chord progression and a kit style. Bass, pads and drums are composed;
lead and arpeggio are generated over the harmony on every pass from the chord
and the scale only. `danger` remains a short drone, used as a layer rather
than as a member of the rotation.

Two intensity axes. `play(track, intensity 0-2)` is the Parlour wing and sets
the key: +2 semitones and +8% tempo per step. `setDrive(0-1)` is the wall
running down and sets the push: up to +22% tempo, plus layers that fill in
subdivisions — hats to eighths, bass on the offbeat, snare doubling. Layers
are added, never substituted.

Music master gain is 0.14 — roughly half the perceived level of the tile
clack, by design. The clack is the protagonist. `setVolume(0-1)` scales that
bus and is exposed as a settings slider, independent of the on/off switch and
of sound effects.

The full reasoning is in **Decision: generated score, rotating (2026-08-19)**
at the end of this file.

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


## Decision: ambient bed + oscillator tension (2026-07-27)

**Direction A — parlour room tone** is the chosen identity (plan 016). Two
follow-on decisions, recorded here because the earlier asset shortlist was only
ever discussed in conversation and was lost:

1. **One licensed asset, not two.** A looping parlour room tone registered at
   `SAMPLE_ASSETS.parlour` in `lib/musicEngine.ts`. The tile-clack SFX stay
   procedural — `soundManager` already varies pitch and duration ±7% per play,
   so sampling them buys little and would mean retiming the board.

2. **Tension stays on the oscillator.** No second licensed bed for `danger`.
   When the wall is low, a low sustained drone is **layered over** the ambient
   bed rather than replacing it.

The layering is not cosmetic. `play()` previously stopped whatever was playing
before starting the new track, which is correct for two oscillator tracks but
would have cut the ambience out entirely at wall-low, leaving a bare drone —
worse than what shipped before. `play()` now treats a registered bed as the
continuous sound and toggles the drone over it.

While `SAMPLE_ASSETS` is empty this path is unreachable and the oscillator
sequencer behaves exactly as it always has. Tests in
`lib/__tests__/musicEngine.test.ts` cover both states.

### Activating it

Drop a licensed file in `web/public/audio/` and register it:

```ts
export const SAMPLE_ASSETS: Partial<Record<'parlour' | 'danger', string>> = {
  parlour: '/audio/parlour-room-tone.mp3',
};
```

Licence rule is unchanged and hard (plan 016): royalty-free or CC0, commercial
use permitted, **no attribution requirement**. CC-BY, CC-BY-NC, or unclear
terms are rejected — the app has no credits surface, so an attribution
requirement cannot be satisfied. Asset acquisition is the operator's action.


## Decision: generated score, rotating (2026-08-19)

Supersedes the ambient-bed direction above. That plan is not wrong; it is
answering a different question, and the asset it depended on never arrived.

**What prompted it.** The score was one 64-step loop at 84bpm — 11.4 seconds,
repeating 315 times an hour — with no percussion and a single linear gain ramp
standing in for an envelope. The complaint was not that it was generated. It
was that there was one of it.

**Why generated rather than licensed.** The requirement that decides this is a
tempo that rises as the wall runs down. Speeding up a sample raises its pitch;
matching it needs time-stretching, which is a different class of problem. A
step sequencer just shortens the step. Once the score has to respond to game
state, staying generated is the cheaper correct answer, not the poorer one.

**The shape.** Each track is a key, a chord progression and a kit style. The
skeleton — bass, pads, drums — is composed, because that is the part an ear
needs to be stable. Lead and arpeggio are generated over it on every pass, from
the chord and the scale only, so there is no wrong note available to land on.
Six tracks rotate at the loop boundary: about four and a half minutes before
anything is heard twice, and the ornamentation differs even then.

**Intensity has two axes now.** Parlour floor sets the key, as before. The wall
running down sets the push: tempo up to +22%, and layers that fill in the
subdivisions the ear already expects — hats to eighths, bass on the offbeat,
snare doubling. Layers are added, never substituted, so nothing is taken out
from under the player.

**What this does not change.** `SAMPLE_ASSETS` stays, and registering a bed
still short-circuits the sequencer. If a licensed room tone is ever approved it
works exactly as documented above — it simply cannot deliver the tempo ramp, so
it is no longer the plan of record. The licence rule is unchanged and still
hard: royalty-free or CC0, commercial use permitted, no attribution
requirement.
