// Mahjong Learning App - Content Index

export * from './level1';
export * from './level2';
export * from './level3';
// Future levels:
// export * from './level4'; // Scoring Fundamentals
// export * from './level5'; // Advanced Scoring
// export * from './level6'; // Strategy

import { Level1 } from './level1';
import { Level2 } from './level2';
import { Level3 } from './level3';

export const AllLevels = [Level1, Level2, Level3];

export const getLevelById = (id: number) => AllLevels.find(l => l.id === id);
