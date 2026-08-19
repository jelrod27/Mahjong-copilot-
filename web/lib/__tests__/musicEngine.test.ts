import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import musicEngine, { SAMPLE_ASSETS, pulseCoefficients } from '../musicEngine';

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

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  resume = vi.fn();

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
