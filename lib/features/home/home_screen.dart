import 'package:flutter/material.dart';
import '../../shared/theme/app_theme.dart';
import '../../shared/theme/colors.dart';
import '../../shared/widgets/retro_button.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.cream, AppColors.offWhite],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppTheme.spacingLg),
            child: Column(
              children: [
                const SizedBox(height: AppTheme.spacingXl * 2),
                // Logo/Title
                _buildTitle(),
                const SizedBox(height: AppTheme.spacingXl),
                // Decorative tile display
                _buildTileDecoration(),
                const Spacer(),
                // Main menu buttons
                _buildMenuButtons(context),
                const SizedBox(height: AppTheme.spacingXl),
                // Footer
                _buildFooter(),
                const SizedBox(height: AppTheme.spacingLg),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTitle() {
    return Column(
      children: [
        Text(
          'HONG KONG',
          style: AppTheme.headingLarge.copyWith(
            color: AppColors.primary,
            fontSize: 28,
            letterSpacing: 4,
          ),
        ),
        const SizedBox(height: AppTheme.spacingXs),
        Text(
          'MAHJONG',
          style: AppTheme.headingLarge.copyWith(
            color: AppColors.warmBrown,
            fontSize: 48,
            letterSpacing: 2,
          ),
        ),
        const SizedBox(height: AppTheme.spacingSm),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppTheme.spacingMd,
            vertical: AppTheme.spacingXs,
          ),
          decoration: BoxDecoration(
            color: AppColors.secondary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
            border: Border.all(color: AppColors.secondary, width: 2),
          ),
          child: Text(
            '麻雀',
            style: AppTheme.headingMedium.copyWith(
              color: AppColors.secondary,
              fontSize: 20,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTileDecoration() {
    // Decorative row of mahjong tiles
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildDecorativeTile('中', AppColors.characterRed),
        const SizedBox(width: AppTheme.spacingSm),
        _buildDecorativeTile('發', AppColors.bambooGreen),
        const SizedBox(width: AppTheme.spacingSm),
        _buildDecorativeTile('白', AppColors.dotBlue),
      ],
    );
  }

  Widget _buildDecorativeTile(String text, Color color) {
    return Container(
      width: 60,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.tileBackground,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border.all(color: AppColors.tileBorder, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 4,
            offset: const Offset(2, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          text,
          style: TextStyle(
            fontSize: 36,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ),
    );
  }

  Widget _buildMenuButtons(BuildContext context) {
    return Column(
      children: [
        RetroButton(
          text: 'PLAY SOLO',
          icon: Icons.person,
          onPressed: () {
            // TODO: Navigate to single player game
            _showComingSoon(context, 'Single Player');
          },
        ),
        const SizedBox(height: AppTheme.spacingMd),
        RetroButton(
          text: 'MULTIPLAYER',
          icon: Icons.people,
          variant: RetroButtonVariant.secondary,
          onPressed: () {
            // TODO: Navigate to lobby
            _showComingSoon(context, 'Multiplayer');
          },
        ),
        const SizedBox(height: AppTheme.spacingMd),
        RetroButton(
          text: 'LEARN TO PLAY',
          icon: Icons.school,
          variant: RetroButtonVariant.outline,
          onPressed: () {
            // TODO: Navigate to tutorial
            _showComingSoon(context, 'Tutorial');
          },
        ),
        const SizedBox(height: AppTheme.spacingMd),
        Row(
          children: [
            Expanded(
              child: RetroButton(
                text: 'PROFILE',
                icon: Icons.account_circle,
                variant: RetroButtonVariant.text,
                onPressed: () {
                  _showComingSoon(context, 'Profile');
                },
              ),
            ),
            const SizedBox(width: AppTheme.spacingMd),
            Expanded(
              child: RetroButton(
                text: 'SETTINGS',
                icon: Icons.settings,
                variant: RetroButtonVariant.text,
                onPressed: () {
                  _showComingSoon(context, 'Settings');
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Text(
      'v1.0.0 • Made with ♥',
      style: AppTheme.bodySmall.copyWith(
        color: AppColors.textDark.withOpacity(0.5),
      ),
    );
  }

  void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature coming soon!'),
        backgroundColor: AppColors.warmBrown,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        ),
      ),
    );
  }
}
