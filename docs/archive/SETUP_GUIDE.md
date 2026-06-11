## Quick Reference Commands

```bash
# Setup
npm install
npx @react-native-firebase/cli init

# Development
npm start
npm run android
npm run ios

# Building
cd android && ./gradlew assembleRelease  # Android APK
cd android && ./gradlew bundleRelease    # Android Bundle
# iOS: Build in Xcode

# Testing
npm test
npm run lint

# Cleanup
npm start -- --reset-cache
cd android && ./gradlew clean && cd ..
cd ios && pod deintegrate && pod install && cd ..
```

## Troubleshooting

**Firebase not connecting:**
- Verify configuration files are in correct locations
- Check API keys are correct
- Verify internet connection
- Check Firestore rules allow access

**Tiles not displaying:**
- Verify SVG files are in `assets/tiles/`
- Check file names match code expectations
- Verify assets are properly linked
- Run `npm start -- --reset-cache` again

**Build errors:**
- Run `npm start -- --reset-cache`
- Delete `node_modules` and `package-lock.json`
- Run `npm install`
- Check Node.js version compatibility

**App crashes:**
- Check Metro bundler console for errors
- Enable debug mode
- Check Firebase Console for errors
- Verify all dependencies are installed
- Check React Native compatibility

---

Good luck with your Mahjong Learning App! 🀄
