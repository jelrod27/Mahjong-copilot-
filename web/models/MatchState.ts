import { WindTile, tileToJson, tileFromJson } from './Tile';
import { GameState, gameStateToJson, gameStateFromJson, meldToJson, meldFromJson } from './GameState';
import { ScoringResult, PaymentBreakdown } from '../engine/types';

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
  /**
   * Minimum faan required for a legal win across all hands of this match.
   * HK standard default is 3. Beginner / family rules may lower to 1 or 0.
   */
  minFaan?: number;
}

export function matchStateToJson(match: MatchState): Record<string, any> {
  return {
    mode: match.mode,
    difficulty: match.difficulty,
    currentRound: match.currentRound,
    handNumber: match.handNumber,
    totalHandsPlayed: match.totalHandsPlayed,
    initialDealerIndex: match.initialDealerIndex,
    currentDealerIndex: match.currentDealerIndex,
    initialDealerHasRotated: match.initialDealerHasRotated,
    playerScores: match.playerScores,
    startingScore: match.startingScore,
    handResults: match.handResults.map(hr => handResultToJson(hr)),
    currentHand: match.currentHand ? gameStateToJson(match.currentHand) : null,
    phase: match.phase,
    playerNames: match.playerNames,
    humanPlayerId: match.humanPlayerId,
    minFaan: match.minFaan,
  };
}

export function matchStateFromJson(json: Record<string, any>): MatchState {
  return {
    mode: json.mode as GameMode,
    difficulty: json.difficulty as 'easy' | 'medium' | 'hard',
    currentRound: json.currentRound as WindTile,
    handNumber: json.handNumber as number,
    totalHandsPlayed: json.totalHandsPlayed as number,
    initialDealerIndex: json.initialDealerIndex as number,
    currentDealerIndex: json.currentDealerIndex as number,
    initialDealerHasRotated: json.initialDealerHasRotated as boolean,
    playerScores: json.playerScores as number[],
    startingScore: json.startingScore as number,
    handResults: (json.handResults as any[])?.map((hr: any) => handResultFromJson(hr)) ?? [],
    currentHand: json.currentHand ? gameStateFromJson(json.currentHand as Record<string, any>) : null,
    phase: json.phase as MatchPhase,
    playerNames: json.playerNames as string[],
    humanPlayerId: json.humanPlayerId as string,
    minFaan: json.minFaan as number | undefined,
  };
}

function handResultToJson(hr: HandResult): Record<string, any> {
  return {
    handNumber: hr.handNumber,
    round: hr.round,
    dealerIndex: hr.dealerIndex,
    winnerId: hr.winnerId,
    isSelfDrawn: hr.isSelfDrawn,
    scoringResult: hr.scoringResult ? scoringResultToJson(hr.scoringResult) : null,
    scoreChanges: hr.scoreChanges,
  };
}

function handResultFromJson(json: Record<string, any>): HandResult {
  return {
    handNumber: json.handNumber as number,
    round: json.round as WindTile,
    dealerIndex: json.dealerIndex as number,
    winnerId: json.winnerId as string | null,
    isSelfDrawn: json.isSelfDrawn as boolean,
    scoringResult: json.scoringResult ? scoringResultFromJson(json.scoringResult as Record<string, any>) : null,
    scoreChanges: (json.scoreChanges as number[]) ?? [],
  };
}

function scoringResultToJson(sr: ScoringResult): Record<string, any> {
  return {
    fans: sr.fans,
    totalFan: sr.totalFan,
    basePoints: sr.basePoints,
    totalPoints: sr.totalPoints,
    handName: sr.handName,
    melds: sr.melds.map(m => meldToJson(m)),
    pair: sr.pair.map(t => tileToJson(t)),
    payment: sr.payment,
  };
}

function scoringResultFromJson(json: Record<string, any>): ScoringResult {
  return {
    fans: (json.fans as any[]) ?? [],
    totalFan: json.totalFan as number,
    basePoints: json.basePoints as number,
    totalPoints: json.totalPoints as number,
    handName: json.handName as string | undefined,
    melds: (json.melds as any[])?.map((m: any) => meldFromJson(m)) ?? [],
    pair: (json.pair as any[])?.map((t: any) => tileFromJson(t)) ?? [],
    payment: json.payment as PaymentBreakdown | undefined,
  };
}
