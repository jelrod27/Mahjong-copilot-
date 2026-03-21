import { UserProgress, userProgressToJson, userProgressFromJson } from '@/models/UserProgress';
import { GameState, gameStateToJson, gameStateFromJson } from '@/models/GameState';

class StorageService {
  static async setString(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('StorageService.setString error:', error);
    }
  }

  static async getString(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('StorageService.getString error:', error);
      return null;
    }
  }

  static async setBool(key: string, value: boolean): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('StorageService.setBool error:', error);
    }
  }

  static async getBool(key: string): Promise<boolean | null> {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as boolean;
    } catch (error) {
      console.error('StorageService.getBool error:', error);
      return null;
    }
  }

  static async setInt(key: string, value: number): Promise<void> {
    try {
      localStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('StorageService.setInt error:', error);
    }
  }

  static async getInt(key: string): Promise<number | null> {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return parseInt(value, 10);
    } catch (error) {
      console.error('StorageService.getInt error:', error);
      return null;
    }
  }

  static async saveProgress(progress: UserProgress): Promise<void> {
    try {
      const json = userProgressToJson(progress);
      localStorage.setItem(`progress_${progress.userId}`, JSON.stringify(json));
    } catch (error) {
      console.error('StorageService.saveProgress error:', error);
    }
  }

  static async getProgress(userId: string): Promise<UserProgress | null> {
    try {
      const data = localStorage.getItem(`progress_${userId}`);
      if (!data) return null;
      return userProgressFromJson(JSON.parse(data));
    } catch (error) {
      console.error('StorageService.getProgress error:', error);
      return null;
    }
  }

  static async saveGame(gameState: GameState): Promise<void> {
    try {
      const json = gameStateToJson(gameState);
      localStorage.setItem(`game_${gameState.id}`, JSON.stringify(json));
      localStorage.setItem('current_game_id', gameState.id);
    } catch (error) {
      console.error('StorageService.saveGame error:', error);
    }
  }

  static async getGame(gameId: string): Promise<GameState | null> {
    try {
      const data = localStorage.getItem(`game_${gameId}`);
      if (!data) return null;
      return gameStateFromJson(JSON.parse(data));
    } catch (error) {
      console.error('StorageService.getGame error:', error);
      return null;
    }
  }

  static async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('StorageService.clear error:', error);
    }
  }
}

export default StorageService;
