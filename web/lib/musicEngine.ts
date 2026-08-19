/**
 * Procedural chiptune music engine. Web Audio sequencer with a lookahead
 * scheduler (the "tale of two clocks" pattern), exact loop points, and a
 * ducking hook for the win sequence. No audio assets: every voice is an
 * oscillator, in keeping with the 16-bit fantasy. Commissioned tracks can
 * replace patterns later behind the same play/stop/duck API
 * (docs/design/audio.md).
 */

type Channel = 'lead' | 'bass' | 'pad' | 'arp' | 'perc';

/**
 * Percussion is addressed by note number the way a drum machine is, so a hit
 * is just another PatternNote and the sequencer needs no special case.
 */
const KICK = 36, SNARE = 38, HAT = 42, OPEN_HAT = 46;

/** One note: [stepIndex, midiNote, durationInSteps, channel] */
type PatternNote = [number, number, number, Channel];

interface MusicTrack {
  id: string;
  bpm: number;
  /** Total steps in the loop (16th notes). */
  steps: number;
  notes: PatternNote[];
  /** Semitone offset applied to every note (floor-intensity variants). */
  transpose?: number;
}

const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/* ── Compositions ─────────────────────────────────────────────────────────
   A minor pentatonic (A C D E G). The parlour theme is a slow, warm loop:
   sparse lead over a walking bass. The danger motif is a low heartbeat
   pulse with a flattened second pushing against the root. */

const A2 = 45, C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55;
const A3 = 57, C4 = 60, D4 = 62, E4 = 64, G4 = 67, A4 = 69, C5 = 72, D5 = 74, E5 = 76, G5 = 79;

/** Every `stride` steps from `from` up to (not including) `to`. */
const every = (stride: number, to: number, from = 0): number[] => {
  const out: number[] = [];
  for (let i = from; i < to; i += stride) out.push(i);
  return out;
};

/** One percussion hit per position, so drum parts read as rhythm not tuples. */
const hits = (positions: number[], midi: number): PatternNote[] =>
  positions.map((pos) => [pos, midi, 1, 'perc'] as PatternNote);

const PARLOUR_THEME: MusicTrack = {
  id: 'parlour',
  bpm: 84,
  steps: 64,
  notes: [
    // Bass: a patient walk, two bars of A, one of F, one of G
    [0, A2, 4, 'bass'], [8, E3, 4, 'bass'], [16, A2, 4, 'bass'], [24, G3, 4, 'bass'],
    [32, F3, 4, 'bass'], [40, C3, 4, 'bass'], [48, G3, 4, 'bass'], [56, E3, 4, 'bass'],
    // Lead: sparse pentatonic phrases with space between them
    [0, A4, 3, 'lead'], [4, C5, 3, 'lead'], [8, E5, 4, 'lead'],
    [14, D5, 2, 'lead'], [16, C5, 4, 'lead'],
    [24, A4, 4, 'lead'],
    [32, G4, 3, 'lead'], [36, A4, 3, 'lead'], [40, C5, 6, 'lead'],
    [48, D5, 3, 'lead'], [52, E5, 2, 'lead'], [54, D5, 2, 'lead'], [56, C5, 6, 'lead'],
    // Pad: long roots an octave up from bass, very quiet
    [0, A3, 16, 'pad'], [16, A3, 16, 'pad'], [32, F3 + 12, 16, 'pad'], [48, G3 + 12, 16, 'pad'],
    // Drums: deliberately sparse at rest — kick on the downbeat, backbeat
    // snare, hats on quarters. The busier subdivisions are what wall-low
    // intensity adds later, so the base loop has somewhere to grow into.
    ...hits([0, 16, 32, 48], KICK),
    ...hits([8, 24, 40, 56], SNARE),
    ...hits(every(4, 64), HAT),
  ],
};

const DANGER_MOTIF: MusicTrack = {
  id: 'danger',
  bpm: 96,
  steps: 32,
  notes: [
    // Heartbeat bass: root, root, flat-two leaning in
    [0, A2, 2, 'bass'], [4, A2, 2, 'bass'], [8, A2 + 1, 3, 'bass'],
    [16, A2, 2, 'bass'], [20, A2, 2, 'bass'], [24, G3 - 12, 3, 'bass'],
    // Lead: a thin held tension note that creeps up
    [0, E4, 14, 'lead'], [16, E4 + 1, 14, 'lead'],
    // Pad: low fifth drone
    [0, E3, 32, 'pad'],
  ],
};

const TRACKS: Record<string, MusicTrack> = {
  parlour: PARLOUR_THEME,
  danger: DANGER_MOTIF,
};

/* ── Engine ──────────────────────────────────────────────────────────── */

interface ChannelConfig {
  /** 'pulse' builds a PeriodicWave at `duty`; anything else is a stock type. */
  type: OscillatorType | 'pulse';
  /** Pulse width as a fraction of the cycle. 0.5 is a square wave. */
  duty?: number;
  gain: number;
  /** ADSR in seconds; `sustain` is a level between 0 and 1. */
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  /** Depth in cents; a slow LFO that fades in after the attack. */
  vibrato?: number;
}

/**
 * The envelopes matter more than the waveforms here. Every note used to ramp
 * linearly to silence across its whole duration, which is why they read as
 * emitted rather than played: no attack transient, no decay, nothing for the
 * ear to latch onto. A 5ms attack and a fast decay to a lower sustain is the
 * difference between a pluck and a test tone.
 *
 * Pulse widths do the same job for timbre. A 50% pulse is a square; narrowing
 * it to 25% or 12.5% thins and nasalises the voice, which is how the era's
 * hardware got three distinct lead sounds out of one oscillator.
 */
const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  lead: { type: 'pulse', duty: 0.25, gain: 0.15, attack: 0.005, decay: 0.08, sustain: 0.62, release: 0.06, vibrato: 14 },
  arp:  { type: 'pulse', duty: 0.125, gain: 0.07, attack: 0.002, decay: 0.03, sustain: 0.35, release: 0.02 },
  bass: { type: 'triangle', gain: 0.32, attack: 0.002, decay: 0.05, sustain: 0.80, release: 0.04 },
  pad:  { type: 'pulse', duty: 0.5, gain: 0.05, attack: 0.35, decay: 0.20, sustain: 0.75, release: 0.40 },
  perc: { type: 'square', gain: 0.30, attack: 0.001, decay: 0.02, sustain: 0.0, release: 0.02 },
};

/* ── Voices ──────────────────────────────────────────────────────────────
   Two things the stock oscillator set cannot do: pulse waves at an arbitrary
   duty cycle, and noise. Both are cached per context because building a
   PeriodicWave or filling a noise buffer on every note would be wasteful at
   sixteenth-note rates. */

/**
 * Fourier coefficients for a pulse wave of the given width.
 *
 * Exported for its own sake: the identity worth protecting is that a 50% pulse
 * has no even harmonics, and checking that through the scheduler is both
 * indirect and order-dependent, because waves are cached per context.
 */
export function pulseCoefficients(duty: number, harmonics = 28) {
  const real = new Float32Array(harmonics);
  const imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) {
    real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  }
  return { real, imag };
}

const pulseCache = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();

/**
 * A band-limited pulse wave. The nth harmonic of a pulse of width d has
 * amplitude (2 / n·pi)·sin(n·pi·d) — at d = 0.5 the even terms vanish and it
 * collapses to a square, which is the identity check worth remembering.
 */
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  let perCtx = pulseCache.get(ctx);
  if (!perCtx) { perCtx = new Map(); pulseCache.set(ctx, perCtx); }
  const cached = perCtx.get(duty);
  if (cached) return cached;

  const { real, imag } = pulseCoefficients(duty);
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  perCtx.set(duty, wave);
  return wave;
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;
const MUSIC_GAIN = 0.14;

/**
 * Tension drone level, relative to the music bus. Deliberately low: it has to
 * sit under the ambient bed and never compete with the tile clack, which is
 * the sound that always has to read first (docs/design/audio.md).
 */
const TENSION_GAIN = 0.05;

/* ── Sample-based playback ───────────────────────────────────────────────
   Buffer-backed alternative to the oscillator scheduler below, added
   behind the same play/stop/duck API so consumers never change. A track
   only takes this path once a real, licensed asset URL is registered here;
   until then play() falls through to the oscillator scheduler exactly as
   today. Buffers are fetched and decoded lazily (on first play, never
   during page load) and cached per URL so repeat plays cost nothing. */

/**
 * Track id → licensed asset URL. Empty until a real asset is approved.
 *
 * Exported because this is the configuration seam: registering a bed here is
 * the entire activation step, and the tests populate it to exercise the
 * ambient-bed path that is otherwise unreachable while it is empty.
 */
export const SAMPLE_ASSETS: Partial<Record<'parlour' | 'danger', string>> = {};

class MusicEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private enabled = true;
  private current: MusicTrack | null = null;
  private nextNoteIndex = 0;
  private loopStartTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private scheduled: OscillatorNode[] = [];
  /** Floor-intensity variant: semitones added and bpm multiplier. */
  private transpose = 0;
  private tempoScale = 1;
  /** Decoded ambient beds, cached per URL so repeat plays skip the fetch. */
  private bufferCache = new Map<string, AudioBuffer>();
  private bufferSource: AudioBufferSourceNode | null = null;
  /** Track id currently playing via the sample path (mutually exclusive with `current`). */
  private sampleTrackId: string | null = null;
  /** Monotonic id for the newest sample request, so stale fetches can be discarded. */
  private sampleRequestId = 0;
  /** Sustained tension drone layered over the ambient bed. Null when silent. */
  private tensionNodes: { gain: GainNode; oscs: OscillatorNode[] } | null = null;
  /** True while a bed fetch/decode is in flight, before `bufferSource` exists. */
  private samplePending = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = MUSIC_GAIN;
        this.musicGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      // Resume requires a user gesture on most browsers; callers invoke
      // play() from interaction handlers so this resolves naturally.
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  isPlaying(trackId?: string): boolean {
    if (this.sampleTrackId) return !trackId || this.sampleTrackId === trackId;
    return !!this.timer && (!trackId || this.current?.id === trackId);
  }

  /**
   * Start a track loop. `intensity` 0-2 raises tempo and pitch for higher
   * Parlour wings (one pattern, three moods). Not yet meaningful for the
   * sample path — no registered asset varies by intensity today.
   */
  play(trackId: 'parlour' | 'danger', intensity: 0 | 1 | 2 = 0) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.musicGain) return;

    // Ambient-bed mode (Direction A, docs/design/audio.md): once a licensed
    // room tone is registered for `parlour`, that bed is the game's continuous
    // sound. Tension is then a LAYER over it, not a replacement track — the
    // operator's decision was to keep the oscillator for danger rather than
    // license a second bed, and swapping the bed out for a bare drone at
    // wall-low would sound worse than what shipped before.
    //
    // While SAMPLE_ASSETS is empty this whole branch is unreachable and the
    // oscillator path below runs exactly as it always has.
    const bedUrl = SAMPLE_ASSETS.parlour;
    if (bedUrl) {
      this.playSample('parlour', bedUrl, ctx);
      if (trackId === 'danger') this.startTensionLayer(ctx);
      else this.stopTensionLayer();
      return;
    }

    const sampleUrl = SAMPLE_ASSETS[trackId];
    if (sampleUrl) {
      this.playSample(trackId, sampleUrl, ctx);
      return;
    }

    const track = TRACKS[trackId];
    if (!track) return;
    const nextTranspose = (track.transpose ?? 0) + intensity * 2;
    const nextTempo = 1 + intensity * 0.08;
    if (this.current?.id === trackId && this.timer) {
      // Same track: retune in place when only the intensity changed.
      // A tempo change alters the step duration, so re-anchor loopStartTime
      // to keep the next scheduled note at its current wall-clock time —
      // otherwise the loop anchor maps steps onto the new grid and notes
      // bunch or skip.
      if (this.tempoScale !== nextTempo) {
        const oldStep = this.secondsPerStep();
        this.tempoScale = nextTempo;
        const newStep = this.secondsPerStep();
        const nextNote = this.current.notes[this.nextNoteIndex];
        if (nextNote) {
          this.loopStartTime += nextNote[0] * (oldStep - newStep);
        }
      }
      this.transpose = nextTranspose;
      return;
    }

    this.stop();
    // The scheduler walks notes in array order; patterns are authored by
    // channel, so sort by step or later channels would never schedule.
    this.current = { ...track, notes: [...track.notes].sort((a, b) => a[0] - b[0]) };
    this.transpose = nextTranspose;
    this.tempoScale = nextTempo;
    this.nextNoteIndex = 0;
    this.loopStartTime = ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.scheduleWindow(), LOOKAHEAD_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const osc of this.scheduled) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.scheduled = [];
    this.current = null;
    if (this.bufferSource) {
      try { this.bufferSource.stop(); } catch { /* already stopped */ }
      this.bufferSource.disconnect();
      this.bufferSource = null;
    }
    this.sampleTrackId = null;
    this.samplePending = false;
    this.stopTensionLayer();
  }

  /**
   * Low sustained drone layered over the ambient bed to signal a low wall.
   *
   * Two detuned sine partials a fifth apart, faded in over 1.2s. Deliberately
   * not a melody: it has to sit under room tone without competing with the
   * tile clack, which is the sound that always has to read first.
   */
  private startTensionLayer(ctx: AudioContext) {
    if (this.tensionNodes || !this.musicGain) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(TENSION_GAIN, ctx.currentTime + 1.2);
    gain.connect(this.musicGain);

    // A2 and its fifth. The 0.5Hz offset on the upper partial produces a slow
    // beating that reads as unease without any rhythmic element.
    const oscs = [midiToFreq(A2), midiToFreq(A2 + 7) + 0.5].map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      return osc;
    });

    this.tensionNodes = { gain, oscs };
  }

  /** Fade the drone out and release its nodes. Safe to call when not running. */
  private stopTensionLayer() {
    const nodes = this.tensionNodes;
    if (!nodes) return;
    this.tensionNodes = null;

    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
    nodes.gain.gain.linearRampToValueAtTime(0, now + 0.6);
    for (const osc of nodes.oscs) {
      try { osc.stop(now + 0.7); } catch { /* already stopped */ }
    }
  }

  /** Start (or resume from cache) a looping buffer for `trackId`. */
  private playSample(trackId: string, url: string, ctx: AudioContext) {
    // Idempotent on a PENDING request too, not just a live source. On a cold
    // cache the fetch/decode is still in flight and `bufferSource` is null, so
    // a guard on that alone lets a second synchronous play() fall through to
    // stop() — which tears down the tension drone and builds a second one,
    // overlapping the first during its fade-out. GameContent re-fires play()
    // on several state changes, so this is the ordinary path, not a corner.
    if (this.sampleTrackId === trackId && (this.bufferSource || this.samplePending)) return;
    this.stop();
    this.sampleTrackId = trackId;
    // Track the specific request, not just the track id: play('parlour') →
    // stop() → play('parlour') leaves two in-flight fetches that both match
    // on id alone, so the stale one would start a second overlapping loop.
    const requestId = ++this.sampleRequestId;

    const cached = this.bufferCache.get(url);
    if (cached) {
      this.startBufferSource(cached, trackId, requestId, ctx);
      return;
    }

    this.samplePending = true;
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.bufferCache.set(url, buffer);
        // A different track or a newer request for the same track may have
        // started (or stop() may have been called) while this fetch/decode
        // was in flight — bail rather than starting a loop nobody asked for.
        if (this.sampleRequestId !== requestId) return;
        this.samplePending = false;
        this.startBufferSource(buffer, trackId, requestId, ctx);
      })
      .catch(() => {
        // Fail soft: background audio must never throw or surface an
        // unhandled rejection. The game stays playable without ambience.
        if (this.sampleRequestId === requestId) {
          this.samplePending = false;
          this.sampleTrackId = null;
        }
      });
  }

  private startBufferSource(buffer: AudioBuffer, trackId: string, requestId: number, ctx: AudioContext) {
    if (this.sampleRequestId !== requestId || this.sampleTrackId !== trackId || !this.musicGain) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start();
    this.bufferSource = source;
  }

  /** Lower the music under a foreground moment (win sequence), then recover. */
  duck(durationMs: number, level = 0.25) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;
    const gain = this.musicGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(MUSIC_GAIN * level, now + 0.08);
    gain.linearRampToValueAtTime(MUSIC_GAIN, now + durationMs / 1000);
  }

  private secondsPerStep(): number {
    const track = this.current!;
    return 60 / (track.bpm * this.tempoScale) / 4; // 16th notes
  }

  private scheduleWindow() {
    const ctx = this.ctx;
    const track = this.current;
    if (!ctx || !track || !this.musicGain) return;

    const stepDur = this.secondsPerStep();
    const loopDur = track.steps * stepDur;
    const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;

    // Schedule all notes whose start time falls inside the lookahead window
    let guard = 0;
    while (guard++ < 64) {
      const note = track.notes[this.nextNoteIndex];
      const noteTime = this.loopStartTime + note[0] * stepDur;
      if (noteTime > horizon) break;
      if (noteTime >= ctx.currentTime - 0.01) {
        this.scheduleNote(note, noteTime, stepDur);
      }
      this.nextNoteIndex++;
      if (this.nextNoteIndex >= track.notes.length) {
        this.nextNoteIndex = 0;
        this.loopStartTime += loopDur; // exact loop point
      }
    }

    // Keep the scheduled list bounded; old oscillators have already stopped
    if (this.scheduled.length > 48) this.scheduled = this.scheduled.slice(-48);
  }

  private scheduleNote(note: PatternNote, when: number, stepDur: number) {
    const [, midi, durSteps, channel] = note;
    if (channel === 'perc') this.scheduleDrum(midi, when);
    else this.scheduleTone(note, when, stepDur);
  }

  /** A pitched voice: pulse or stock waveform, ADSR, optional vibrato. */
  private scheduleTone(note: PatternNote, when: number, stepDur: number) {
    const ctx = this.ctx!;
    const [, midi, durSteps, channel] = note;
    const conf = CHANNEL_CONFIG[channel];
    const dur = durSteps * stepDur * 0.92; // slight gap between notes

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (conf.type === 'pulse') osc.setPeriodicWave(pulseWave(ctx, conf.duty ?? 0.5));
    else osc.type = conf.type;
    osc.frequency.value = midiToFreq(midi + this.transpose);

    // Vibrato enters after the attack so the note lands on pitch and only then
    // starts to move — leading with it reads as tuning drift, not expression.
    if (conf.vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.2;
      depth.gain.setValueAtTime(0, when);
      depth.gain.linearRampToValueAtTime(conf.vibrato, when + Math.min(dur * 0.5, 0.25));
      lfo.connect(depth);
      depth.connect(osc.detune);
      lfo.start(when);
      lfo.stop(when + dur + conf.release);
      this.scheduled.push(lfo);
    }

    // ADSR. The sustain hold ends at `dur`; release runs past it, which is why
    // stop() is scheduled after the release rather than at the note boundary.
    const peak = conf.gain;
    const sustainLevel = Math.max(peak * conf.sustain, 0.0001);
    const attackEnd = when + conf.attack;
    const decayEnd = attackEnd + conf.decay;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, attackEnd);
    if (decayEnd < when + dur) {
      gain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
      gain.gain.setValueAtTime(sustainLevel, when + dur);
    }
    gain.gain.linearRampToValueAtTime(0.0001, when + dur + conf.release);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(when);
    osc.stop(when + dur + conf.release + 0.02);
    this.scheduled.push(osc);
  }

  /**
   * Percussion. Chiptune without drums reads as a ringtone — there is nothing
   * for the ear to keep time against, so an eleven-second loop has nothing to
   * hide behind. Kick is a pitch drop, snare and hats are filtered noise.
   */
  private scheduleDrum(midi: number, when: number) {
    const ctx = this.ctx!;
    const bus = this.musicGain!;
    const level = CHANNEL_CONFIG.perc.gain;

    if (midi === KICK) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(142, when);
      osc.frequency.exponentialRampToValueAtTime(46, when + 0.08);
      gain.gain.setValueAtTime(level, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
      osc.connect(gain); gain.connect(bus);
      osc.start(when); osc.stop(when + 0.16);
      this.scheduled.push(osc);
      return;
    }

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer(ctx);

    if (midi === SNARE) {
      filter.type = 'bandpass';
      filter.frequency.value = 1750;
      filter.Q.value = 0.9;
      gain.gain.setValueAtTime(level * 0.75, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
      src.start(when); src.stop(when + 0.18);
    } else {
      const open = midi === OPEN_HAT;
      filter.type = 'highpass';
      filter.frequency.value = 7200;
      gain.gain.setValueAtTime(level * (open ? 0.32 : 0.24), when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + (open ? 0.22 : 0.045));
      src.start(when); src.stop(when + (open ? 0.24 : 0.06));
    }

    src.connect(filter); filter.connect(gain); gain.connect(bus);
  }
}

const musicEngine = new MusicEngine();
export default musicEngine;
