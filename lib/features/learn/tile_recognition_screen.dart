import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/tile.dart';
import '../../widgets/mahjong_tiles/tile_widget.dart';
import '../../core/theme/app_theme.dart';
import '../../core/spacing/app_spacing.dart';
import '../../providers/progress_provider.dart';
import '../../models/user_progress.dart';

class TileRecognitionScreen extends StatefulWidget {
  const TileRecognitionScreen({super.key});

  @override
  State<TileRecognitionScreen> createState() => _TileRecognitionScreenState();
}

class _TileRecognitionScreenState extends State<TileRecognitionScreen> {
  final List<Tile> _allTiles = TileFactory.getAllTiles();
  String? _selectedCategory;
  int _currentTileIndex = 0;
  bool _showBack = false;

  List<Tile> get _filteredTiles {
    if (_selectedCategory == null) return _allTiles;
    return _allTiles
        .where((tile) => tile.category == _selectedCategory)
        .toList();
  }

  Tile get _currentTile => _filteredTiles[_currentTileIndex];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tile Recognition'),
        actions: [
          IconButton(
            icon: const Icon(Icons.quiz),
            onPressed: () {
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
      body: Column(
        children: [
          // Category selector
          _buildCategorySelector(),
          
          // Tile display
          Expanded(
            child: _buildTileDisplay(),
          ),
          
          // Navigation controls
          _buildNavigationControls(),
        ],
      ),
    );
  }

  Widget _buildCategorySelector() {
    final categories = [
      {'id': null, 'name': 'All Tiles'},
      {'id': 'bamboo', 'name': 'Bamboo'},
      {'id': 'character', 'name': 'Characters'},
      {'id': 'dot', 'name': 'Dots'},
      {'id': 'wind', 'name': 'Winds'},
      {'id': 'dragon', 'name': 'Dragons'},
    ];

    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories[index];
          final isSelected = _selectedCategory == category['id'];
          
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text(category['name']!),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  _selectedCategory = selected ? category['id'] as String? : null;
                  _currentTileIndex = 0;
                  _showBack = false;
                });
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildTileDisplay() {
    return GestureDetector(
      onTap: () {
        setState(() {
          _showBack = !_showBack;
        });
      },
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            MahjongTileWidget(
              tile: _currentTile,
              width: 120,
              height: 180,
              showBack: _showBack,
            ),
            const SizedBox(height: 24),
            if (!_showBack) ...[
              Text(
                _currentTile.nameEnglish,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _currentTile.nameChinese,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: 24,
                    ),
              ),
              if (_currentTile.nameJapanese.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  _currentTile.nameJapanese,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 20,
                      ),
                ),
              ],
            ] else ...[
              Text(
                'Tap to reveal',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              '${_currentTileIndex + 1} / ${_filteredTiles.length}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavigationControls() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          IconButton(
            icon: const Icon(Icons.skip_previous),
            onPressed: _currentTileIndex > 0
                ? () {
                    setState(() {
                      _currentTileIndex--;
                      _showBack = false;
                    });
                  }
                : null,
          ),
          ElevatedButton(
            onPressed: _showBack
                ? null
                : () {
                    // Mark as learned
                    _markTileLearned();
                  },
            child: const Text('Mark Learned'),
          ),
          IconButton(
            icon: const Icon(Icons.skip_next),
            onPressed: _currentTileIndex < _filteredTiles.length - 1
                ? () {
                    setState(() {
                      _currentTileIndex++;
                      _showBack = false;
                    });
                  }
                : null,
          ),
        ],
      ),
    );
  }

  void _markTileLearned() {
    // Update progress
    final progressProvider = Provider.of<ProgressProvider>(context, listen: false);
    // This would track which tiles the user has learned
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Tile marked as learned!')),
    );
  }
}

class TileQuizScreen extends StatefulWidget {
  const TileQuizScreen({super.key});

  @override
  State<TileQuizScreen> createState() => _TileQuizScreenState();
}

class _TileQuizScreenState extends State<TileQuizScreen> {
  final List<Tile> _allTiles = TileFactory.getAllTiles();
  int _currentQuestionIndex = 0;
  int? _selectedAnswer;
  bool _showResult = false;
  int _correctAnswers = 0;

  late List<QuizQuestion> _questions;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _generateQuestions();
  }

  void _generateQuestions() {
    _questions = [];
    final random = (_allTiles.toList()..shuffle()).take(10).toList();
    
    for (final tile in random) {
      final wrongAnswers = _allTiles
          .where((t) => t.category == tile.category && t.id != tile.id)
          .take(3)
          .map((t) => t.nameEnglish)
          .toList();
      
      final options = [tile.nameEnglish, ...wrongAnswers]..shuffle();
      final correctIndex = options.indexOf(tile.nameEnglish);
      
      _questions.add(QuizQuestion(
        id: tile.id,
        question: 'What is this tile?',
        options: options,
        correctAnswerIndex: correctIndex,
        explanation: 'This is ${tile.nameEnglish} (${tile.nameChinese})',
        imageUrl: tile.assetPath,
        level: LearningLevel.level1,
      ));
    }
    
    setState(() {
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_currentQuestionIndex >= _questions.length) {
      return _buildResultsScreen();
    }

    final question = _questions[_currentQuestionIndex];
    final tile = _allTiles.firstWhere((t) => t.id == question.id);

    return Scaffold(
      appBar: AppBar(
        title: Text('Quiz: ${_currentQuestionIndex + 1}/${_questions.length}'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Progress indicator
            LinearProgressIndicator(
              value: (_currentQuestionIndex + 1) / _questions.length,
            ),
            const SizedBox(height: 32),
            
            // Tile display
            Center(
              child: MahjongTileWidget(
                tile: tile,
                width: 150,
                height: 225,
              ),
            ),
            const SizedBox(height: 32),
            
            // Question
            Text(
              question.question,
              style: Theme.of(context).textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            
            // Answer options
            Expanded(
              child: ListView.builder(
                itemCount: question.options.length,
                itemBuilder: (context, index) {
                  final isSelected = _selectedAnswer == index;
                  final isCorrect = index == question.correctAnswerIndex;
                  Color? backgroundColor;
                  
                  if (_showResult) {
                    if (isCorrect) {
                      backgroundColor = AppTheme.successColor.withOpacity(0.2);
                    } else if (isSelected && !isCorrect) {
                      backgroundColor = AppTheme.errorColor.withOpacity(0.2);
                    }
                  }

                  return Card(
                    color: backgroundColor,
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      title: Text(question.options[index]),
                      trailing: _showResult && isCorrect
                          ? const Icon(Icons.check_circle, color: AppTheme.successColor)
                          : _showResult && isSelected && !isCorrect
                              ? const Icon(Icons.cancel, color: AppTheme.errorColor)
                              : null,
                      onTap: _showResult ? null : () {
                        setState(() {
                          _selectedAnswer = index;
                          _showResult = true;
                          if (index == question.correctAnswerIndex) {
                            _correctAnswers++;
                          }
                        });
                      },
                    ),
                  );
                },
              ),
            ),
            
            // Explanation
            if (_showResult) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primaryGreen.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  question.explanation,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
              const SizedBox(height: 16),
            ],
            
            // Next button
            if (_showResult)
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _currentQuestionIndex++;
                    _selectedAnswer = null;
                    _showResult = false;
                  });
                },
                child: Text(_currentQuestionIndex < _questions.length - 1
                    ? 'Next Question'
                    : 'See Results'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsScreen() {
    final percentage = (_correctAnswers / _questions.length * 100).round();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz Results'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$percentage%',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: percentage >= 70
                          ? AppTheme.successColor
                          : AppTheme.errorColor,
                    ),
              ),
              const SizedBox(height: 16),
              Text(
                'You got $_correctAnswers out of ${_questions.length} correct!',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                child: const Text('Done'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class QuizQuestion {
  final String id;
  final String question;
  final List<String> options;
  final int correctAnswerIndex;
  final String explanation;
  final String? imageUrl;
  final LearningLevel level;

  QuizQuestion({
    required this.id,
    required this.question,
    required this.options,
    required this.correctAnswerIndex,
    required this.explanation,
    this.imageUrl,
    required this.level,
  });
}

