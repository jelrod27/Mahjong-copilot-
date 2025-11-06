import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

class SoundService {
  private static soundEnabled: boolean = true;

  // Initialize sound service
  static async init(): Promise<void> {
    // Sound enabled state should be loaded from settings
  }

  // Set whether sounds are enabled
  static setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  // Play tile click sound
  static playTileClick(): Promise<void> {
    return this.playSound('tile_click.mp3');
  }

  // Play tile shuffle sound
  static playShuffle(): Promise<void> {
    return this.playSound('tile_shuffle.mp3');
  }

  // Play win sound
  static playWin(): Promise<void> {
    return this.playSound('win.mp3');
  }

  // Play lose sound
  static playLose(): Promise<void> {
    return this.playSound('lose.mp3');
  }

  // Play discard sound
  static playDiscard(): Promise<void> {
    return this.playSound('discard.mp3');
  }

  // Private helper to play sounds
  private static playSound(filename: string): Promise<void> {
    if (!this.soundEnabled) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Sound loading error:', error);
          reject(error);
          return;
        }

        sound.play((success) => {
          if (success) {
            sound.release();
            resolve();
          } else {
            sound.release();
            reject(new Error('Sound playback failed'));
          }
        });
      });
    });
  }

  // Dispose resources
  static dispose(): void {
    // Sound instances are released after each play
    // This method can be used for cleanup if needed
  }
}

export default SoundService;

