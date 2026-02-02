import AsyncStorage from '@react-native-async-storage/async-storage';
import {UserProgress, userProgressToJson, userProgressFromJson} from '../models/UserProgress';
import {GameState, gameStateToJson, gameStateFromJson} from '../models/GameState';

class StorageService {
  static async setString(key: string, value: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Storage setString error:', error);
      return false;
    }
  }

  static async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getString error:', error);
      return null;
    }
  }

  static async setBool(key: string, value: boolean): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage setBool error:', error);
      return false;
    }
  }

  static async getBool(key: string): Promise<boolean | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage getBool error:', error);
      return null;
    }
  }

  static async setInt(key: string, value: number): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage setInt error:', error);
      return false;
    }
  }

  static async getInt(key: string): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage getInt error:', error);
      return null;
    }
  }

  static async saveProgress(progress: UserProgress): Promise<boolean> {
    try {
      const json = JSON.stringify(userProgressToJson(progress));
      return await this.setString(`user_progress_${progress.userId}`, json);
    } catch (error) {
      console.error('Storage saveProgress error:', error);
      return false;
    }
  }

  static async getProgress(userId: string): Promise<UserProgress | null> {
    try {
      const json = await this.getString(`user_progress_${userId}`);
      if (!json) return null;

      const data = JSON.parse(json);
      return userProgressFromJson(data);
    } catch (error) {
      console.error('Storage getProgress error:', error);
      return null;
    }
  }

  static async saveGame(game: GameState): Promise<boolean> {
    try {
      const json = JSON.stringify(gameStateToJson(game));
      return await this.setString(`current_game_${game.id}`, json);
    } catch (error) {
      console.error('Storage saveGame error:', error);
      return false;
    }
  }

  static async getGame(gameId: string): Promise<GameState | null> {
    try {
      const json = await this.getString(`current_game_${gameId}`);
      if (!json) return null;

      const data = JSON.parse(json);
      return gameStateFromJson(data);
    } catch (error) {
      console.error('Storage getGame error:', error);
      return null;
    }
  }

  static async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
}

export default StorageService;

