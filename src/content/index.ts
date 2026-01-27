// Mahjong Learning App - Content Index

export * from './level1';
// Future levels:
// export * from './level2'; // Sets: Pungs, Chows, Kongs
// export * from './level3'; // Hand Combinations
// export * from './level4'; // Scoring Fundamentals
// export * from './level5'; // Advanced Scoring
// export * from './level6'; // Strategy

import { Level1 } from './level1';

export const AllLevels = [Level1];

export const getLevelById = (id: number) => AllLevels.find(l => l.id === id);
