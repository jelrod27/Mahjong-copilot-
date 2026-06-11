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

  /** Track scheduled voices with their temporal windows for overlap-aware capping. */
  private activeVoices: { osc: OscillatorNode; startTime: number; endTime: number }[] = [];
  /** Max concurrent *playing* voices; creation order doesn't count. */
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

    // Physical-feeling sounds get per-play pitch variance so no two tile
    // clacks are ever identical — the audio equivalent of real tiles.
    const vary = (freq: number) => freq * (0.93 + Math.random() * 0.14);

    switch (sound) {
      case 'tilePlace':
        this.playTone(gain, vary(800), 0.05 + Math.random() * 0.025, 'square');
        this.playTone(gain, vary(2400), 0.018, 'triangle', 0.004); // click transient
        break;
      case 'tileDraw':
        this.playTone(gain, vary(600), 0.08, 'triangle');
        this.playTone(gain, vary(900), 0.06, 'triangle', 0.05);
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

  /**
   * Rising-pitch tick for the fan-row reveal on the win screen. Each step
   * climbs a semitone-ish so a big hand audibly escalates as fans stack.
   */
  playFanTick(step: number) {
    if (!this.enabled) return;
    const gain = this.getMasterGain();
    if (!gain) return;
    const freq = 660 * Math.pow(2, Math.min(step, 14) / 12);
    this.playTone(gain, freq, 0.05, 'square');
  }

  /** Jackpot cascade for limit-hand wins: a descending-then-ascending shower. */
  playJackpot() {
    if (!this.enabled) return;
    const gain = this.getMasterGain();
    if (!gain) return;
    const notes = [1568, 1318, 1047, 784, 1047, 1318, 1568, 2093, 2637];
    notes.forEach((freq, i) => {
      this.playTone(gain, freq, 0.09, 'square', i * 0.07);
    });
    this.playTone(gain, 131, 0.6, 'sawtooth', 0.1); // low rumble under the shower
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

    const startTime = ctx.currentTime + delay;
    const endTime = startTime + duration + 0.01;

    /*
      Overlap-aware polyphony: only count (and evict) voices whose playback
      window overlaps the one being scheduled. We first drop any voices whose
      stopTime already passed, then if the remaining count is still at the
      limit we stop the oldest scheduled voice. This preserves all scheduled
      notes of a sequential fanfare while capping genuine simultaneous overlap
      from separate play() calls.
    */
    this.activeVoices = this.activeVoices.filter(v => v.endTime > ctx!.currentTime);
    // Cap genuinely simultaneous voices, but never evict a note that hasn't
    // started yet — sequential fanfares/cascades schedule their whole run up
    // front and must survive intact.
    const playingNow = this.activeVoices.filter(v => v.startTime <= ctx!.currentTime);
    while (playingNow.length >= this.maxPolyphony) {
      const oldest = playingNow.shift();
      if (oldest) {
        try { oldest.osc.stop(); } catch { /* already stopped */ }
        const idx = this.activeVoices.indexOf(oldest);
        if (idx >= 0) this.activeVoices.splice(idx, 1);
      }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 1; // Per-voice unity; master handles overall volume.

    // Envelope: quick attack, quick decay
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    this.activeVoices.push({ osc, startTime, endTime });

    osc.onended = () => {
      const idx = this.activeVoices.findIndex(v => v.osc === osc);
      if (idx >= 0) this.activeVoices.splice(idx, 1);
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
