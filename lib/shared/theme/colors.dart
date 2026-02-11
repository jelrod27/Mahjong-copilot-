import 'package:flutter/material.dart';

/// 70s Retro-Modern color palette for Hong Kong Mahjong
class AppColors {
  AppColors._();

  // Primary palette
  static const Color burntOrange = Color(0xFFCC5500);
  static const Color avocadoGreen = Color(0xFF568203);
  static const Color mustardYellow = Color(0xFFFFDB58);
  static const Color cream = Color(0xFFFFFDD0);
  static const Color warmBrown = Color(0xFF8B4513);
  static const Color offWhite = Color(0xFFFAF8F5);

  // Semantic colors
  static const Color primary = burntOrange;
  static const Color secondary = avocadoGreen;
  static const Color accent = mustardYellow;
  static const Color background = cream;
  static const Color surface = offWhite;
  static const Color textDark = warmBrown;
  static const Color textLight = offWhite;

  // Tile suit colors
  static const Color bambooGreen = Color(0xFF2E8B57);
  static const Color characterRed = Color(0xFFB22222);
  static const Color dotBlue = Color(0xFF4169E1);
  static const Color honorPurple = Color(0xFF663399);
  static const Color bonusGold = Color(0xFFDAA520);

  // Game UI colors
  static const Color tileBackground = Color(0xFFFFFEF0);
  static const Color tileBorder = Color(0xFFD4C5A9);
  static const Color selectedTile = Color(0xFF90EE90);
  static const Color discardHighlight = Color(0xFFFFB347);

  // Status colors
  static const Color success = avocadoGreen;
  static const Color warning = mustardYellow;
  static const Color error = Color(0xFFCD5C5C);
  static const Color info = Color(0xFF6495ED);

  // Shadows and overlays
  static const Color shadowDark = Color(0x40000000);
  static const Color shadowLight = Color(0x20000000);
  static const Color overlay = Color(0x80000000);

  // Gradient for retro effects
  static const LinearGradient sunburstGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [mustardYellow, burntOrange],
  );

  static const LinearGradient retroButtonGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [burntOrange, Color(0xFFB34700)],
  );
}
