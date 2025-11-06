import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/theme/app_theme.dart';
import 'core/services/firebase_service.dart';
import 'core/services/storage_service.dart';
import 'core/config/firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/progress_provider.dart';
import 'providers/game_provider.dart';
import 'providers/settings_provider.dart';
import 'features/navigation/main_navigation.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Initialize local storage
  await StorageService.init();
  
  // Initialize crash reporting
  await FirebaseService.initializeCrashlytics();
  
  runApp(const MahjongLearningApp());
}

class MahjongLearningApp extends StatelessWidget {
  const MahjongLearningApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProgressProvider()),
        ChangeNotifierProvider(create: (_) => GameProvider()),
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
      ],
      child: Consumer<SettingsProvider>(
        builder: (context, settingsProvider, _) {
          return MaterialApp(
            title: 'Mahjong Learning App',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: settingsProvider.themeMode,
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('en', ''),
              Locale('zh', 'CN'),
              Locale('zh', 'TW'),
              Locale('ja', ''),
            ],
            home: const MainNavigation(),
          );
        },
      ),
    );
  }
}

