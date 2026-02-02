# Mahjong Learning App - Testing Guide

## Prerequisites

Before testing, you need:

### Required Software
- **Node.js 18+** (check: `node --version`)
- **Xcode** (for iOS testing) - Install from Mac App Store
- **Android Studio** (for Android testing) - Download from developer.android.com
- **React Native CLI** - Install with: `npm install -g react-native-cli`

### Check Your Setup
```bash
# Verify Node version
node --version

# Verify React Native
npx react-native --version

# Verify Xcode (Mac only)
xcode-select --version

# Verify Android Studio
# (Open Android Studio → About)
```

---

## Step 1: Clone & Setup (5 minutes)

```bash
# Clone the repo
git clone https://github.com/deephouse23/Mahjong-copilot-.git
cd Mahjong-copilot-

# Install dependencies
npm install

# iOS only: Install CocoaPods
cd ios && pod install && cd ..
```

**Expected result:** No errors, `node_modules/` folder created

---

## Step 2: Start Metro Bundler (1 minute)

```bash
# In project root
npm start
```

**Expected result:** Metro bundler starts, shows QR code and options

**Leave this running** in a separate terminal window.

---

## Step 3: Test on iOS Simulator (5 minutes)

### Option A: Via Command Line
```bash
# Make sure Metro is running (from Step 2)
npm run ios
```

### Option B: Via Xcode
1. Open `ios/MahjongLearningApp.xcworkspace` in Xcode
2. Select iPhone simulator (e.g., iPhone 15 Pro)
3. Click play button (▶)

**Expected result:**
- Simulator opens
- App builds (takes 2-3 minutes first time)
- App launches showing home screen
- You see "Mahjong Learning App" with level list

---

## Step 4: Test on Android Emulator (5 minutes)

### Setup Android Emulator (One-time)
1. Open Android Studio
2. Tools → Device Manager
3. Create Device → Pick Pixel 6 → Download Android 14 image
4. Start the emulator

### Run the App
```bash
# Make sure Metro is running
npm run android
```

**Expected result:**
- Emulator opens
- App installs and launches
- Home screen appears

---

## Step 5: Testing Checklist

### Level 1: Know Your Tiles
- [ ] Open Level 1 → Lesson 1
- [ ] Scroll through content
- [ ] View tile displays
- [ ] Take quiz at end
- [ ] Verify progress saves

### Level 2: Sets & Basic Hands
- [ ] Open Level 2 → Lesson 2-6 (Set Builder)
- [ ] Tap "Try Set Builder 🧩"
- [ ] Select tiles to form a Pung (3 identical)
- [ ] Click "Check Set" → Should show ✓ Valid Pung!
- [ ] Try invalid combination → Should show error
- [ ] Reset and try Chow (3 consecutive)

### SetBuilder Interactive
- [ ] Select 3 identical tiles → Check = Valid Pung
- [ ] Select 3 consecutive suit tiles → Check = Valid Chow
- [ ] Select 4 identical tiles → Check = Valid Kong
- [ ] Select 2 identical tiles → Check = Valid Pair
- [ ] Select random mismatched tiles → Check = Invalid

### Navigation
- [ ] Go back from lesson → Returns to level list
- [ ] Complete quiz → Shows score
- [ ] Check progress screen → Shows completed lessons

### Content Verification
- [ ] Level 1: 8 lessons visible
- [ ] Level 2: 8 lessons visible
- [ ] Level 3: 8 lessons visible
- [ ] Level 5: 8 lessons visible
- [ ] Level 6: 8 lessons visible

---

## Step 6: Common Issues & Fixes

### Issue: `npm install` fails
**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: iOS build fails
**Fix:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Issue: Android emulator not found
**Fix:**
1. Make sure emulator is running in Android Studio
2. Check: `adb devices` (should show emulator)
3. Try: `npm run android -- --deviceId=<emulator-id>`

### Issue: Metro bundler won't start
**Fix:**
```bash
# Kill any running Metro processes
killall node

# Clear cache
npm start -- --reset-cache
```

### Issue: App crashes on launch
**Fix:**
```bash
# iOS
cd ios
rm -rf build/
cd ..
npm run ios

# Android
npm run android -- --clean
```

---

## Quick Test Commands

```bash
# Full clean and rebuild (iOS)
rm -rf node_modules ios/build ios/Pods
npm install
cd ios && pod install && cd ..
npm run ios

# Full clean and rebuild (Android)
rm -rf node_modules android/build android/app/build
npm install
npm run android
```

---

## Testing Priority

1. **Must Test:** Level 1 Lesson 1 (basic content display)
2. **Must Test:** Level 2 Lesson 6 (SetBuilder interactive)
3. **Should Test:** One lesson from each level (3, 5, 6)
4. **Nice to Test:** Complete Level 1 all lessons

---

## Success Criteria

✅ App launches without crashes
✅ All 5 levels visible in home screen
✅ Can open and read lesson content
✅ SetBuilder validates sets correctly
✅ Quiz shows results
✅ Progress tracking works

---

## Next Steps After Testing

1. **Practice Mode** - Build playable game screen
2. **Tile SVG Integration** - Replace text with actual tile images
3. **Firebase Sync** - Cloud save progress
4. **Sound Effects** - Add audio feedback
5. **App Store Prep** - Icons, splash screen, metadata

---

## Need Help?

If testing fails:
1. Check error message in terminal
2. Check Metro bundler output
3. Try the "Common Issues" fixes above
4. Report: Error message + what step you were on
