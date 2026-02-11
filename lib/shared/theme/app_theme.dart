import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

/// 70s Retro-Modern theme configuration
class AppTheme {
  AppTheme._();

  // Border radius constants - everything rounded
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 16.0;
  static const double radiusLarge = 24.0;
  static const double radiusXLarge = 32.0;

  // Spacing constants
  static const double spacingXs = 4.0;
  static const double spacingSm = 8.0;
  static const double spacingMd = 16.0;
  static const double spacingLg = 24.0;
  static const double spacingXl = 32.0;

  // Elevation constants
  static const double elevationLow = 2.0;
  static const double elevationMedium = 4.0;
  static const double elevationHigh = 8.0;

  // Text styles with retro fonts
  static TextStyle get headingLarge => GoogleFonts.righteous(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: AppColors.textDark,
        letterSpacing: 1.2,
      );

  static TextStyle get headingMedium => GoogleFonts.righteous(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: AppColors.textDark,
      );

  static TextStyle get headingSmall => GoogleFonts.fredokaOne(
        fontSize: 20,
        color: AppColors.textDark,
      );

  static TextStyle get bodyLarge => GoogleFonts.nunito(
        fontSize: 18,
        color: AppColors.textDark,
      );

  static TextStyle get bodyMedium => GoogleFonts.nunito(
        fontSize: 16,
        color: AppColors.textDark,
      );

  static TextStyle get bodySmall => GoogleFonts.nunito(
        fontSize: 14,
        color: AppColors.textDark,
      );

  static TextStyle get labelLarge => GoogleFonts.nunito(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.textDark,
      );

  static TextStyle get buttonText => GoogleFonts.fredokaOne(
        fontSize: 18,
        color: AppColors.textLight,
        letterSpacing: 0.5,
      );

  // Box decorations
  static BoxDecoration get cardDecoration => BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(radiusMedium),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      );

  static BoxDecoration get elevatedCardDecoration => BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(radiusLarge),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowDark,
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      );

  // Main theme data
  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          tertiary: AppColors.accent,
          surface: AppColors.surface,
          background: AppColors.background,
          error: AppColors.error,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textLight,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: headingSmall.copyWith(color: AppColors.textLight),
        ),
        cardTheme: CardTheme(
          color: AppColors.surface,
          elevation: elevationMedium,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.textLight,
            elevation: elevationMedium,
            padding: const EdgeInsets.symmetric(
              horizontal: spacingLg,
              vertical: spacingMd,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusLarge),
            ),
            textStyle: buttonText,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: const BorderSide(color: AppColors.primary, width: 2),
            padding: const EdgeInsets.symmetric(
              horizontal: spacingLg,
              vertical: spacingMd,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(radiusLarge),
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(
              horizontal: spacingMd,
              vertical: spacingSm,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            borderSide: BorderSide(color: AppColors.tileBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            borderSide: BorderSide(color: AppColors.tileBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            borderSide: BorderSide(color: AppColors.primary, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: spacingMd,
            vertical: spacingMd,
          ),
        ),
        floatingActionButtonTheme: FloatingActionButtonThemeData(
          backgroundColor: AppColors.secondary,
          foregroundColor: AppColors.textLight,
          elevation: elevationHigh,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusLarge),
          ),
        ),
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textDark.withOpacity(0.5),
          type: BottomNavigationBarType.fixed,
          elevation: elevationHigh,
        ),
        dialogTheme: DialogTheme(
          backgroundColor: AppColors.surface,
          elevation: elevationHigh,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusLarge),
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.warmBrown,
          contentTextStyle: bodyMedium.copyWith(color: AppColors.textLight),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          behavior: SnackBarBehavior.floating,
        ),
        dividerTheme: DividerThemeData(
          color: AppColors.tileBorder,
          thickness: 1,
          space: spacingMd,
        ),
      );
}
