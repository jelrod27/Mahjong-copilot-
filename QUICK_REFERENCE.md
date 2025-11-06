# Mahjong App - Quick Reference Card

## 🚀 Quick Commands

```bash
# Initial Setup
flutter pub get                  # Install dependencies
flutterfire configure            # Configure Firebase
flutter run                      # Run app

# Development
flutter run --release           # Run in release mode
flutter run -d <device_id>      # Run on specific device
flutter devices                 # List available devices

# Building
flutter build apk               # Build Android APK
flutter build appbundle         # Build Android Bundle
flutter build ios               # Build iOS

# Maintenance
flutter clean                   # Clean build files
flutter pub get                 # Refresh dependencies
flutter doctor                  # Check Flutter setup
flutter analyze                # Analyze code
```

## 📁 Important File Locations

```
Configuration Files:
├── android/app/google-services.json          ← Firebase Android config
├── ios/Runner/GoogleService-Info.plist        ← Firebase iOS config
└── lib/core/config/firebase_options.dart      ← Firebase options

Assets:
├── assets/tiles/                              ← Tile SVG files (144 needed)
├── assets/images/                             ← Icons, splash screen
├── assets/sounds/                             ← Sound effects
└── assets/fonts/                               ← Custom fonts

Firebase Collections:
├── users                                       ← User profiles
├── progress                                    ← Learning progress
├── learning_content                            ← Lessons & quizzes
└── games                                       ← Practice games
```

## 🔧 Common Fixes

**Build Error:**
```bash
flutter clean
flutter pub get
flutter run
```

**Firebase Not Working:**
- Check `google-services.json` is in `android/app/`
- Check `GoogleService-Info.plist` is in `ios/Runner/`
- Verify Firebase project is created
- Check Firestore rules are set

**Tiles Not Showing:**
- Verify SVG files in `assets/tiles/`
- Check file names match code expectations
- Run `flutter pub get` again

**iOS Build Issues:**
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter run
```

## 📞 Support Resources

- Flutter Docs: https://flutter.dev/docs
- Firebase Docs: https://firebase.google.com/docs
- FlutterFire Docs: https://firebase.flutter.dev

## 🎯 Next Steps Priority

1. **Firebase Setup** (Required for authentication)
2. **Tile Assets** (Required for app to function)
3. **Icons & Splash** (Required for release)
4. **Content** (Required for learning features)
5. **Testing** (Required before release)

