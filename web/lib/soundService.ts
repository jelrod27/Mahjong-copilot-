class SoundService {
  private static soundEnabled = true;

  static setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  private static play(src: string): void {
    if (!this.soundEnabled) return;
    try {
      const audio = new Audio(src);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore audio errors
    }
  }

  static playTileClick(): void {
    this.play('/sounds/tile_click.mp3');
  }

  static playShuffle(): void {
    this.play('/sounds/shuffle.mp3');
  }

  static playWin(): void {
    this.play('/sounds/win.mp3');
  }

  static playLose(): void {
    this.play('/sounds/lose.mp3');
  }

  static playDiscard(): void {
    this.play('/sounds/discard.mp3');
  }
}

export default SoundService;
