import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

class FirebaseService {
  static getAuth() {
    return auth();
  }

  static getFirestore() {
    return firestore();
  }

  static getAnalytics() {
    return analytics();
  }

  static getCrashlytics() {
    return crashlytics();
  }

  // Initialize crash reporting
  static async initializeCrashlytics(): Promise<void> {
    // Crashlytics is automatically initialized in React Native Firebase
    // Additional setup can be done here if needed
  }

  // Log analytics event
  static async logEvent(name: string, parameters?: Record<string, any>): Promise<void> {
    try {
      await analytics().logEvent(name, parameters);
    } catch (error) {
      console.error('Analytics log error:', error);
    }
  }

  // Set user properties
  static async setUserProperty(name: string, value: string): Promise<void> {
    try {
      await analytics().setUserProperty(name, value);
    } catch (error) {
      console.error('Analytics user property error:', error);
    }
  }
}

export default FirebaseService;

