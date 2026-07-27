import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import musicEngine, { SAMPLE_ASSETS } from '../musicEngine';

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
  frequency: { value: number };
  connect: () => void;
  start: () => void;
  stop: () => void;
  started: boolean;
  stopped: boolean;
}

let createdOscs: FakeOsc[] = [];
let intervalCount = 0;

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

  createOscillator(): FakeOsc {
    const osc: FakeOsc = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      started: false,
      stopped: false,
      start: vi.fn(() => { osc.started = true; }),
      stop: vi.fn(() => { osc.stopped = true; }),
    };
    createdOscs.push(osc);
    return osc;
  }

  createBufferSource() {
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

beforeEach(() => {
  createdOscs = [];
  intervalCount = 0;
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
