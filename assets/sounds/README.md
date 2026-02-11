# Sound Effects

This directory contains audio files for game sound effects.

## Required Sound Files

### Tile Sounds
- `tile_click.mp3` - Tile selection click
- `tile_place.mp3` - Placing a tile on the table
- `tile_shuffle.mp3` - Shuffling tiles at game start
- `tile_draw.mp3` - Drawing a tile from the wall

### Game Event Sounds
- `chow.mp3` - Claiming a chow
- `pong.mp3` - Claiming a pong
- `kong.mp3` - Declaring a kong
- `win.mp3` - Winning the game (mahjong!)
- `turn_start.mp3` - Your turn begins

### UI Sounds
- `button_click.mp3` - Button press
- `menu_open.mp3` - Menu/dialog opens
- `notification.mp3` - Alert notification

### Ambient (Optional)
- `background_music.mp3` - Looping background music

## Audio Guidelines

- Format: MP3 or OGG (MP3 recommended for compatibility)
- Sample rate: 44.1kHz
- Bit rate: 128-192 kbps
- Duration: Short effects < 2 seconds

## Free Sound Resources

- [Freesound](https://freesound.org/) - CC licensed sounds
- [OpenGameArt](https://opengameart.org/) - Game sound effects
- [Zapsplat](https://www.zapsplat.com/) - Free sound effects

## Usage in Flutter

```dart
import 'package:audioplayers/audioplayers.dart';

final player = AudioPlayer();
await player.play(AssetSource('sounds/tile_click.mp3'));
```
