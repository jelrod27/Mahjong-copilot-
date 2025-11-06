import 'package:firebase_auth/firebase_auth.dart';

class UserProfile {
  final String uid;
  final String email;
  final String? displayName;
  final String? photoUrl;
  final DateTime createdAt;
  final DateTime lastLoginAt;
  final bool isPremium;

  const UserProfile({
    required this.uid,
    required this.email,
    this.displayName,
    this.photoUrl,
    this.createdAt = const DateTime(2024, 1, 1),
    this.lastLoginAt = const DateTime(2024, 1, 1),
    this.isPremium = false,
  });

  factory UserProfile.fromFirebaseUser(User user) {
    return UserProfile(
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName,
      photoUrl: user.photoURL,
      createdAt: user.metadata.creationTime ?? DateTime.now(),
      lastLoginAt: user.metadata.lastSignInTime ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'photoUrl': photoUrl,
        'createdAt': createdAt.toIso8601String(),
        'lastLoginAt': lastLoginAt.toIso8601String(),
        'isPremium': isPremium,
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        uid: json['uid'] as String,
        email: json['email'] as String,
        displayName: json['displayName'] as String?,
        photoUrl: json['photoUrl'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        lastLoginAt: DateTime.parse(json['lastLoginAt'] as String),
        isPremium: json['isPremium'] as bool? ?? false,
      );
}

