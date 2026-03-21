export enum LearningLevel {
  LEVEL1 = 'level1',
  LEVEL2 = 'level2',
  LEVEL3 = 'level3',
  LEVEL4 = 'level4',
  LEVEL5 = 'level5',
  LEVEL6 = 'level6',
}

export interface LevelProgress {
  level: LearningLevel;
  completedLessons: number;
  totalLessons: number;
  quizScore: number;
  isCompleted: boolean;
  completedAt?: Date;
}

export const calculateProgressPercentage = (progress: LevelProgress): number => {
  return progress.totalLessons > 0
    ? progress.completedLessons / progress.totalLessons
    : 0.0;
};

export interface UserProgress {
  userId: string;
  variant: string;
  levelProgress: Record<LearningLevel, LevelProgress>;
  totalTimeSpent: number;
  gamesPlayed: number;
  gamesWon: number;
  quizzesCompleted: number;
  achievements: string[];
  lastUpdated: Date;
  createdAt: Date;
}

export const calculateOverallProgress = (progress: UserProgress): number => {
  const levels = Object.values(progress.levelProgress);
  if (levels.length === 0) return 0.0;

  const totalProgress = levels.reduce((sum, p) => {
    return sum + calculateProgressPercentage(p);
  }, 0.0);

  return totalProgress / levels.length;
};

export const getCompletedLevels = (progress: UserProgress): number => {
  return Object.values(progress.levelProgress).filter(p => p.isCompleted).length;
};

export const userProgressToJson = (progress: UserProgress): Record<string, any> => {
  const levelProgressJson: Record<string, any> = {};
  Object.entries(progress.levelProgress).forEach(([key, value]) => {
    levelProgressJson[key] = {
      level: value.level,
      completedLessons: value.completedLessons,
      totalLessons: value.totalLessons,
      quizScore: value.quizScore,
      isCompleted: value.isCompleted,
      completedAt: value.completedAt?.toISOString(),
    };
  });

  return {
    userId: progress.userId,
    variant: progress.variant,
    levelProgress: levelProgressJson,
    totalTimeSpent: progress.totalTimeSpent,
    gamesPlayed: progress.gamesPlayed,
    gamesWon: progress.gamesWon,
    quizzesCompleted: progress.quizzesCompleted,
    achievements: progress.achievements,
    lastUpdated: progress.lastUpdated.toISOString(),
    createdAt: progress.createdAt.toISOString(),
  };
};

export const userProgressFromJson = (json: Record<string, any>): UserProgress => {
  const levelProgressMap: Record<LearningLevel, LevelProgress> = {} as Record<LearningLevel, LevelProgress>;
  const levelData = json.levelProgress as Record<string, any> | undefined;

  if (levelData) {
    Object.entries(levelData).forEach(([key, value]) => {
      const level = key as LearningLevel;
      levelProgressMap[level] = {
        level: value.level as LearningLevel,
        completedLessons: value.completedLessons as number,
        totalLessons: value.totalLessons as number,
        quizScore: value.quizScore as number,
        isCompleted: value.isCompleted as boolean ?? false,
        completedAt: value.completedAt ? new Date(value.completedAt as string) : undefined,
      };
    });
  }

  return {
    userId: json.userId as string,
    variant: json.variant as string,
    levelProgress: levelProgressMap,
    totalTimeSpent: (json.totalTimeSpent as number) ?? 0,
    gamesPlayed: (json.gamesPlayed as number) ?? 0,
    gamesWon: (json.gamesWon as number) ?? 0,
    quizzesCompleted: (json.quizzesCompleted as number) ?? 0,
    achievements: (json.achievements as string[]) ?? [],
    lastUpdated: new Date(json.lastUpdated as string),
    createdAt: new Date(json.createdAt as string),
  };
};
