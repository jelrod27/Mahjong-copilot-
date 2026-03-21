/**
 * Simple retro sound manager using Web Audio API for generated sounds.
 * No external sound files needed — generates 8-bit style sounds programmatically.
 */

type SoundName = 'tilePlace' | 'tileDraw' | 'claim' | 'win' | 'pass' | 'turnAlert';

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
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
  }

  play(sound: SoundName) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Resume context if suspended (browsers require user interaction first)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    switch (sound) {
      case 'tilePlace':
        this.playTone(ctx, 800, 0.06, 'square');
        break;
      case 'tileDraw':
        this.playTone(ctx, 600, 0.08, 'triangle');
        this.playTone(ctx, 900, 0.06, 'triangle', 0.05);
        break;
      case 'claim':
        this.playTone(ctx, 500, 0.08, 'square');
        this.playTone(ctx, 700, 0.08, 'square', 0.08);
        this.playTone(ctx, 1000, 0.1, 'square', 0.16);
        break;
      case 'win':
        this.playTone(ctx, 523, 0.12, 'square');
        this.playTone(ctx, 659, 0.12, 'square', 0.12);
        this.playTone(ctx, 784, 0.12, 'square', 0.24);
        this.playTone(ctx, 1047, 0.2, 'square', 0.36);
        break;
      case 'pass':
        this.playTone(ctx, 300, 0.05, 'sine');
        break;
      case 'turnAlert':
        this.playTone(ctx, 1200, 0.04, 'square');
        this.playTone(ctx, 1200, 0.04, 'square', 0.08);
        break;
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    delay: number = 0,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = this.volume;

    // Envelope: quick attack, quick decay
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(this.volume, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }
}

// Singleton
const soundManager = new SoundManager();
export default soundManager;
