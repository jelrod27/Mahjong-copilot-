what # Hong Kong Mahjong

A cross-platform mobile mahjong game built with Flutter, featuring real-time multiplayer and a 70s retro-modern design.

## Features

- **Hong Kong Mahjong Rules**: Standard faan-based scoring (3-13 faan)
- **Multiplayer**: Private rooms with invite codes, public matchmaking
- **Single Player**: AI opponents with adjustable difficulty
- **70s Retro Design**: Burnt orange, avocado green, mustard yellow palette

## Getting Started

### Prerequisites

- Flutter SDK (3.2.0+)
- Dart SDK (3.2.0+)
- Android Studio / Xcode for mobile development
- Supabase account for backend

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```
3. Set up Supabase credentials:
   ```bash
   flutter run --dart-define=SUPABASE_URL=your-url --dart-define=SUPABASE_ANON_KEY=your-key
   ```

4. Run the app:
   ```bash
   flutter run
   ```

## Project Structure

```
lib/
├── core/
│   ├── game_engine/     # Game logic, scoring, AI
│   └── models/          # Tile, Player, GameState
├── features/
│   ├── home/            # Main menu
│   ├── game/            # Game table
│   └── lobby/           # Multiplayer rooms
├── shared/
│   ├── theme/           # 70s retro styling
│   └── widgets/         # Reusable components
└── services/            # Supabase, audio, etc.
```

## Technology Stack

- **Framework**: Flutter 3.x
- **State Management**: Riverpod
- **Backend**: Supabase (Auth, Database, Realtime)
- **Fonts**: Righteous, Fredoka One, Nunito

## Hong Kong Scoring

| Faan | Patterns |
|------|----------|
| 1 | All Chows, Self-Drawn, Dragon Pong |
| 3 | All Pongs, Half Flush, Small Dragons |
| 6 | Full Flush |
| 8 | Big Dragons |
| 13 | Thirteen Orphans, Nine Gates, Big Winds |

Minimum 3 faan to win. Maximum 13 faan (limit hand).

## License

MIT
