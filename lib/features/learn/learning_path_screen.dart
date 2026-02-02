import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_progress.dart';
import '../../providers/progress_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/constants/app_constants.dart';
import 'tile_recognition_screen.dart';

class LearningPathScreen extends StatelessWidget {
  const LearningPathScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Learning Path'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: AppConstants.learningLevels.asMap().entries.map((entry) {
          final index = entry.key;
          final levelName = entry.value;
          final level = LearningLevel.values[index];
          
          return Consumer<ProgressProvider>(
            builder: (context, progressProvider, _) {
              final levelProgress = progressProvider.progress?.levelProgress[level];
              final isCompleted = levelProgress?.isCompleted ?? false;
              final progress = levelProgress?.progressPercentage ?? 0.0;
              
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: InkWell(
                  onTap: () {
                    _navigateToLevel(context, level);
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (isCompleted)
                              const Icon(
                                Icons.check_circle,
                                color: AppTheme.successColor,
                              )
                            else
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppTheme.primaryGreen,
                                    width: 2,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    '${index + 1}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                levelName,
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        LinearProgressIndicator(
                          value: progress,
                          backgroundColor: Colors.grey[300],
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            AppTheme.primaryGreen,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${(progress * 100).toInt()}% Complete',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }

  void _navigateToLevel(BuildContext context, LearningLevel level) {
    switch (level) {
      case LearningLevel.level1:
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const Level1Screen(),
          ),
        );
        break;
      case LearningLevel.level2:
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const Level2Screen(),
          ),
        );
        break;
      case LearningLevel.level3:
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const Level3Screen(),
          ),
        );
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Coming soon!')),
        );
    }
  }
}

class Level1Screen extends StatelessWidget {
  const Level1Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Level 1: Basic Tile Identification'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildLessonCard(
            context,
            title: 'Lesson 1: Suits Overview',
            description: 'Learn about the three main suits: Bamboo, Characters, and Dots',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const TileRecognitionScreen(),
                ),
              );
            },
          ),
          _buildLessonCard(
            context,
            title: 'Lesson 2: Honor Tiles',
            description: 'Understand Wind and Dragon tiles',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const TileRecognitionScreen(),
                ),
              );
            },
          ),
          _buildLessonCard(
            context,
            title: 'Quiz: Tile Recognition',
            description: 'Test your knowledge of tile identification',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const TileQuizScreen(),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLessonCard(
    BuildContext context, {
    required String title,
    required String description,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(title),
        subtitle: Text(description),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class Level2Screen extends StatelessWidget {
  const Level2Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Level 2: Suits and Sets'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildConceptCard(
            context,
            title: 'Chow (Chi)',
            description: 'A sequence of three consecutive tiles of the same suit',
            example: 'Example: 一索, 二索, 三索',
          ),
          _buildConceptCard(
            context,
            title: 'Pung (Peng)',
            description: 'Three identical tiles',
            example: 'Example: 三索, 三索, 三索',
          ),
          _buildConceptCard(
            context,
            title: 'Kong (Gang)',
            description: 'Four identical tiles',
            example: 'Example: 三索, 三索, 三索, 三索',
          ),
        ],
      ),
    );
  }

  Widget _buildConceptCard(
    BuildContext context, {
    required String title,
    required String description,
    required String example,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(description),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryGreen.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                example,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class Level3Screen extends StatelessWidget {
  const Level3Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Level 3: Hand Combinations'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildConceptCard(
            context,
            title: 'Winning Hand',
            description:
                'A complete hand consists of four sets (chows, pungs, or kongs) and one pair',
            example: 'Example: 4 sets + 1 pair = Win',
          ),
          _buildConceptCard(
            context,
            title: 'Valid Combinations',
            description:
                'Learn common winning patterns and special hands',
            example: 'All Pairs, Seven Pairs, etc.',
          ),
        ],
      ),
    );
  }

  Widget _buildConceptCard(
    BuildContext context, {
    required String title,
    required String description,
    required String example,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(description),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryGreen.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                example,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

