# Firebase Setup Instructions

## Prerequisites
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Enable Analytics (optional)
5. Enable Crashlytics (optional)

## Android Setup

1. Register your Android app in Firebase Console:
   - Package name: `com.mahjonglearning.app`
   - Download `google-services.json`

2. Place `google-services.json` in `android/app/` directory

3. The `build.gradle` files are already configured to use Firebase

## iOS Setup

1. Register your iOS app in Firebase Console:
   - Bundle ID: `com.mahjonglearning.app`
   - Download `GoogleService-Info.plist`

2. Place `GoogleService-Info.plist` in `ios/` directory

3. React Native Firebase packages are already configured in `package.json`

## Firestore Database Structure

The app expects the following Firestore collections:

### users
```
users/{userId}
  - uid: string
  - email: string
  - displayName: string (optional)
  - photoUrl: string (optional)
  - createdAt: timestamp
  - lastLoginAt: timestamp
  - isPremium: boolean
```

### progress
```
progress/{userId}
  - userId: string
  - variant: string
  - levelProgress: map<level, LevelProgress>
  - totalTimeSpent: number (seconds)
  - gamesPlayed: number
  - gamesWon: number
  - quizzesCompleted: number
  - achievements: array<string>
  - createdAt: timestamp
  - lastUpdated: timestamp
```

### learning_content
```
learning_content/{contentId}
  - id: string
  - title: string
  - description: string
  - type: string (lesson/quiz/scenario/video/infographic)
  - level: string (level1-level6)
  - difficulty: string (beginner/intermediate/advanced)
  - variant: string
  - content: map
  - tags: array<string>
  - estimatedMinutes: number
  - thumbnailUrl: string (optional)
  - videoUrl: string (optional)
  - translations: map<string, string> (optional)
  - order: number
  - createdAt: timestamp
  - updatedAt: timestamp
```

### games
```
games/{gameId}
  - id: string
  - variant: string
  - phase: string
  - players: array<Player>
  - currentPlayerIndex: number
  - wall: array<Tile>
  - discardPile: array<Tile>
  - lastDrawnTile: Tile (optional)
  - lastDiscardedTile: Tile (optional)
  - lastAction: string (optional)
  - winnerId: string (optional)
  - finalScores: map<string, number>
  - createdAt: timestamp
  - finishedAt: timestamp (optional)
  - turnHistory: array<GameTurn>
```

## Security Rules

**⚠️ IMPORTANT: Copy ONLY the code below (without the markdown formatting)**

Go to Firebase Console > Firestore Database > Rules tab, and paste ONLY this code:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own progress
    match /progress/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // All authenticated users can read learning content
    match /learning_content/{contentId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins via console
    }
    
    // Users can read/write their own games
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.data.players[0].id == request.auth.uid;
    }
  }
}
```

**Or copy from the `firestore.rules` file created in your project root.**

## Authentication Setup

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable Email/Password provider
3. Optionally enable other providers (Google, Apple, etc.)

## Next Steps

After setting up Firebase:
1. Replace placeholder values in configuration files
2. Run `npm install`
3. For iOS: Run `cd ios && pod install && cd ..`
4. Test authentication flow

