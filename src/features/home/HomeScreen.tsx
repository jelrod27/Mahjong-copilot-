import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppColors, AppRadius, AppSpacing} from '../../theme/appTheme';
import {Level1} from '../../content/level1';
import {MahjongTile} from '../../components/MahjongTile';
import {getTileById, getAllTiles} from '../../models/Tile';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [randomTile, setRandomTile] = useState(() => {
    const tiles = getAllTiles();
    return tiles[Math.floor(Math.random() * tiles.length)];
  });

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      // Pick a new random tile each time screen focuses
      const tiles = getAllTiles();
      setRandomTile(tiles[Math.floor(Math.random() * tiles.length)]);
    }, [])
  );

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(COMPLETED_LESSONS_KEY);
      if (stored) {
        setCompletedLessons(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const level1Progress = (completedLessons.length / Level1.lessons.length) * 100;
  const totalLessons = Level1.lessons.length; // Will grow as we add levels
  const overallProgress = (completedLessons.length / totalLessons) * 100;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalText = () => {
    if (completedLessons.length === 0) {
      return "Ready to learn mahjong? Let's start with the basics.";
    }
    if (level1Progress === 100) {
      return "Level 1 complete! You know all the tiles now.";
    }
    if (level1Progress >= 50) {
      return "You're halfway through! Keep going.";
    }
    return "You're making progress. Keep it up!";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.title}>Mahjong for Dummies</Text>
          <Text style={styles.subtitle}>{getMotivationalText()}</Text>
        </View>

        {/* Progress Card */}
        <View style={styles.section}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressPercent}>{Math.round(overallProgress)}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {width: `${overallProgress}%`}]} />
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{completedLessons.length}</Text>
                <Text style={styles.statLabel}>Lessons Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalLessons - completedLessons.length}</Text>
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>144</Text>
                <Text style={styles.statLabel}>Total Tiles</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Continue Learning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          
          <TouchableOpacity 
            style={styles.continueCard}
            onPress={() => navigation.navigate('Learn' as never)}
            activeOpacity={0.8}
          >
            <View style={styles.continueLeft}>
              <Text style={styles.continueLevel}>LEVEL 1</Text>
              <Text style={styles.continueTitle}>{Level1.title}</Text>
              <Text style={styles.continueSubtitle}>
                {completedLessons.length === 0 
                  ? 'Start here'
                  : `${completedLessons.length}/${Level1.lessons.length} complete`
                }
              </Text>
            </View>
            <View style={styles.continueRight}>
              <View style={styles.circleProgress}>
                <Text style={styles.circleText}>{Math.round(level1Progress)}%</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Locked levels preview */}
          <View style={styles.lockedCard}>
            <Text style={styles.lockedLevel}>LEVEL 2</Text>
            <Text style={styles.lockedTitle}>Sets and Combinations</Text>
            <Text style={styles.lockedSubtitle}>Complete Level 1 to unlock</Text>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>LOCKED</Text>
            </View>
          </View>
        </View>

        {/* Tile of the Day */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Random Tile</Text>
          <View style={styles.tileCard}>
            <View style={styles.tileDisplay}>
              <MahjongTile tile={randomTile} width={70} height={100} />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileName}>{randomTile.nameEnglish}</Text>
              <Text style={styles.tileChinese}>{randomTile.nameChinese}</Text>
              <Text style={styles.tileHint}>
                {randomTile.number 
                  ? `${randomTile.suit} suit, number ${randomTile.number}`
                  : randomTile.wind 
                    ? `${randomTile.wind} wind tile`
                    : randomTile.dragon
                      ? `${randomTile.dragon} dragon`
                      : 'Bonus tile'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              The 1 Bamboo tile shows a bird, not a bamboo stick. This catches most beginners off guard.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              White Dragon is often blank or shows just a frame. Don't mistake it for a missing tile.
            </Text>
          </View>
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
    paddingTop: AppSpacing.xl,
    backgroundColor: AppColors.primaryGreen,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  section: {
    padding: AppSpacing.md,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: AppSpacing.sm,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginTop: -20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.primaryGreen,
  },
  progressBarContainer: {
    marginBottom: AppSpacing.md,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primaryGreen,
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  continueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primaryGreen,
    marginBottom: AppSpacing.sm,
  },
  continueLeft: {
    flex: 1,
  },
  continueLevel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.primaryGreen,
    letterSpacing: 1,
    marginBottom: 4,
  },
  continueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  continueSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  continueRight: {
    marginLeft: AppSpacing.md,
  },
  circleProgress: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  lockedCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    opacity: 0.7,
    position: 'relative',
  },
  lockedLevel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  lockedBadge: {
    position: 'absolute',
    top: AppSpacing.md,
    right: AppSpacing.md,
    backgroundColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  tileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tileDisplay: {
    marginRight: AppSpacing.lg,
  },
  tileInfo: {
    flex: 1,
  },
  tileName: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  tileChinese: {
    fontSize: 24,
    color: AppColors.primaryGreen,
    marginBottom: 8,
  },
  tileHint: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textTransform: 'capitalize',
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#92400E',
  },
});

export default HomeScreen;
