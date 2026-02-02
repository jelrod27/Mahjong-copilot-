# Mahjong App - Quick Reference Card (React Native)

## 🚀 Quick Commands

```bash
# Initial Setup
npm install                      # Install dependencies
npx @react-native-firebase/cli init  # Configure Firebase
npm start                       # Start Metro bundler
npm run android                 # Run on Android
npm run ios                     # Run on iOS

# Development
npm start -- --reset-cache      # Reset Metro cache
npx react-native run-android --deviceId=<id>  # Run on specific device
npx react-native run-ios --device=<name>      # Run on specific iOS device

# Building
cd android && ./gradlew assembleRelease  # Build Android APK
cd android && ./gradlew bundleRelease    # Build Android Bundle
# iOS: Build in Xcode

# Maintenance
npm start -- --reset-cache      # Reset cache
npm install                     # Refresh dependencies
npx react-native info           # Check React Native setup
npm run lint                    # Lint code
```

## 📁 Important File Locations

```
Configuration Files:
├── android/app/google-services.json          ← Firebase Android config
├── ios/GoogleService-Info.plist             ← Firebase iOS config
└── package.json                              ← Dependencies

Assets:
├── assets/tiles/                              ← Tile SVG files (144 needed)
├── assets/images/                             ← Icons, splash screen
├── assets/sounds/                             ← Sound effects
└── assets/fonts/                              ← Custom fonts

Source Code:
├── src/                                       ← Main source directory
│   ├── App.tsx                                ← App entry point
│   ├── components/                            ← Reusable components
│   ├── features/                              ← Feature screens
│   ├── models/                                ← TypeScript models
│   ├── store/                                 ← Redux store
│   └── services/                              ← Firebase & storage services

Firebase Collections:
├── users                                       ← User profiles
├── progress                                    ← Learning progress
├── learning_content                            ← Lessons & quizzes
└── games                                       ← Practice games
```

## 🔧 Common Fixes

**Build Error:**
```bash
npm start -- --reset-cache
cd android && ./gradlew clean && cd ..
cd ios && pod deintegrate && pod install && cd ..
npm run android
```

**Firebase Not Working:**
- Check `google-services.json` is in `android/app/`
- Check `GoogleService-Info.plist` is in `ios/`
- Verify Firebase project is created
- Check Firestore rules are set
- Run `npm install` to ensure packages are installed

**Tiles Not Showing:**
- Verify SVG files in `assets/tiles/`
- Check file names match code expectations
- Run `npm start -- --reset-cache` again
- Check Metro bundler is running

**iOS Build Issues:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Metro Bundler Issues:**
```bash
npm start -- --reset-cache
# Or kill Metro and restart:
killall node
npm start
```

## 📞 Support Resources

- React Native Docs: https://reactnative.dev/docs/getting-started
- Firebase Docs: https://firebase.google.com/docs
- React Native Firebase Docs: https://rnfirebase.io/
- React Navigation Docs: https://reactnavigation.org/
- Redux Docs: https://redux.js.org/

## 🎯 Next Steps Priority

1. **Firebase Setup** (Required for authentication)
2. **Tile Assets** (Required for app to function)
3. **Icons & Splash** (Required for release)
4. **Content** (Required for learning features)
5. **Testing** (Required before release)
