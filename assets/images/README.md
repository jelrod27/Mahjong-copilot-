# Images

This directory contains image assets for the app.

## Required Images

### App Branding
- `logo.png` - App logo (512x512)
- `logo_small.png` - Small logo for headers (128x128)
- `splash.png` - Splash screen image

### Backgrounds
- `table_background.png` - Game table texture
- `home_background.png` - Home screen background
- `pattern_70s.png` - Retro 70s pattern overlay

### Player Avatars
- `avatar_default.png` - Default player avatar
- `avatar_1.png` through `avatar_8.png` - Selectable avatars

### UI Elements
- `empty_hand.png` - Placeholder for empty hand
- `tile_back.png` - Back of a tile (face down)

## Image Guidelines

- Format: PNG for transparency, JPG for photos
- App icon: 512x512 PNG
- Backgrounds: 1080x1920 or tileable
- Use the 70s color palette:
  - Burnt Orange: #CC5500
  - Avocado Green: #568203
  - Mustard Yellow: #FFDB58
  - Cream: #FFFDD0

## Generating App Icons

Use `flutter_launcher_icons` package:

```yaml
# pubspec.yaml
dev_dependencies:
  flutter_launcher_icons: ^0.13.1

flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/images/logo.png"
```

Run: `flutter pub run flutter_launcher_icons`
