// Mahjong Game Engine — Pure TypeScript
// Shared between client (NPC games) and server (multiplayer)

export { isWinningHand, findDecompositions, isThirteenOrphans, isSevenPairs, calculateShanten } from './winDetection';
export { calculateScore } from './scoring';
export { isSameTile, isPung, isChow, isKong, isPair, getAvailableClaims, resolveClaims } from './claiming';
export { initializeGame, applyAction } from './turnManager';
export type { GameOptions } from './turnManager';
export type { GameAction, AIDecision, ScoringContext, ScoringResult, FanItem, HandDecomposition, AvailableClaim } from './types';
