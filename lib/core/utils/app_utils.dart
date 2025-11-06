class AppUtils {
  // Format score display
  static String formatScore(int score) {
    if (score >= 10000) {
      return '${(score / 10000).toStringAsFixed(1)}萬';
    }
    return score.toString();
  }

  // Format time duration
  static String formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours}h ${minutes}m ${seconds}s';
    } else if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    } else {
      return '${seconds}s';
    }
  }

  // Calculate learning progress percentage
  static double calculateProgress(int completed, int total) {
    if (total == 0) return 0.0;
    return (completed / total).clamp(0.0, 1.0);
  }

  // Validate email format
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  // Get tile category display name
  static String getTileCategoryName(String category) {
    switch (category) {
      case 'bamboo':
        return 'Bamboo (索子)';
      case 'character':
        return 'Characters (萬子)';
      case 'dot':
        return 'Dots (筒子)';
      case 'wind':
        return 'Winds (東南西北)';
      case 'dragon':
        return 'Dragons (中發白)';
      case 'flower':
        return 'Flowers';
      case 'season':
        return 'Seasons';
      default:
        return category;
    }
  }
}

