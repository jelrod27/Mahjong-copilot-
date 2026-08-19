import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import musicEngine, {
  SAMPLE_ASSETS, pulseCoefficients, ornament, PARLOUR_HARMONY, intensityLayers,
  TRACKS, PARLOUR_ROTATION, type PatternNote,
} from '../musicEngine';
import { createRng } from '@/engine/rng';

/**
 * Covers the ambient-bed decision recorded in docs/design/audio.md: once a
 * licensed room tone is registered for `parlour`, that bed becomes the
 * continuous sound and wall-low tension is a DRONE LAYERED OVER IT, rather
 * than a replacement track. Before this, `play('danger')` stopped whatever was
 * playing — which was fine for two oscillator tracks but would have cut the
 * ambience out entirely the moment a bed was added.
 *
 * jsdom has no Web Audio, so the graph is faked just enough to observe which
 * path ran: the sequencer sets an interval, the drone creates sine oscillators.
 */

interface FakeOsc {
  type: string;
  frequency: { value: number; setValueAtTime: unknown; exponentialRampToValueAtTime: unknown };
  detune: unknown;
  connect: () => void;
  start: () => void;
  stop: () => void;
  started: boolean;
  stopped: boolean;
  periodic: boolean;
  setPeriodicWave: (w: unknown) => void;
}

let createdOscs: FakeOsc[] = [];
let intervalCount = 0;
/** Voices that went through a PeriodicWave rather than a stock waveform. */
let periodicWaves: { real: Float32Array; imag: Float32Array }[] = [];
/** Noise-backed voices: snare and hats. */
let bufferSources: { filterType: string | null }[] = [];
let filters: { type: string; frequency: number }[] = [];

const makeParam = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
  setTargetAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

/**
 * The engine is a singleton and caches its AudioContext for the process, so a
 * test that wants a gesture-blocked context has to reach the live one rather
 * than construct a new one.
 */
const contexts: FakeAudioContext[] = [];

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  // Asynchronous on purpose. The real resume() returns a promise and the
  // context is still suspended when it returns — a double that flips the
  // state synchronously hides exactly the race this suite exists to cover.
  resume = vi.fn(() =>
    Promise.resolve().then(() => {
      this.state = 'running';
    }),
  );

  constructor() {
    contexts.push(this);
  }

  /** The context the engine is actually using. */
  static get live(): FakeAudioContext | undefined {
    return contexts[contexts.length - 1];
  }

  createGain() {
    return { gain: makeParam(), connect: vi.fn(), disconnect: vi.fn() };
  }

  sampleRate = 44100;

  createOscillator(): FakeOsc {
    const osc: FakeOsc = {
      type: 'sine',
      frequency: Object.assign(makeParam(), { value: 0 }),
      detune: makeParam(),
      connect: vi.fn(),
      started: false,
      stopped: false,
      periodic: false,
      setPeriodicWave: vi.fn(() => { osc.periodic = true; }),
      start: vi.fn(() => { osc.started = true; }),
      stop: vi.fn(() => { osc.stopped = true; }),
    };
    createdOscs.push(osc);
    return osc;
  }

  createPeriodicWave(real: Float32Array, imag: Float32Array) {
    periodicWaves.push({ real, imag });
    return { real, imag } as unknown as PeriodicWave;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return { length, sampleRate, numberOfChannels: channels, getChannelData: () => data };
  }

  createBiquadFilter() {
    const f = { type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() };
    filters.push(f as unknown as { type: string; frequency: number });
    return f;
  }

  createBufferSource() {
    bufferSources.push({ filterType: null });
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  decodeAudioData() {
    return Promise.resolve({} as AudioBuffer);
  }
}

const realSetInterval = globalThis.setInterval;
const realSetTimeout = globalThis.setTimeout;

beforeEach(() => {
  createdOscs = [];
  intervalCount = 0;
  periodicWaves = [];
  bufferSources = [];
  filters = [];
  // @ts-expect-error - test double for a browser global absent in jsdom
  globalThis.AudioContext = FakeAudioContext;
  // @ts-expect-error - counting scheduler starts, not driving them
  globalThis.setInterval = (...args: Parameters<typeof realSetInterval>) => {
    intervalCount += 1;
    return realSetInterval(...args);
  };
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as unknown as Response),
  );
  musicEngine.setEnabled(true);
});

afterEach(() => {
  musicEngine.stop();
  globalThis.setInterval = realSetInterval;
  // Assigned directly rather than via vi.stubGlobal, so restoreAllMocks does
  // not clear it — without this the fake leaks into every later test file.
  // @ts-expect-error - removing the test double restores jsdom's absence
  delete globalThis.AudioContext;
  delete SAMPLE_ASSETS.parlour;
  delete SAMPLE_ASSETS.danger;
  vi.restoreAllMocks();
});

/** The two detuned sines that make up the tension drone. */
const droneOscs = () => createdOscs.filter(o => o.type === 'sine' && o.started);

describe('musicEngine with no licensed bed registered', () => {
  it('runs the oscillator sequencer for danger, exactly as before', () => {
    musicEngine.play('danger');
    expect(intervalCount).toBe(1);
  });

  it('reports danger as the playing track', () => {
    musicEngine.play('danger');
    expect(musicEngine.isPlaying('danger')).toBe(true);
  });
});

describe('musicEngine with an ambient bed registered', () => {
  // A UNIQUE URL PER TEST IS LOAD-BEARING. musicEngine is a module singleton
  // and its decoded-buffer cache is keyed by URL, so a shared path would leave
  // the buffer warm from the previous test. The first play() would then resolve
  // synchronously from cache and mask the cold-start path — which is the only
  // path a real player hits, and where the drone-stacking bug actually lived.
  let bedUrl = '';
  let bedCounter = 0;

  beforeEach(() => {
    bedUrl = `/audio/parlour-room-tone-${++bedCounter}.mp3`;
    SAMPLE_ASSETS.parlour = bedUrl;
  });

  it('does not start the note sequencer for danger', () => {
    // The whole point: the bed keeps playing, so the chiptune scheduler that
    // would have replaced it must never start.
    musicEngine.play('danger');
    expect(intervalCount).toBe(0);
  });

  it('layers a tension drone for danger', () => {
    musicEngine.play('danger');
    expect(droneOscs()).toHaveLength(2);
  });

  it('plays no drone for the calm parlour state', () => {
    musicEngine.play('parlour');
    expect(droneOscs()).toHaveLength(0);
  });

  it('keeps the bed on the sample path rather than switching tracks', () => {
    musicEngine.play('danger');
    expect(musicEngine.isPlaying('parlour')).toBe(true);
  });

  it('does not stack a second drone when danger repeats on a cold cache', () => {
    // GameContent re-fires play() on several state changes; the layer must be
    // idempotent or the drones pile up and overlap during the fade-out.
    // Cold cache is the case that matters: the bed fetch is still in flight,
    // so a guard on `bufferSource` alone would let the second call through.
    musicEngine.play('danger');
    musicEngine.play('danger');
    expect(droneOscs()).toHaveLength(2);
  });

  it('does not stack a second drone when danger repeats on a warm cache', async () => {
    musicEngine.play('danger');
    await Promise.resolve();
    await Promise.resolve();
    musicEngine.stop();
    createdOscs = [];

    musicEngine.play('danger');
    musicEngine.play('danger');
    expect(droneOscs()).toHaveLength(2);
  });

  it('releases the drone when the wall recovers', () => {
    musicEngine.play('danger');
    const before = droneOscs();
    musicEngine.play('parlour');
    expect(before.every(o => o.stopped)).toBe(true);
  });

  it('releases the drone on stop', () => {
    musicEngine.play('danger');
    const before = droneOscs();
    musicEngine.stop();
    expect(before.every(o => o.stopped)).toBe(true);
  });
});

/**
 * The oscillator sequencer's own voices. These were previously unreachable
 * from the suite: every existing test drives `danger`, which is a drone, or
 * the sample path. The parlour track is the one that exercises pitched voices
 * and percussion, and it had no coverage at all.
 */
describe('synthesis', () => {
  /** One scheduler tick. The window is 120ms wide, so step 0 lands inside it. */
  const tick = () => new Promise((r) => realSetTimeout(r, 60));

  beforeEach(() => {
    delete SAMPLE_ASSETS.parlour;
    musicEngine.stop();
  });
  afterEach(() => musicEngine.stop());

  it('voices pitched channels with a pulse wave, not a stock waveform', async () => {
    musicEngine.play('parlour');
    await tick();

    expect(periodicWaves.length).toBeGreaterThan(0);
    expect(createdOscs.some((o) => o.periodic)).toBe(true);
  });

  it('collapses a 50% pulse to a square: even harmonics vanish', () => {
    // sin(n·pi/2) is zero for even n, so a correct series has no even
    // harmonics at 50% — the identity that says the coefficients are right
    // rather than merely present.
    const { real } = pulseCoefficients(0.5);
    expect(Math.abs(real[2])).toBeLessThan(1e-6);
    expect(Math.abs(real[4])).toBeLessThan(1e-6);
    expect(Math.abs(real[6])).toBeLessThan(1e-6);

    // ...while the odd ones carry the energy, falling off as 1/n.
    expect(Math.abs(real[1])).toBeGreaterThan(Math.abs(real[3]));
    expect(Math.abs(real[3])).toBeGreaterThan(Math.abs(real[5]));
  });

  it('keeps even harmonics at narrower pulse widths', () => {
    // A 25% pulse is audibly thinner precisely because the even terms return.
    expect(Math.abs(pulseCoefficients(0.25).real[2])).toBeGreaterThan(0.3);
    expect(Math.abs(pulseCoefficients(0.125).real[2])).toBeGreaterThan(0.2);
  });

  it('builds the kick as a pitch drop rather than a noise burst', async () => {
    musicEngine.play('parlour');
    await tick();

    // Step 0 of the parlour loop carries a kick. It is the only voice that
    // ramps its own frequency, which is what makes it read as a drum.
    const dropped = createdOscs.some(
      (o) => (o.frequency.exponentialRampToValueAtTime as ReturnType<typeof vi.fn>).mock?.calls?.length > 0,
    );
    expect(dropped).toBe(true);
  });

  it('routes noise percussion through a filter', async () => {
    musicEngine.play('parlour');
    await tick();

    // Hats sit on every quarter, so step 0 has one. Unfiltered white noise
    // reads as static; the highpass is what makes it a hi-hat.
    expect(bufferSources.length).toBeGreaterThan(0);
    expect(filters.some((f) => f.type === 'highpass' || f.type === 'bandpass')).toBe(true);
  });
});

/**
 * Generated ornamentation. The loop was 11.4 seconds and repeated 315 times an
 * hour; the fix is a longer skeleton with lead and arpeggio generated fresh
 * each pass. That is only safe if the generator cannot leave the key, which is
 * the property these pin.
 */
describe('ornamentation', () => {
  const PITCHED = new Set(['lead', 'arp']);

  it('never leaves the scale', () => {
    const h = PARLOUR_HARMONY;
    // Every pitch class the scale permits, in any octave.
    const allowed = new Set(h.scale.map((d) => (((h.root + d) % 12) + 12) % 12));

    for (let seed = 0; seed < 40; seed++) {
      for (const [, midi, , channel] of ornament(h, 256, createRng(`t:${seed}`))) {
        if (!PITCHED.has(channel)) continue;
        expect(allowed.has(((midi % 12) + 12) % 12), `midi ${midi} is out of key`).toBe(true);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = ornament(PARLOUR_HARMONY, 256, createRng('same'));
    const b = ornament(PARLOUR_HARMONY, 256, createRng('same'));
    expect(a).toEqual(b);
  });

  it('differs between passes, which is the entire point', () => {
    const first = ornament(PARLOUR_HARMONY, 256, createRng('parlour:0'));
    const second = ornament(PARLOUR_HARMONY, 256, createRng('parlour:1'));
    expect(first).not.toEqual(second);
  });

  it('stays inside the loop it was asked for', () => {
    const steps = 256;
    for (const [step, , dur] of ornament(PARLOUR_HARMONY, steps, createRng('bounds'))) {
      expect(step).toBeGreaterThanOrEqual(0);
      // A note may sustain over the loop point, but it must not start past it.
      expect(step).toBeLessThan(steps);
      expect(dur).toBeGreaterThan(0);
    }
  });

  it('leaves rests, so phrases have edges', () => {
    // A melody that never stops is what makes a loop feel like a loop. Across
    // sixteen bars some should carry no lead at all.
    const notes = ornament(PARLOUR_HARMONY, 256, createRng('rests'));
    const barsWithLead = new Set(
      notes.filter((n) => n[3] === 'lead').map((n) => Math.floor(n[0] / PARLOUR_HARMONY.barSteps)),
    );
    expect(barsWithLead.size).toBeLessThan(16);
  });
});

/**
 * Endgame pressure. The wall running down is the clock every hand shares, so
 * it drives tempo and thickens the kit. Layers are added rather than swapped
 * so the arrangement never has anything taken away underneath the player.
 */
describe('intensity layers', () => {
  const skeleton: PatternNote[] = [
    [0, 45, 6, 'bass'],
    [16, 50, 6, 'bass'],
  ];
  const count = (notes: PatternNote[], ch: string) => notes.filter((n) => n[3] === ch).length;

  it('adds nothing while the wall is deep', () => {
    expect(intensityLayers(skeleton, 64, 0)).toHaveLength(0);
    expect(intensityLayers(skeleton, 64, 0.2)).toHaveLength(0);
  });

  it('fills hats in to eighths first', () => {
    const layers = intensityLayers(skeleton, 64, 0.3);
    expect(count(layers, 'perc')).toBeGreaterThan(0);
    expect(count(layers, 'bass')).toBe(0);
  });

  it('answers on the offbeat with the bass note already in the bar', () => {
    const layers = intensityLayers(skeleton, 64, 0.6);
    const bass = layers.filter((n) => n[3] === 'bass');
    expect(bass.length).toBe(2);
    // Same pitches as the skeleton, so a generated offbeat cannot drift out
    // of the harmony the composed part established.
    expect(bass.map((n) => n[1]).sort()).toEqual([45, 50]);
    expect(bass.map((n) => n[0]).sort((a, b) => a - b)).toEqual([4, 20]);
  });

  it('never places a layer past the end of the loop', () => {
    for (const drive of [0.3, 0.6, 0.9, 1]) {
      for (const [step] of intensityLayers(skeleton, 64, drive)) {
        expect(step).toBeLessThan(64);
      }
    }
  });

  it('only ever adds, so the base arrangement survives every level', () => {
    let previous = 0;
    for (const drive of [0, 0.25, 0.55, 0.8, 1]) {
      const n = intensityLayers(skeleton, 64, drive).length;
      expect(n).toBeGreaterThanOrEqual(previous);
      previous = n;
    }
  });
});

/**
 * The rotation. Six tracks at roughly 45 seconds a pass, so nothing is heard
 * twice for about four and a half minutes — and the ornamentation differs even
 * then. These check the roster as a set rather than one track at a time,
 * because a track added later is exactly the one that will skip the review.
 */
describe('track roster', () => {
  const rotation = PARLOUR_ROTATION.map((id) => TRACKS[id]);

  it('resolves every id in the rotation', () => {
    PARLOUR_ROTATION.forEach((id, i) => {
      expect(rotation[i], `no track registered for "${id}"`).toBeDefined();
    });
    expect(new Set(PARLOUR_ROTATION).size).toBe(PARLOUR_ROTATION.length);
  });

  it('keeps every generated part inside its own key', () => {
    // The safety property, applied across the whole roster: a track added with
    // a mistyped scale or an out-of-range progression fails here rather than
    // in someone's ears.
    for (const t of rotation) {
      expect(t.harmony, `${t.id} has no harmony`).toBeDefined();
      const h = t.harmony!;
      const allowed = new Set(h.scale.map((d) => (((h.root + d) % 12) + 12) % 12));
      for (let seed = 0; seed < 8; seed++) {
        for (const [, midi, , ch] of ornament(h, t.steps, createRng(`${t.id}:${seed}`))) {
          if (ch !== 'lead' && ch !== 'arp') continue;
          expect(allowed.has(((midi % 12) + 12) % 12), `${t.id}: midi ${midi} out of key`).toBe(true);
        }
      }
    }
  });

  it('gives every track a loop long enough not to grate', () => {
    // The original was 11.4s and repeated 315 times an hour. Nothing in the
    // roster should be able to regress to that.
    for (const t of rotation) {
      const seconds = t.steps * (60 / t.bpm / 4);
      expect(seconds, `${t.id} loops every ${seconds.toFixed(1)}s`).toBeGreaterThan(30);
    }
  });

  it('authors a skeleton but no melody, so the generator owns the tune', () => {
    for (const t of rotation) {
      const channels = new Set(t.notes.map((n) => n[3]));
      expect(channels.has('bass'), `${t.id} has no bass`).toBe(true);
      expect(channels.has('perc'), `${t.id} has no drums`).toBe(true);
      expect(channels.has('lead'), `${t.id} authors a lead`).toBe(false);
    }
  });

  it('varies more than just the key', () => {
    // Two tracks in the same key with different chord orders read as different
    // pieces; a roster that only transposes reads as one piece six times.
    const shapes = new Set(rotation.map((t) => t.harmony!.progression.join(',')));
    expect(shapes.size).toBeGreaterThan(3);
    expect(new Set(rotation.map((t) => t.bpm)).size).toBeGreaterThan(3);
  });
});

/**
 * Autoplay. Browsers gate the AudioContext until the page has been interacted
 * with, and the previous handling of that lost the music for the whole session
 * if anything was clicked before the deal finished. Nothing covered it, which
 * is why it shipped.
 */
describe('gesture gating', () => {
  /** Put the engine's live context back into the blocked state. */
  const block = () => {
    musicEngine.play('parlour');          // force the context to exist
    musicEngine.stop();
    const ctx = FakeAudioContext.live;
    if (ctx) ctx.state = 'suspended';
    intervalCount = 0;
  };

  beforeEach(() => {
    delete SAMPLE_ASSETS.parlour;
    musicEngine.stop();
  });
  afterEach(() => {
    musicEngine.stop();
    const ctx = FakeAudioContext.live;
    if (ctx) ctx.state = 'running';
  });

  it('does not run the scheduler against a clock that is not moving', () => {
    // A suspended context's currentTime does not advance, so every note would
    // land on the same timestamp and fire together the moment it resumed.
    block();
    musicEngine.play('parlour');
    expect(intervalCount).toBe(0);
  });

  it('starts what was asked for once the gesture arrives', async () => {
    block();
    musicEngine.play('parlour');
    expect(intervalCount).toBe(0);

    musicEngine.resume();
    await Promise.resolve();
    await Promise.resolve();

    expect(intervalCount).toBe(1);
  });

  it('needs no argument, so a gesture listener cannot pass a stale one', () => {
    // The old handler took its own view of what should play, captured at
    // mount when there was no game yet, and guarded on it. resume() takes
    // nothing: the request was already recorded by play().
    expect(musicEngine.resume.length).toBe(0);
  });

  it('reports whether audio is actually allowed to sound', async () => {
    block();
    expect(musicEngine.unlocked).toBe(false);

    // Resuming is asynchronous even after a valid gesture, so `unlocked` is
    // still false the instant resume() returns. Anything that reads it to
    // decide whether to draw a "music playing" state has to wait too.
    musicEngine.resume();
    expect(musicEngine.unlocked).toBe(false);

    await Promise.resolve();
    await Promise.resolve();
    expect(musicEngine.unlocked).toBe(true);
  });
});
