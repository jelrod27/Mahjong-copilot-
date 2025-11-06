# Mahjong Learning App

A comprehensive mobile learning platform that teaches users how to play mahjong from beginner to advanced levels.

## Features

- Interactive tile recognition and learning
- Progressive learning path (Levels 1-6)
- Practice mode with AI opponents
- Score calculator and education
- Progress tracking and achievements
- Multiple mahjong variants support

## Getting Started

### Prerequisites

- Node.js (>=18.0.0)
- npm or yarn
- React Native CLI
- Firebase project configured
- iOS 14.0+ or Android API 26+
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/`

4. For iOS, install pods:
   ```bash
   cd ios && pod install && cd ..
   ```

5. Run the app:
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

## Project Structure

```
src/
├── App.tsx
├── components/
│   └── mahjong-tiles/
├── constants/
├── services/
├── features/
│   ├── auth/
│   ├── learn/
│   ├── practice/
│   ├── reference/
│   ├── progress/
│   └── settings/
├── models/
├── navigation/
├── store/
│   ├── actions/
│   ├── reducers/
│   └── types/
├── theme/
└── utils/
```

## Development

This project follows React Native best practices:
- Redux for state management
- TypeScript for type safety
- Feature-based folder structure
- Clean architecture principles
- Comprehensive error handling

## Technology Stack

- **Framework**: React Native 0.73.0
- **Language**: TypeScript
- **State Management**: Redux with Redux Thunk
- **Navigation**: React Navigation
- **Firebase**: @react-native-firebase
- **Storage**: AsyncStorage
- **SVG**: react-native-svg

## Documentation

- [Setup Guide](SETUP_GUIDE.md) - Complete setup instructions
- [Firebase Setup](FIREBASE_SETUP.md) - Firebase configuration guide
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - What's been implemented
- [Quick Reference](QUICK_REFERENCE.md) - Common commands and fixes

## License

[Add your license here]
