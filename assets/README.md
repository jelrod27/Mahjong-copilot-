# Assets Structure

This directory contains all static assets for the Mahjong Learning App.

## Directory Structure

```
assets/
├── images/
│   ├── logo.png
│   ├── splash.png
│   └── placeholders/
│       └── tile_placeholder.png
├── tiles/
│   ├── bamboo_1.svg
│   ├── bamboo_2.svg
│   ├── ... (all 144 tiles)
│   ├── character_1.svg
│   ├── dot_1.svg
│   ├── wind_east.svg
│   ├── dragon_red.svg
│   ├── flower_1.svg
│   └── season_1.svg
├── sounds/
│   ├── tile_click.mp3
│   ├── tile_shuffle.mp3
│   ├── win.mp3
│   ├── lose.mp3
│   └── discard.mp3
├── icons/
│   ├── achievement_badge.svg
│   └── ... (other UI icons)
└── fonts/
    ├── NotoSansSC-Regular.ttf
    └── NotoSansJP-Regular.ttf
```

## Tile Assets

All tile SVG files should follow the naming convention:
- Suit tiles: `{suit}_{number}.svg` (e.g., `bamboo_1.svg`, `character_5.svg`)
- Wind tiles: `wind_{direction}.svg` (e.g., `wind_east.svg`)
- Dragon tiles: `dragon_{color}.svg` (e.g., `dragon_red.svg`)
- Flower tiles: `flower_{number}.svg` (e.g., `flower_1.svg`)
- Season tiles: `season_{number}.svg` (e.g., `season_1.svg`)

## Asset Loading

Assets are loaded automatically through Flutter's asset system as configured in `pubspec.yaml`.

To add new assets:
1. Place the file in the appropriate directory
2. Update `pubspec.yaml` if needed (for new directories)
3. Reference using `AssetImage('assets/path/to/file.ext')` or `'assets/path/to/file.ext'`

