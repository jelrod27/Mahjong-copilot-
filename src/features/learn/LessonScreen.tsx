import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppColors, AppRadius, AppSpacing} from '../../theme/appTheme';
import {Lesson, QuizQuestion} from '../../content/level1';
import {MahjongTile} from '../../components/MahjongTile';
import {getTileById} from '../../models/Tile';
import {LearnStackParamList} from '../../navigation/LearnNavigator';

type LessonScreenRouteProp = RouteProp<LearnStackParamList, 'Lesson'>;
type LessonScreenNavigationProp = StackNavigationProp<LearnStackParamList, 'Lesson'>;

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

const LessonScreen: React.FC = () => {
  const navigation = useNavigation<LessonScreenNavigationProp>();
  const route = useRoute<LessonScreenRouteProp>();
  const {lesson} = route.params;

  const [currentSection, setCurrentSection] = useState<'content' | 'quiz'>('content');
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const hasQuiz = lesson.quiz && lesson.quiz.length > 0;
  const currentQuiz = lesson.quiz?.[quizIndex];
  const isLastQuiz = quizIndex === (lesson.quiz?.length || 0) - 1;

  const markLessonComplete = async () => {
    try {
      const stored = await AsyncStorage.getItem(COMPLETED_LESSONS_KEY);
      const completed: string[] = stored ? JSON.parse(stored) : [];
      if (!completed.includes(lesson.id)) {
        completed.push(lesson.id);
        await AsyncStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(completed));
      }
    } catch (error) {
      console.error('Failed to mark lesson complete:', error);
    }
  };

  const handleComplete = async () => {
    await markLessonComplete();
    
    if (hasQuiz) {
      const score = Math.round((correctAnswers / (lesson.quiz?.length || 1)) * 100);
      Alert.alert(
        '🎉 Lesson Complete!',
        `You scored ${score}% (${correctAnswers}/${lesson.quiz?.length} correct)`,
        [{text: 'Continue', onPress: () => navigation.goBack()}]
      );
    } else {
      Alert.alert(
        '✓ Lesson Complete!',
        'Great job! On to the next lesson.',
        [{text: 'Continue', onPress: () => navigation.goBack()}]
      );
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    setShowExplanation(true);
    if (answer === currentQuiz?.correctAnswer) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    if (isLastQuiz) {
      handleComplete();
    } else {
      setQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleStartQuiz = () => {
    setCurrentSection('quiz');
    setQuizIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCorrectAnswers(0);
  };

  // Render content section
  const renderContent = () => (
    <ScrollView 
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
    >
      {/* Lesson content paragraphs */}
      <View style={styles.contentContainer}>
        {lesson.content.map((paragraph, index) => (
          <Text 
            key={index} 
            style={[
              styles.paragraph,
              paragraph === '' && styles.emptyParagraph,
              paragraph.startsWith('•') && styles.bulletPoint,
              paragraph.startsWith('⚠️') && styles.warningText,
              paragraph.startsWith('🎉') && styles.celebrationText,
            ]}
          >
            {paragraph}
          </Text>
        ))}
      </View>

      {/* Tiles display if lesson has tiles */}
      {lesson.tiles && lesson.tiles.length > 0 && (
        <View style={styles.tilesSection}>
          <Text style={styles.tilesSectionTitle}>Tiles in this lesson:</Text>
          <View style={styles.tilesGrid}>
            {lesson.tiles.map((tileId) => {
              const tile = getTileById(tileId);
              if (!tile) return null;
              return (
                <View key={tileId} style={styles.tileWrapper}>
                  <MahjongTile tile={tile} width={55} height={80} />
                  <Text style={styles.tileName}>{tile.nameEnglish}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        {hasQuiz ? (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleStartQuiz}
          >
            <Text style={styles.primaryButtonText}>
              Take Quiz ({lesson.quiz?.length} questions)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleComplete}
          >
            <Text style={styles.primaryButtonText}>
              Complete Lesson ✓
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{height: 40}} />
    </ScrollView>
  );

  // Render quiz section
  const renderQuiz = () => {
    if (!currentQuiz) return null;

    const questionTile = currentQuiz.tileId ? getTileById(currentQuiz.tileId) : null;

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.quizContainer}>
          {/* Progress */}
          <View style={styles.quizProgress}>
            <Text style={styles.quizProgressText}>
              Question {quizIndex + 1} of {lesson.quiz?.length}
            </Text>
            <View style={styles.quizProgressBar}>
              <View 
                style={[
                  styles.quizProgressFill, 
                  {width: `${((quizIndex + 1) / (lesson.quiz?.length || 1)) * 100}%`}
                ]} 
              />
            </View>
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{currentQuiz.question}</Text>
            
            {/* Show tile if question references one */}
            {questionTile && (
              <View style={styles.questionTile}>
                <MahjongTile 
                  tile={questionTile} 
                  width={80} 
                  height={120}
                />
              </View>
            )}
          </View>

          {/* Answer options */}
          <View style={styles.optionsContainer}>
            {currentQuiz.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuiz.correctAnswer;
              const showResult = showExplanation;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                    showResult && isCorrect && styles.optionButtonCorrect,
                    showResult && isSelected && !isCorrect && styles.optionButtonWrong,
                  ]}
                  onPress={() => handleAnswerSelect(option)}
                  disabled={showExplanation}
                >
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    showResult && isCorrect && styles.optionTextCorrect,
                  ]}>
                    {option}
                  </Text>
                  {showResult && isCorrect && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <Text style={styles.wrongIcon}>✗</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation */}
          {showExplanation && (
            <View style={[
              styles.explanationContainer,
              selectedAnswer === currentQuiz.correctAnswer 
                ? styles.explanationCorrect 
                : styles.explanationWrong
            ]}>
              <Text style={styles.explanationTitle}>
                {selectedAnswer === currentQuiz.correctAnswer ? '✓ Correct!' : '✗ Not quite'}
              </Text>
              <Text style={styles.explanationText}>
                {currentQuiz.explanation}
              </Text>
            </View>
          )}

          {/* Next button */}
          {showExplanation && (
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNextQuiz}
            >
              <Text style={styles.nextButtonText}>
                {isLastQuiz ? 'Complete Lesson' : 'Next Question →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lesson.title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{lesson.subtitle}</Text>
        </View>
        {currentSection === 'quiz' && (
          <View style={styles.scoreIndicator}>
            <Text style={styles.scoreText}>{correctAnswers}/{quizIndex + 1}</Text>
          </View>
        )}
      </View>

      {/* Content or Quiz */}
      {currentSection === 'content' ? renderContent() : renderQuiz()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
  },
  backButtonText: {
    fontSize: 18,
    color: AppColors.primaryGreen,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scoreIndicator: {
    backgroundColor: AppColors.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: AppSpacing.lg,
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 28,
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.md,
  },
  emptyParagraph: {
    marginBottom: AppSpacing.xs,
  },
  bulletPoint: {
    paddingLeft: AppSpacing.md,
  },
  warningText: {
    backgroundColor: '#FEF3C7',
    padding: AppSpacing.sm,
    borderRadius: AppRadius.sm,
    overflow: 'hidden',
  },
  celebrationText: {
    fontSize: 20,
    fontWeight: '600',
  },
  tilesSection: {
    padding: AppSpacing.lg,
    backgroundColor: '#F9FAFB',
  },
  tilesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.md,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AppSpacing.md,
  },
  tileWrapper: {
    alignItems: 'center',
  },
  tileName: {
    marginTop: 4,
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: 'center',
    maxWidth: 60,
  },
  actionContainer: {
    padding: AppSpacing.lg,
  },
  primaryButton: {
    backgroundColor: AppColors.primaryGreen,
    paddingVertical: AppSpacing.md,
    borderRadius: AppRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // Quiz styles
  quizContainer: {
    padding: AppSpacing.lg,
  },
  quizProgress: {
    marginBottom: AppSpacing.lg,
  },
  quizProgressText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  quizProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  quizProgressFill: {
    height: '100%',
    backgroundColor: AppColors.primaryGreen,
    borderRadius: 3,
  },
  questionContainer: {
    marginBottom: AppSpacing.lg,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    lineHeight: 28,
  },
  questionTile: {
    alignItems: 'center',
    marginTop: AppSpacing.lg,
  },
  optionsContainer: {
    gap: AppSpacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionButtonSelected: {
    borderColor: AppColors.primaryGreen,
    backgroundColor: '#F0FDF4',
  },
  optionButtonCorrect: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  optionButtonWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionText: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: '#22C55E',
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 20,
    color: '#22C55E',
    fontWeight: '700',
  },
  wrongIcon: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: '700',
  },
  explanationContainer: {
    marginTop: AppSpacing.lg,
    padding: AppSpacing.md,
    borderRadius: AppRadius.md,
  },
  explanationCorrect: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  explanationWrong: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.textPrimary,
  },
  nextButton: {
    marginTop: AppSpacing.lg,
    backgroundColor: AppColors.primaryGreen,
    paddingVertical: AppSpacing.md,
    borderRadius: AppRadius.lg,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default LessonScreen;
