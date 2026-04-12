import { WindTile } from './Tile';
import { GameState } from './GameState';
import { ScoringResult } from '@/engine/types';

export type GameMode = 'quick' | 'full';
export type MatchPhase = 'playing' | 'betweenHands' | 'finished';

export interface HandResult {
  handNumber: number;
  round: WindTile;
  dealerIndex: number;
  winnerId: string | null;
  isSelfDrawn: boolean;
  scoringResult: ScoringResult | null;
  scoreChanges: number[];
}

export interface MatchState {
  mode: GameMode;
  difficulty: 'easy' | 'medium' | 'hard';
  currentRound: WindTile;
  handNumber: number;
  totalHandsPlayed: number;
  initialDealerIndex: number;
  currentDealerIndex: number;
  initialDealerHasRotated: boolean;
  playerScores: number[];
  startingScore: number;
  handResults: HandResult[];
  currentHand: GameState | null;
  phase: MatchPhase;
  playerNames: string[];
  humanPlayerId: string;
}
