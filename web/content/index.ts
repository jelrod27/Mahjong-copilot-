// Mahjong Learning App - Content Index

export * from './level1';
export * from './level2';
export * from './level3';
export * from './level4';
export * from './level5';
export * from './level6';
// All levels exported


import { Level1 } from './level1';
import { Level2 } from './level2';
import { Level3 } from './level3';
import { Level4 } from './level4';
import { Level5 } from './level5';
import { Level6 } from './level6';

export const AllLevels = [Level1, Level2, Level3, Level4, Level5, Level6];

export const getLevelById = (id: number) => AllLevels.find(l => l.id === id);
