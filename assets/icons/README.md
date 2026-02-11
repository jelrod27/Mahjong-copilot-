# Icons

This directory contains custom icon assets.

## Custom Icons (Optional)

Most icons can use Material Icons, but custom icons may include:

### Game Icons
- `mahjong.svg` - Mahjong game icon
- `tile_stack.svg` - Stack of tiles
- `dice.svg` - Dice for determining dealer

### Navigation Icons
- `home.svg` - Home tab
- `play.svg` - Play game
- `settings.svg` - Settings
- `profile.svg` - User profile

### Action Icons
- `draw.svg` - Draw tile action
- `discard.svg` - Discard action
- `claim.svg` - Claim tile action

## Using Material Icons

Flutter includes Material Icons. Use them like this:

```dart
Icon(Icons.home)
Icon(Icons.play_arrow)
Icon(Icons.settings)
```

Browse available icons at: https://fonts.google.com/icons

## Custom Icon Guidelines

- Format: SVG preferred
- Size: 24x24 base size
- Color: Single color (will be tinted in app)
- Style: Rounded corners, consistent stroke width
