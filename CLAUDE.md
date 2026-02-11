# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Flutter mobile app for playing Hong Kong Mahjong with:
- Real-time multiplayer with invite codes and matchmaking
- Single player vs AI (beginner/intermediate/advanced)
- 70s retro-modern UI design
- Supabase backend for auth, database, and realtime sync

## Build and Development Commands

```bash
# Get dependencies
flutter pub get

# Run code generation (for freezed, json_serializable, riverpod_generator)
flutter pub run build_runner build --delete-conflicting-outputs

# Run on device/simulator
flutter run

# Run tests
flutter test

# Analyze code
flutter analyze

# Build release
flutter build apk --release   # Android
flutter build ios --release   # iOS
```

## Architecture

### State Management (Riverpod)

Uses Riverpod with code generation. Providers are organized by feature:
- `lib/services/` - Backend service providers (Supabase, AI, Audio)
- `lib/features/*/providers/` - Feature-specific state providers

### Core Game Engine (`lib/core/`)

Pure Dart game logic, independent of UI:

- **models/tile.dart**: 144 tiles with `TileFactory.createFullSet()`
- **models/meld.dart**: Chow/Pong/Kong validation via `MeldValidator`
- **models/player.dart**: Player state and hand management
- **models/game_state.dart**: Complete game state with `GameStateFactory`
- **game_engine/scoring/**: Hong Kong faan-based scoring
  - `patterns.dart`: All scoring patterns (1-13 faan)
  - `hand_evaluator.dart`: Win condition detection
  - `scoring_engine.dart`: Faan calculation

### Theme (`lib/shared/theme/`)

70s retro-modern design system:
- **colors.dart**: Burnt orange, avocado green, mustard yellow, cream palette
- **app_theme.dart**: Fonts (Righteous, Fredoka, Nunito), rounded corners, shadows

### Project Structure

```
lib/
├── core/
│   ├── game_engine/
│   │   ├── scoring/       # Faan calculation, patterns, hand evaluation
│   │   ├── rules/         # Turn flow, wall management
│   │   └── ai/            # AI player strategies
│   └── models/            # Tile, Meld, Player, GameState
├── features/
│   ├── auth/              # Login, registration
│   ├── home/              # Main menu
│   ├── game/              # Game table UI
│   ├── lobby/             # Room creation, matchmaking
│   └── profile/           # Stats, achievements
├── shared/
│   ├── theme/             # Colors, typography, styling
│   └── widgets/           # Reusable UI components
└── services/
    ├── supabase/          # Backend integration
    ├── multiplayer/       # Room and game sync
    ├── ai/                # AI opponent service
    └── audio/             # Sound effects
```

## Hong Kong Scoring (Faan)

Minimum 3 faan to win, maximum 13 faan (limit hand).

Key patterns implemented in `lib/core/game_engine/scoring/patterns.dart`:
- 1 faan: All Chows, Self-Drawn, Dragon Pong, Seat/Prevailing Wind
- 3 faan: All Pongs, Half Flush, Small Dragons
- 6 faan: Full Flush
- 8 faan: Big Dragons
- 13 faan: Thirteen Orphans, Nine Gates, Big Winds, Heavenly/Earthly Hand

## Tile System

144 tiles total:
- Suits: Bamboo, Character, Dot (1-9, 4 copies each) = 108
- Honors: 4 Winds + 3 Dragons (4 copies each) = 28
- Bonus: 4 Flowers + 4 Seasons (1 each) = 8

`TileFactory.createFullSet()` generates all tiles with multilingual names.

## Supabase Setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

Quick start:
1. Create a Supabase project at supabase.com
2. Run `supabase/schema.sql` in the SQL Editor
3. Set environment variables:
```bash
flutter run --dart-define=SUPABASE_URL=your-url --dart-define=SUPABASE_ANON_KEY=your-key
```

Tables: `profiles`, `game_rooms`, `room_players`, `game_history`

## AI System

Three difficulty levels in `lib/core/game_engine/ai/`:
- **Beginner**: Random decisions, 30% mistake chance
- **Intermediate**: Basic strategy, 10% mistake chance
- **Advanced**: Optimal play, defensive awareness, 2% mistake chance

Use `AiPlayerFactory.create(difficulty: AiDifficulty.intermediate)` to create AI opponents.

## Animation Libraries

- **Rive** (`rive: ^0.12.0`): State-based game animations
- **flutter_animate** (`^4.5.0`): Declarative UI micro-interactions
- **Lottie** (`^3.0.0`): Celebration effects

See `assets/animations/README.md` for animation file requirements.

## Common Issues

**Build runner errors**: Run `flutter pub run build_runner build --delete-conflicting-outputs`

**Supabase not connecting**: Verify SUPABASE_URL and SUPABASE_ANON_KEY are set correctly

**Assets not found**: Ensure all directories in `pubspec.yaml` assets section exist
