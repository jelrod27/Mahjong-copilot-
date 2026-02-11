# Rive Animations

This directory contains Rive animation files for the mahjong game.

## Required Animations

Create or download the following Rive files:

### Game Animations
- `tile_draw.riv` - Animation for drawing a tile from the wall
- `tile_discard.riv` - Animation for discarding a tile
- `meld_form.riv` - Animation for forming a meld (chow, pong, kong)
- `win_celebration.riv` - Celebration animation when a player wins

### UI Animations
- `loading.riv` - Loading spinner
- `button_press.riv` - Button press feedback
- `turn_indicator.riv` - Indicates whose turn it is

## Creating Rive Animations

1. Visit [rive.app](https://rive.app/) and create a free account
2. Create animations using the Rive editor
3. Export as `.riv` files
4. Place in this directory

## Free Resources

You can find free Rive animations at:
- [Rive Community](https://rive.app/community/)
- [Rive Examples](https://rive.app/examples/)

## Usage in Flutter

```dart
import 'package:rive/rive.dart';

RiveAnimation.asset(
  'assets/animations/tile_draw.riv',
  stateMachines: ['gameState'],
  onInit: (artboard) {
    final controller = StateMachineController.fromArtboard(artboard, 'gameState');
    artboard.addController(controller!);
  },
)
```

## State Machine Naming Convention

For game animations, use these state machine triggers:
- `start` - Begin the animation
- `complete` - Animation finished
- `reset` - Reset to initial state
