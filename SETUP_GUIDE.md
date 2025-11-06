# Step-by-Step Setup Guide

## 1. Firebase Project Setup

### Step 1.1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Click "Add project" or "Create a project"

2. **Project Configuration**
   - Project name: `mahjong-learning-app` (or your preferred name)
   - Accept Google Analytics (recommended)
   - Click "Create project"
   - Wait for project creation to complete

3. **Add Android App**
   - Click the Android icon (or "Add app" > Android)
   - Android package name: `com.mahjonglearning.app`
   - Register app nickname: `Mahjong Learning Android`
   - Click "Register app"
   - Download `google-services.json`
   - **IMPORTANT**: Place this file in `android/app/` directory
   - Click "Next" through the remaining steps

4. **Add iOS App**
   - Click the iOS icon (or "Add app" > iOS)
   - iOS bundle ID: `com.mahjonglearning.app`
   - Register app nickname: `Mahjong Learning iOS`
   - Click "Register app"
   - Download `GoogleService-Info.plist`
   - **IMPORTANT**: Place this file in `ios/Runner/` directory
   - Click "Next" through the remaining steps

### Step 1.2: Enable Firebase Services

1. **Enable Authentication**
   - Go to Authentication > Sign-in method
   - Click "Email/Password"
   - Enable "Email/Password" toggle
   - Click "Save"
   - (Optional) Enable other providers: Google, Apple, etc.

2. **Create Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Select "Start in test mode" (we'll add security rules later)
   - Choose location closest to your users
   - Click "Enable"

3. **Set Up Security Rules**
   - In Firestore Database, click "Rules" tab
   - Replace with the rules from `FIREBASE_SETUP.md`:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /progress/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /learning_content/{contentId} {
         allow read: if request.auth != null;
         allow write: if false;
       }
       match /games/{gameId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           request.resource.data.players[0].id == request.auth.uid;
       }
     }
   }
   ```
   - Click "Publish"

4. **Enable Analytics (Optional)**
   - Go to Analytics Dashboard
   - Follow setup wizard if prompted

5. **Enable Crashlytics (Optional)**
   - Go to Crashlytics
   - Follow setup wizard

### Step 1.3: Configure Flutter Firebase Options

1. **Install FlutterFire CLI (if not installed)**
   ```bash
   dart pub global activate flutterfire_cli
   ```

2. **Configure Firebase Options**
   ```bash
   flutterfire configure
   ```
   - Select your Firebase project
   - Select platforms: Android, iOS
   - This will automatically update `firebase_options.dart`

3. **Manual Configuration (Alternative)**
   - Open `lib/core/config/firebase_options.dart`
   - Replace `YOUR_API_KEY`, `YOUR_APP_ID`, etc. with values from:
     - Android: `google-services.json`
     - iOS: `GoogleService-Info.plist`

### Step 1.4: Verify Configuration

1. **Check Files Are in Place**
   - `android/app/google-services.json` exists
   - `ios/Runner/GoogleService-Info.plist` exists
   - `lib/core/config/firebase_options.dart` has real values

2. **Test Firebase Connection**
   ```bash
   flutter run
   ```
   - Try signing up with email/password
   - Check Firebase Console > Authentication for new user

---

## 2. Create Tile SVG Assets

### Step 2.1: Understand Tile Structure

You need **144 tiles total**:
- **108 Suit tiles**: 9 tiles × 3 suits × 4 copies = 108
  - Bamboo (索子): 1-9
  - Characters (萬子): 1-9  
  - Dots (筒子): 1-9
- **28 Honor tiles**: 7 types × 4 copies = 28
  - Winds: East, South, West, North
  - Dragons: Red (中), Green (發), White (白)
- **8 Bonus tiles**: 8 unique tiles
  - Flowers: Plum, Orchid, Chrysanthemum, Bamboo
  - Seasons: Spring, Summer, Autumn, Winter

### Step 2.2: Design Guidelines

**Tile Dimensions**: 60x90px (portrait) or 90x60px (landscape)
**Style**: Traditional mahjong aesthetic, clear and readable
**Colors**: 
- Background: Warm ivory (#FFF8E1)
- Border: Dark gray (#424242), 2px
- Suit indicators: Color-coded (green/red/blue)

### Step 2.3: Create SVG Files

**Option A: Use Design Software**
1. Use Figma, Illustrator, or Inkscape
2. Create template tile (60x90px)
3. Design each tile following naming convention:
   - `bamboo_1.svg` through `bamboo_9.svg`
   - `character_1.svg` through `character_9.svg`
   - `dot_1.svg` through `dot_9.svg`
   - `wind_east.svg`, `wind_south.svg`, `wind_west.svg`, `wind_north.svg`
   - `dragon_red.svg`, `dragon_green.svg`, `dragon_white.svg`
   - `flower_1.svg` through `flower_4.svg`
   - `season_1.svg` through `season_4.svg`

**Option B: Use Online Resources**
1. Find mahjong tile images online (ensure copyright compliance)
2. Convert to SVG using tools like:
   - https://convertio.co/png-svg/
   - https://cloudconvert.com/png-to-svg

**Option C: Generate Programmatically**
1. Use Python/JavaScript to generate SVG files
2. Reference existing mahjong tile designs for symbols

### Step 2.4: Place Files

1. Save all SVG files to `assets/tiles/` directory
2. Verify naming matches code expectations:
   - Check `lib/models/tile.dart` for expected paths
   - Pattern: `assets/tiles/{suit}_{number}.svg`

### Step 2.5: Test Tile Display

```bash
flutter run
```
- Navigate to Tile Recognition screen
- Verify all tiles display correctly
- Check different categories (bamboo, characters, dots, etc.)

---

## 3. Add App Icons, Splash Screen, and Sound Effects

### Step 3.1: App Icons

1. **Create App Icon**
   - Design: 1024x1024px image
   - Style: Mahjong-themed, recognizable
   - Tools: Figma, Canva, or design software

2. **Generate Icons for Android**
   ```bash
   # Install flutter_launcher_icons package
   flutter pub add --dev flutter_launcher_icons
   ```
   
   Create `flutter_launcher_icons.yaml`:
   ```yaml
   flutter_launcher_icons:
     android: true
     ios: true
     image_path: "assets/images/icon.png"
     adaptive_icon_background: "#2D5016"
     adaptive_icon_foreground: "assets/images/icon_foreground.png"
   ```
   
   Run:
   ```bash
   flutter pub run flutter_launcher_icons
   ```

3. **Manual iOS Icon Setup**
   - Open `ios/Runner/Assets.xcassets/AppIcon.appiconset/`
   - Place icon files in required sizes:
     - 1024x1024 (App Store)
     - 180x180 (iPhone)
     - 120x120 (iPhone)
     - 76x76 (iPad)
     - 152x152 (iPad)

### Step 3.2: Splash Screen

1. **Install Package**
   ```bash
   flutter pub add flutter_native_splash
   flutter pub add --dev flutter_native_splash
   ```

2. **Create Configuration**
   Create `flutter_native_splash.yaml`:
   ```yaml
   flutter_native_splash:
     color: "#2D5016"
     image: assets/images/splash.png
     android: true
     ios: true
     android_12: true
   ```

3. **Generate Splash Screen**
   ```bash
   flutter pub run flutter_native_splash:create
   ```

4. **Create Splash Image**
   - Design: 1080x1920px (portrait)
   - Include app logo/name
   - Save as `assets/images/splash.png`

### Step 3.3: Sound Effects

1. **Required Sound Files**
   - `tile_click.mp3` - Tile selection sound
   - `tile_shuffle.mp3` - Shuffling tiles
   - `win.mp3` - Winning game
   - `lose.mp3` - Losing game
   - `discard.mp3` - Discarding tile

2. **Create/Find Sounds**
   - **Option A**: Record your own sounds
   - **Option B**: Use royalty-free sound libraries:
     - https://freesound.org/
     - https://mixkit.co/free-sound-effects/
   - **Option C**: Use text-to-speech or sound generators

3. **Format Requirements**
   - Format: MP3 or WAV
   - Duration: 0.5-2 seconds each
   - Quality: 44.1kHz, 16-bit minimum

4. **Place Files**
   - Save all sounds to `assets/sounds/` directory
   - Update `pubspec.yaml` if needed (already included)

5. **Implement Sound Player**
   ```dart
   // Add to pubspec.yaml:
   dependencies:
     audioplayers: ^5.2.1
   
   // Create lib/core/services/sound_service.dart:
   import 'package:audioplayers/audioplayers.dart';
   
   class SoundService {
     static final AudioPlayer _player = AudioPlayer();
     
     static Future<void> playTileClick() async {
       await _player.play(AssetSource('sounds/tile_click.mp3'));
     }
     
     static Future<void> playWin() async {
       await _player.play(AssetSource('sounds/win.mp3'));
     }
     // ... add other sounds
   }
   ```

---

## 4. Populate Learning Content

### Step 4.1: Understand Content Structure

Content is stored in Firestore `learning_content` collection. Each document needs:
- `id`: Unique identifier
- `title`: Lesson title
- `description`: Brief description
- `type`: lesson/quiz/scenario/video/infographic
- `level`: level1-level6
- `difficulty`: beginner/intermediate/advanced
- `variant`: Mahjong variant (e.g., "Hong Kong Mahjong")
- `content`: Flexible structure with lesson data
- `tags`: Array of tags
- `order`: Display order within level

### Step 4.2: Create Content for Level 1 (Basic Tile Identification)

**Lesson 1: Suits Overview**
```json
{
  "id": "level1_lesson1",
  "title": "Understanding the Three Suits",
  "description": "Learn about Bamboo, Characters, and Dots",
  "type": "lesson",
  "level": "level1",
  "difficulty": "beginner",
  "variant": "Hong Kong Mahjong",
  "content": {
    "sections": [
      {
        "title": "Bamboo Suit (索子)",
        "text": "The bamboo suit represents...",
        "images": ["bamboo_example.png"]
      },
      {
        "title": "Character Suit (萬子)",
        "text": "The character suit represents...",
        "images": ["character_example.png"]
      },
      {
        "title": "Dot Suit (筒子)",
        "text": "The dot suit represents...",
        "images": ["dot_example.png"]
      }
    ]
  },
  "tags": ["suits", "basics"],
  "order": 1
}
```

**Quiz 1: Tile Identification**
```json
{
  "id": "level1_quiz1",
  "title": "Identify the Tiles",
  "description": "Test your knowledge of tile identification",
  "type": "quiz",
  "level": "level1",
  "difficulty": "beginner",
  "variant": "Hong Kong Mahjong",
  "content": {
    "questions": [
      {
        "id": "q1",
        "question": "What is this tile?",
        "image": "tile_bamboo_1.png",
        "options": ["One Bamboo", "One Character", "One Dot", "East Wind"],
        "correctAnswer": 0,
        "explanation": "This is One Bamboo (一索)"
      }
      // ... more questions
    ]
  },
  "tags": ["quiz", "identification"],
  "order": 2
}
```

### Step 4.3: Create Content for Level 2 (Suits and Sets)

**Lesson 1: Chow (Chi)**
```json
{
  "id": "level2_lesson1",
  "title": "Understanding Chow (Sequence)",
  "description": "Learn how to form sequences of three consecutive tiles",
  "type": "lesson",
  "level": "level2",
  "difficulty": "beginner",
  "variant": "Hong Kong Mahjong",
  "content": {
    "sections": [
      {
        "title": "What is a Chow?",
        "text": "A chow is a sequence of three consecutive tiles of the same suit...",
        "examples": [
          {
            "tiles": ["bamboo_1", "bamboo_2", "bamboo_3"],
            "description": "Valid chow: 1-2-3 Bamboo"
          }
        ]
      }
    ]
  },
  "tags": ["chow", "sequences"],
  "order": 1
}
```

### Step 4.4: Add Content to Firestore

**Option A: Firebase Console**
1. Go to Firestore Database
2. Click "learning_content" collection
3. Click "Add document"
4. Paste JSON content
5. Repeat for all content

**Option B: Script (Recommended)**
Create `scripts/populate_content.dart`:
```dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import '../lib/core/config/firebase_options.dart';

void main() async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  final firestore = FirebaseFirestore.instance;
  
  // Add your content documents here
  await firestore.collection('learning_content').doc('level1_lesson1').set({
    // ... content JSON
  });
  
  print('Content populated!');
}
```

Run:
```bash
dart scripts/populate_content.dart
```

### Step 4.5: Content Checklist

- [ ] Level 1: 5-10 lessons + 3-5 quizzes
- [ ] Level 2: 5-10 lessons + 3-5 quizzes
- [ ] Level 3: 5-10 lessons + 3-5 quizzes
- [ ] Level 4: Scoring lessons and examples
- [ ] Level 5: Advanced scoring scenarios
- [ ] Level 6: Strategy guides

---

## 5. Test and Refine Implementation

### Step 5.1: Setup Testing Environment

1. **Install Flutter SDK**
   ```bash
   # Verify installation
   flutter doctor
   ```

2. **Connect Physical Device or Emulator**
   - Android: Enable USB debugging, connect device
   - iOS: Connect iPhone/iPad (requires Apple Developer account)
   - Or use emulator/simulator

### Step 5.2: Run Initial Tests

```bash
# Get dependencies
flutter pub get

# Run app
flutter run

# Or run on specific device
flutter devices  # List available devices
flutter run -d <device_id>
```

### Step 5.3: Test Each Feature

**Authentication Flow:**
- [ ] Sign up with email/password
- [ ] Sign in with existing account
- [ ] Sign out
- [ ] Profile display

**Tile Recognition:**
- [ ] View all tile categories
- [ ] Flip tiles (flashcard mode)
- [ ] Navigate between tiles
- [ ] Complete quiz mode
- [ ] Verify quiz scoring

**Learning Path:**
- [ ] Navigate through levels
- [ ] Complete lessons
- [ ] Track progress
- [ ] Verify progress persistence

**Practice Mode:**
- [ ] Start new game
- [ ] Select AI difficulty
- [ ] Draw tiles
- [ ] Discard tiles
- [ ] Complete game
- [ ] Verify game state saves

**Progress Tracking:**
- [ ] View overall progress
- [ ] Check level progress
- [ ] View statistics
- [ ] Verify Firestore sync

**Settings:**
- [ ] Change mahjong variant
- [ ] Switch language
- [ ] Toggle dark mode
- [ ] Enable/disable sounds

### Step 5.4: Debug Common Issues

**Firebase Connection Issues:**
```bash
# Check Firebase configuration
flutter doctor -v

# Verify google-services.json is in android/app/
# Verify GoogleService-Info.plist is in ios/Runner/
```

**Build Errors:**
```bash
# Clean build
flutter clean
flutter pub get

# For Android
cd android
./gradlew clean
cd ..

# For iOS
cd ios
pod deintegrate
pod install
cd ..
```

**Runtime Errors:**
- Check console logs
- Enable debug mode
- Check Firebase Console for errors
- Verify Firestore rules

### Step 5.5: Performance Testing

1. **Check App Size**
   ```bash
   flutter build apk --analyze-size  # Android
   flutter build ios --analyze-size  # iOS
   ```

2. **Test Offline Functionality**
   - Airplane mode
   - Verify local storage works
   - Check sync when back online

3. **Memory Usage**
   - Monitor with Flutter DevTools
   - Check for memory leaks
   - Optimize tile rendering if needed

### Step 5.6: UI/UX Refinement

1. **Test on Different Screen Sizes**
   - Small phones (< 5")
   - Large phones (> 6")
   - Tablets

2. **Test Orientations**
   - Portrait mode
   - Landscape mode

3. **Accessibility**
   - Enable screen reader
   - Test color contrast
   - Test font scaling

4. **User Feedback**
   - Get beta testers
   - Collect feedback
   - Iterate on improvements

### Step 5.7: Preparation for Release

1. **Version Numbering**
   - Update `pubspec.yaml` version
   - Follow semantic versioning (major.minor.patch)

2. **App Signing**
   - Android: Generate keystore
   - iOS: Configure signing certificates

3. **Build Release Versions**
   ```bash
   # Android
   flutter build appbundle
   
   # iOS
   flutter build ios --release
   ```

4. **Test Release Builds**
   - Install on test devices
   - Verify all features work
   - Test performance

5. **App Store Preparation**
   - Screenshots (required sizes)
   - App description
   - Privacy policy
   - Terms of service

---

## Quick Reference Commands

```bash
# Setup
flutter pub get
flutterfire configure

# Development
flutter run
flutter run --release

# Building
flutter build apk           # Android APK
flutter build appbundle     # Android Bundle
flutter build ios           # iOS

# Testing
flutter test
flutter analyze

# Cleanup
flutter clean
```

---

## Troubleshooting

**Firebase not connecting:**
- Verify configuration files are in correct locations
- Check API keys are correct
- Verify internet connection
- Check Firestore rules allow access

**Tiles not displaying:**
- Verify SVG files are in `assets/tiles/`
- Check file names match code expectations
- Verify `pubspec.yaml` includes assets
- Run `flutter pub get` again

**Build errors:**
- Run `flutter clean`
- Delete `pubspec.lock`
- Run `flutter pub get`
- Check Flutter version compatibility

**App crashes:**
- Check Flutter console for errors
- Enable debug mode
- Check Firebase Console for errors
- Verify all dependencies are installed

---

Good luck with your Mahjong Learning App! 🀄

