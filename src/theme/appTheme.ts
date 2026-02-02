import {StyleSheet} from 'react-native';

export const AppColors = {
  // Mahjong-inspired color palette
  primaryGreen: '#2D5016', // Deep green felt
  primaryRed: '#B71C1C', // Traditional red
  primaryGold: '#D4AF37', // Gold accents
  tileBackground: '#FFF8E1', // Warm ivory
  tileBorder: '#424242', // Dark gray border
  backgroundColor: '#F5F5F5', // Light gray background
  textPrimary: '#212121',
  textSecondary: '#757575',
  errorColor: '#B71C1C',
  successColor: '#2E7D32',
  
  // Tile suit colors
  bambooColor: '#4CAF50',
  characterColor: '#B71C1C',
  dotColor: '#2196F3',
  honorColor: '#9E9E9E',
  
  // Dark mode colors
  darkBackground: '#121212',
  darkSurface: '#1E1E1E',
  darkTextPrimary: '#FFFFFF',
  darkTextSecondary: '#B0B0B0',
};

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const AppRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const AppTheme = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundColor,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    margin: AppSpacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    backgroundColor: AppColors.primaryGreen,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: AppColors.textSecondary,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    fontSize: 16,
  },
  textPrimary: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  textSecondary: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.textPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
});

export const DarkTheme = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.darkBackground,
  },
  card: {
    backgroundColor: AppColors.darkSurface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    margin: AppSpacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textPrimary: {
    fontSize: 16,
    color: AppColors.darkTextPrimary,
  },
  textSecondary: {
    fontSize: 14,
    color: AppColors.darkTextSecondary,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.darkTextPrimary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.darkTextPrimary,
  },
});

