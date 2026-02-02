// Mahjong Learning App - Content Index

export * from './level1';
export * from './level2';
// Future levels:
// export * from './level3'; // Hand Combinations
// export * from './level4'; // Scoring Fundamentals
// export * from './level5'; // Advanced Scoring
// export * from './level6'; // Strategy

import { Level1 } from './level1';
import { Level2 } from './level2';

export const AllLevels = [Level1, Level2];

export const getLevelById = (id: number) => AllLevels.find(l => l.id === id);
