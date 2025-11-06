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

- Flutter SDK (>=3.0.0)
- Firebase project configured
- iOS 14.0+ or Android API 26+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Configure Firebase:
   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/Runner/`

4. Run the app:
   ```bash
   flutter run
   ```

## Project Structure

```
lib/
├── main.dart
├── core/
│   ├── theme/
│   ├── constants/
│   ├── utils/
│   └── services/
├── features/
│   ├── auth/
│   ├── learn/
│   ├── practice/
│   ├── reference/
│   ├── progress/
│   └── settings/
├── models/
├── widgets/
│   └── mahjong_tiles/
└── providers/
```

## Development

This project follows Flutter best practices:
- Provider for state management
- Feature-based folder structure
- Clean architecture principles
- Comprehensive error handling

## License

[Add your license here]
