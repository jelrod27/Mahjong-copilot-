# Mahjong Learning App

Learn mahjong from scratch. This mobile app teaches tile recognition, hand combinations, scoring, and strategy through interactive lessons and quizzes.

## Current Status

**Level 1: Know Your Tiles** - Complete
- 8 lessons covering all 144 tiles
- Interactive quizzes with feedback
- Progress tracking with local persistence
- Sequential lesson unlocking

**Coming Soon**
- Levels 2-6 (sets, hands, scoring, strategy)
- Tile SVG assets
- Practice mode with AI
- Firebase sync

## Quick Start

```bash
# Install dependencies
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

## Requirements

- Node.js 18+
- React Native CLI
- Xcode (iOS) or Android Studio (Android)
- iOS 14.0+ or Android API 26+

## Project Structure

```
src/
├── content/          # Learning content (lessons, quizzes)
│   └── level1.ts
├── components/       # Reusable UI components
│   └── MahjongTile/
├── features/         # Screen-level features
│   ├── learn/        # LearnScreen, LessonScreen
│   ├── practice/
│   ├── progress/
│   └── settings/
├── models/           # Data models (Tile, GameState)
├── navigation/       # React Navigation setup
├── store/            # Redux state management
├── theme/            # Colors, spacing, typography
└── utils/            # Helpers and utilities
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.73 |
| Language | TypeScript |
| State | Redux + Redux Thunk |
| Navigation | React Navigation |
| Storage | AsyncStorage |
| Backend | Firebase (planned) |

## Learning Content

Level 1 covers:
1. Introduction to mahjong
2. Dots suit (circles)
3. Bamboo suit (sticks) - includes the "1 = bird" gotcha
4. Characters suit (Chinese numerals)
5. Wind tiles
6. Dragon tiles
7. Bonus tiles (flowers and seasons)
8. Summary quiz

## Development

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Documentation

- [Setup Guide](SETUP_GUIDE.md)
- [Firebase Setup](FIREBASE_SETUP.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## License

MIT
