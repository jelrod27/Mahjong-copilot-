import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';

class FirebaseService {
  static FirebaseAuth get auth => FirebaseAuth.instance;
  static FirebaseFirestore get firestore => FirebaseFirestore.instance;
  static FirebaseAnalytics get analytics => FirebaseAnalytics.instance;
  static FirebaseCrashlytics get crashlytics => FirebaseCrashlytics.instance;

  // Initialize crash reporting
  static Future<void> initializeCrashlytics() async {
    FlutterError.onError = (errorDetails) {
      crashlytics.recordFlutterFatalError(errorDetails);
    };
  }

  // Log analytics event
  static Future<void> logEvent(String name, Map<String, dynamic>? parameters) async {
    await analytics.logEvent(name: name, parameters: parameters);
  }

  // Set user properties
  static Future<void> setUserProperty(String name, String value) async {
    await analytics.setUserProperty(name: name, value: value);
  }
}

