/**
 * Simple retro sound manager using Web Audio API for generated sounds.
 * No external sound files needed — generates 8-bit style sounds programmatically.
 */

type SoundName =
  | 'tilePlace'
  | 'tileDraw'
  | 'claim'
  | 'win'
  | 'winSelfDraw'
  | 'winLimitHand'
  | 'pass'
  | 'turnAlert'
  | 'kong';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;
  private masterGain: GainNode | null = null;
  /** Active oscillators for polyphony capping. */
  private activeOscs: OscillatorNode[] = [];
  /** Max concurrent voices before dropping the oldest. */
  private maxPolyphony = 4;
  /** Minimum gap (ms) between identical sound types to prevent spam. */
  private lastPlayTime: Record<string, number> = {};

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  private getMasterGain(): GainNode | null {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return null;
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return this.masterGain;
  }

  play(sound: SoundName) {
    if (!this.enabled) return;
    const now = performance.now();
    const last = this.lastPlayTime[sound] ?? 0;
    // Debounce: ignore identical sounds within 80ms (rapid-fire spam)
    if (now - last < 80) return;
    this.lastPlayTime[sound] = now;

    const gain = this.getMasterGain();
    if (!gain) return;

    switch (sound) {
      case 'tilePlace':
        this.playTone(gain, 800, 0.06, 'square');
        break;
      case 'tileDraw':
        this.playTone(gain, 600, 0.08, 'triangle');
        this.playTone(gain, 900, 0.06, 'triangle', 0.05);
        break;
      case 'claim':
        this.playTone(gain, 500, 0.08, 'square');
        this.playTone(gain, 700, 0.08, 'square', 0.08);
        this.playTone(gain, 1000, 0.1, 'square', 0.16);
        break;
      case 'kong':
        this.playTone(gain, 250, 0.14, 'sawtooth');
        this.playTone(gain, 350, 0.12, 'sawtooth', 0.06);
        this.playTone(gain, 600, 0.12, 'square', 0.14);
        this.playTone(gain, 900, 0.14, 'square', 0.26);
        break;
      case 'win':
        this.playTone(gain, 523, 0.12, 'square');
        this.playTone(gain, 659, 0.12, 'square', 0.12);
        this.playTone(gain, 784, 0.12, 'square', 0.24);
        this.playTone(gain, 1047, 0.2, 'square', 0.36);
        break;
      case 'winSelfDraw':
        this.playTone(gain, 523, 0.12, 'square');
        this.playTone(gain, 659, 0.12, 'square', 0.12);
        this.playTone(gain, 784, 0.12, 'square', 0.24);
        this.playTone(gain, 1047, 0.16, 'square', 0.36);
        this.playTone(gain, 1568, 0.24, 'square', 0.5);
        break;
      case 'winLimitHand':
        this.playTone(gain, 196, 0.16, 'sawtooth');
        this.playTone(gain, 523, 0.12, 'square', 0.06);
        this.playTone(gain, 659, 0.12, 'square', 0.18);
        this.playTone(gain, 784, 0.12, 'square', 0.3);
        this.playTone(gain, 1047, 0.14, 'square', 0.42);
        this.playTone(gain, 1568, 0.18, 'square', 0.56);
        this.playTone(gain, 2093, 0.3, 'square', 0.74);
        break;
      case 'pass':
        this.playTone(gain, 300, 0.05, 'sine');
        break;
      case 'turnAlert':
        this.playTone(gain, 1200, 0.04, 'square');
        this.playTone(gain, 1200, 0.04, 'square', 0.08);
        break;
    }
  }

  private playTone(
    masterGain: GainNode,
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    delay: number = 0,
  ) {
    const ctx = this.ctx;
    if (!ctx) return;

    // Polyphony cap: drop oldest if we're at the limit.
    while (this.activeOscs.length >= this.maxPolyphony) {
      const oldest = this.activeOscs.shift();
      if (oldest) {
        try {
          oldest.stop();
          oldest.disconnect();
        } catch {
          // Already stopped
        }
      }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 1; // Per-voice gain unity; master handles overall volume.

    // Envelope: quick attack, quick decay
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    this.activeOscs.push(osc);

    osc.onended = () => {
      const idx = this.activeOscs.indexOf(osc);
      if (idx >= 0) this.activeOscs.splice(idx, 1);
      try {
        gain.disconnect();
        osc.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };
  }
}

// Singleton
const soundManager = new SoundManager();
export default soundManager;
