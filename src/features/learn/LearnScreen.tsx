import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {AppColors, AppRadius, AppSpacing} from '../../theme/appTheme';
import {Level1, Lesson} from '../../content/level1';

// Props for navigation (would come from React Navigation in real app)
interface LearnScreenProps {
  onLessonPress?: (lesson: Lesson) => void;
}

const LearnScreen: React.FC<LearnScreenProps> = ({onLessonPress}) => {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const level = Level1;

  const progress = (completedLessons.length / level.lessons.length) * 100;

  const handleLessonPress = (lesson: Lesson) => {
    if (onLessonPress) {
      onLessonPress(lesson);
    }
    // For demo: mark as completed when pressed
    if (!completedLessons.includes(lesson.id)) {
      setCompletedLessons([...completedLessons, lesson.id]);
    }
  };

  const isLessonUnlocked = (index: number) => {
    if (index === 0) return true;
    return completedLessons.includes(level.lessons[index - 1].id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.levelBadge}>LEVEL {level.id}</Text>
          <Text style={styles.title}>{level.title}</Text>
          <Text style={styles.description}>{level.description}</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${progress}%`}]} />
            </View>
            <Text style={styles.progressText}>
              {completedLessons.length}/{level.lessons.length} lessons
            </Text>
          </View>
        </View>

        {/* Lessons List */}
        <View style={styles.lessonsContainer}>
          {level.lessons.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const isUnlocked = isLessonUnlocked(index);
            
            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  isCompleted && styles.lessonCardCompleted,
                  !isUnlocked && styles.lessonCardLocked,
                ]}
                onPress={() => isUnlocked && handleLessonPress(lesson)}
                disabled={!isUnlocked}
                activeOpacity={0.7}
              >
                {/* Lesson Number */}
                <View style={[
                  styles.lessonNumber,
                  isCompleted && styles.lessonNumberCompleted,
                  !isUnlocked && styles.lessonNumberLocked,
                ]}>
                  {isCompleted ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text style={[
                      styles.numberText,
                      !isUnlocked && styles.numberTextLocked
                    ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>

                {/* Lesson Info */}
                <View style={styles.lessonInfo}>
                  <Text style={[
                    styles.lessonTitle,
                    !isUnlocked && styles.lessonTitleLocked
                  ]}>
                    {lesson.title}
                  </Text>
                  <Text style={[
                    styles.lessonSubtitle,
                    !isUnlocked && styles.lessonSubtitleLocked
                  ]}>
                    {lesson.subtitle}
                  </Text>
                  
                  {/* Lesson meta */}
                  <View style={styles.lessonMeta}>
                    {lesson.tiles && (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaText}>🀄 {lesson.tiles.length} tiles</Text>
                      </View>
                    )}
                    {lesson.quiz && (
                      <View style={styles.metaTag}>
                        <Text style={styles.metaText}>❓ {lesson.quiz.length} quiz</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Arrow / Lock */}
                <View style={styles.lessonAction}>
                  {isUnlocked ? (
                    <Text style={styles.arrow}>›</Text>
                  ) : (
                    <Text style={styles.lock}>🔒</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom padding */}
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    padding: AppSpacing.lg,
    backgroundColor: AppColors.primaryGreen,
    borderBottomLeftRadius: AppRadius.xl,
    borderBottomRightRadius: AppRadius.xl,
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primaryGold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: AppSpacing.md,
  },
  progressContainer: {
    marginTop: AppSpacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primaryGold,
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  lessonsContainer: {
    padding: AppSpacing.md,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lessonCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: AppColors.primaryGreen,
  },
  lessonCardLocked: {
    backgroundColor: '#F5F5F5',
    opacity: 0.7,
  },
  lessonNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  lessonNumberCompleted: {
    backgroundColor: AppColors.primaryGreen,
  },
  lessonNumberLocked: {
    backgroundColor: '#D1D5DB',
  },
  numberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  numberTextLocked: {
    color: '#9CA3AF',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 2,
  },
  lessonTitleLocked: {
    color: '#9CA3AF',
  },
  lessonSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 6,
  },
  lessonSubtitleLocked: {
    color: '#D1D5DB',
  },
  lessonMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaTag: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  lessonAction: {
    marginLeft: AppSpacing.sm,
  },
  arrow: {
    fontSize: 28,
    color: AppColors.primaryGreen,
    fontWeight: '300',
  },
  lock: {
    fontSize: 18,
  },
});

export default LearnScreen;
