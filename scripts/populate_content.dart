import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import '../lib/core/config/firebase_options.dart';

/// Script to populate Firestore with learning content
/// Run with: dart scripts/populate_content.dart
/// 
/// Make sure Firebase is configured first!

Future<void> main() async {
  print('🚀 Initializing Firebase...');
  
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('✅ Firebase initialized');
  } catch (e) {
    print('❌ Firebase initialization failed: $e');
    print('💡 Make sure you have configured firebase_options.dart');
    return;
  }

  final firestore = FirebaseFirestore.instance;
  
  print('📚 Starting content population...');
  
  // Example: Level 1 Lesson 1
  await _addLevel1Content(firestore);
  
  print('✅ Content population complete!');
}

Future<void> _addLevel1Content(FirebaseFirestore firestore) async {
  // Lesson 1: Suits Overview
  await firestore.collection('learning_content').doc('level1_lesson1').set({
    'id': 'level1_lesson1',
    'title': 'Understanding the Three Suits',
    'description': 'Learn about Bamboo, Characters, and Dots - the three main suits in mahjong',
    'type': 'lesson',
    'level': 'level1',
    'difficulty': 'beginner',
    'variant': 'Hong Kong Mahjong',
    'content': {
      'sections': [
        {
          'title': 'Bamboo Suit (索子)',
          'text': 'The bamboo suit, also called "索子" (suǒzi), consists of tiles numbered 1 through 9. Each number has four identical tiles. The bamboo suit is often represented in green.',
          'images': [],
        },
        {
          'title': 'Character Suit (萬子)',
          'text': 'The character suit, also called "萬子" (wànzi), consists of tiles numbered 1 through 9. These tiles show Chinese characters representing numbers.',
          'images': [],
        },
        {
          'title': 'Dot Suit (筒子)',
          'text': 'The dot suit, also called "筒子" (tǒngzi), consists of tiles numbered 1 through 9. These tiles show circular dots arranged in patterns.',
          'images': [],
        },
      ],
    },
    'tags': ['suits', 'basics', 'level1'],
    'estimatedMinutes': 5,
    'order': 1,
    'createdAt': FieldValue.serverTimestamp(),
    'updatedAt': FieldValue.serverTimestamp(),
  });
  
  print('✅ Added Level 1 Lesson 1');
  
  // Add more content here...
  // Follow the same pattern for other lessons and quizzes
}

// Add more helper functions for other levels:
// Future<void> _addLevel2Content(FirebaseFirestore firestore) async { ... }
// Future<void> _addLevel3Content(FirebaseFirestore firestore) async { ... }

