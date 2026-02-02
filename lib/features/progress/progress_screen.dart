import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_progress.dart';
import '../../providers/progress_provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/app_utils.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Progress'),
      ),
      body: Consumer<ProgressProvider>(
        builder: (context, progressProvider, _) {
          if (progressProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          final progress = progressProvider.progress;
          if (progress == null) {
            return const Center(
              child: Text('No progress data available'),
            );
          }

          return RefreshIndicator(
            onRefresh: () => progressProvider.syncProgress(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildOverallProgress(context, progress),
                const SizedBox(height: 24),
                _buildLevelProgress(context, progress),
                const SizedBox(height: 24),
                _buildStatistics(context, progress),
                const SizedBox(height: 24),
                _buildAchievements(context, progress),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildOverallProgress(BuildContext context, UserProgress progress) {
    final percentage = (progress.overallProgress * 100).round();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              'Overall Progress',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    value: progress.overallProgress,
                    strokeWidth: 12,
                    backgroundColor: Colors.grey[300],
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppTheme.primaryGreen,
                    ),
                  ),
                ),
                Text(
                  '$percentage%',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: AppTheme.primaryGreen,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              '${progress.completedLevels} of ${progress.levelProgress.length} levels completed',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLevelProgress(BuildContext context, UserProgress progress) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Learning Levels',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...progress.levelProgress.entries.map((entry) {
              final levelProgress = entry.value;
              final percentage = (levelProgress.progressPercentage * 100).round();

              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Level ${entry.key.index + 1}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (levelProgress.isCompleted)
                          const Icon(
                            Icons.check_circle,
                            color: AppTheme.successColor,
                            size: 20,
                          )
                        else
                          Text(
                            '$percentage%',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: levelProgress.progressPercentage,
                      backgroundColor: Colors.grey[300],
                      valueColor: AlwaysStoppedAnimation<Color>(
                        levelProgress.isCompleted
                            ? AppTheme.successColor
                            : AppTheme.primaryGreen,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${levelProgress.completedLessons} / ${levelProgress.totalLessons} lessons completed',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildStatistics(BuildContext context, UserProgress progress) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Statistics',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildStatRow(
              context,
              icon: Icons.access_time,
              label: 'Time Spent',
              value: AppUtils.formatDuration(
                Duration(seconds: progress.totalTimeSpent),
              ),
            ),
            _buildStatRow(
              context,
              icon: Icons.quiz,
              label: 'Quizzes Completed',
              value: progress.quizzesCompleted.toString(),
            ),
            _buildStatRow(
              context,
              icon: Icons.casino,
              label: 'Games Played',
              value: progress.gamesPlayed.toString(),
            ),
            _buildStatRow(
              context,
              icon: Icons.emoji_events,
              label: 'Games Won',
              value: progress.gamesWon.toString(),
            ),
            if (progress.gamesPlayed > 0)
              _buildStatRow(
                context,
                icon: Icons.trending_up,
                label: 'Win Rate',
                value:
                    '${((progress.gamesWon / progress.gamesPlayed) * 100).round()}%',
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primaryGreen),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildAchievements(BuildContext context, UserProgress progress) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Achievements',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            if (progress.achievements.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No achievements yet. Keep learning!'),
                ),
              )
            else
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: progress.achievements.map((achievementId) {
                  return _buildAchievementBadge(context, achievementId);
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAchievementBadge(BuildContext context, String achievementId) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.primaryGold.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.primaryGold),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.emoji_events,
            color: AppTheme.primaryGold,
            size: 24,
          ),
          const SizedBox(width: 8),
          Text(
            achievementId,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

