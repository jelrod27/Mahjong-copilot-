/**
 * Procedural chiptune music engine. Web Audio sequencer with a lookahead
 * scheduler (the "tale of two clocks" pattern), exact loop points, and a
 * ducking hook for the win sequence. No audio assets: every voice is an
 * oscillator, in keeping with the 16-bit fantasy. Commissioned tracks can
 * replace patterns later behind the same play/stop/duck API
 * (docs/design/audio.md).
 */

type Channel = 'lead' | 'bass' | 'pad';

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

const CHANNEL_CONFIG: Record<Channel, { type: OscillatorType; gain: number }> = {
  lead: { type: 'square', gain: 0.16 },
  bass: { type: 'triangle', gain: 0.3 },
  pad: { type: 'sine', gain: 0.07 },
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;
const MUSIC_GAIN = 0.14; // mixed well under the tile clack (see audio spec)

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
    return !!this.timer && (!trackId || this.current?.id === trackId);
  }

  /**
   * Start a track loop. `intensity` 0-2 raises tempo and pitch for higher
   * Parlour wings (one pattern, three moods).
   */
  play(trackId: 'parlour' | 'danger', intensity: 0 | 1 | 2 = 0) {
    if (!this.enabled) return;
    const track = TRACKS[trackId];
    const ctx = this.getContext();
    if (!track || !ctx || !this.musicGain) return;
    const nextTranspose = (track.transpose ?? 0) + intensity * 2;
    const nextTempo = 1 + intensity * 0.08;
    if (this.current?.id === trackId && this.timer) {
      // Same track: retune in place when only the intensity changed
      this.transpose = nextTranspose;
      this.tempoScale = nextTempo;
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
    const ctx = this.ctx!;
    const [, midi, durSteps, channel] = note;
    const conf = CHANNEL_CONFIG[channel];
    const dur = durSteps * stepDur * 0.92; // slight gap between notes

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = conf.type;
    osc.frequency.value = midiToFreq(midi + this.transpose);

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(conf.gain, when + 0.01);
    gain.gain.setValueAtTime(conf.gain, when + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0.0001, when + dur);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    this.scheduled.push(osc);
  }
}

const musicEngine = new MusicEngine();
export default musicEngine;
