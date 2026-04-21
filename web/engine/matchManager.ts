/**
 * Match manager for multi-round Hong Kong Mahjong.
 * Pure functions — no side effects.
 *
 * A full game = 4 rounds (East/South/West/North), each round has a minimum
 * of 4 hands. A quick game = East round only.
 */

import { WindTile } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import { MatchState, HandResult, GameMode, normaliseMinFaan } from '@/models/MatchState';
import { ScoringResult, PaymentBreakdown } from './types';
import { initializeGame, GameOptions } from './turnManager';

const STARTING_SCORE = 500;
const WIND_ORDER: WindTile[] = [WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH];

export interface MatchOptions {
  mode: GameMode;
  difficulty: 'easy' | 'medium' | 'hard';
  playerNames: string[];
  humanPlayerId: string;
  turnTimeLimit?: number;
  /**
   * Minimum faan required for a legal win. Defaults to DEFAULT_MIN_FAAN (3).
   * Lower values are used for beginner/family rules.
   */
  minFaan?: number;
}

/** Create a new match and initialize the first hand. */
export function initializeMatch(options: MatchOptions): MatchState {
  const firstHand = createHand(options, 0, WindTile.EAST);

  return {
    mode: options.mode,
    difficulty: options.difficulty,
    currentRound: WindTile.EAST,
    handNumber: 1,
    totalHandsPlayed: 0,
    initialDealerIndex: 0,
    currentDealerIndex: 0,
    initialDealerHasRotated: false,
    playerScores: options.playerNames.map(() => STARTING_SCORE),
    startingScore: STARTING_SCORE,
    handResults: [],
    currentHand: firstHand,
    phase: 'playing',
    playerNames: options.playerNames,
    humanPlayerId: options.humanPlayerId,
    // Normalise at the boundary — MatchState.minFaan is typed narrowly so
    // corrupted persisted values never flow into future hand creation.
    minFaan: normaliseMinFaan(options.minFaan),
  };
}

/**
 * Advance the match after a hand completes.
 * Applies score changes, rotates dealer, advances round if needed.
 * Returns a new MatchState with phase 'betweenHands' or 'finished'.
 */
export function advanceMatch(
  match: MatchState,
  completedHand: GameState,
  scoringResult: ScoringResult | null,
): MatchState {
  const winnerId = completedHand.winnerId ?? null;
  const isSelfDrawn = completedHand.isSelfDrawn ?? false;

  // Calculate score changes from payment breakdown
  const scoreChanges = new Array(match.playerNames.length).fill(0);
  if (scoringResult?.payment) {
    applyPayments(scoreChanges, scoringResult.payment);
  } else if (!winnerId && completedHand.drawResult) {
    // Wall-exhaustion draw: apply flat tenpai/noten settlement.
    const draw = completedHand.drawResult;
    for (let i = 0; i < scoreChanges.length && i < draw.scoreChanges.length; i++) {
      scoreChanges[i] += draw.scoreChanges[i];
    }
  }

  // Update cumulative scores
  const newScores = match.playerScores.map((s, i) => s + scoreChanges[i]);

  // Record hand result
  const handResult: HandResult = {
    handNumber: match.handNumber,
    round: match.currentRound,
    dealerIndex: match.currentDealerIndex,
    winnerId,
    isSelfDrawn,
    scoringResult,
    scoreChanges,
  };
  const newResults = [...match.handResults, handResult];

  // Determine dealer rotation
  const dealerWon = winnerId === getPlayerId(match.currentDealerIndex, match.humanPlayerId);
  const isDraw = winnerId === null;
  const dealerStays = dealerWon || isDraw;

  let newDealerIndex = match.currentDealerIndex;
  let newRound = match.currentRound;
  let newHandNumber = match.handNumber + 1;
  let newInitialDealerIndex = match.initialDealerIndex;
  let newInitialDealerHasRotated = match.initialDealerHasRotated;

  if (!dealerStays) {
    // Dealer rotates
    const prevDealer = match.currentDealerIndex;
    newDealerIndex = (match.currentDealerIndex + 1) % match.playerNames.length;

    // Check if this rotation means the round should advance
    if (prevDealer === match.initialDealerIndex && !match.initialDealerHasRotated) {
      newInitialDealerHasRotated = true;
    }

    // Round advances when initial dealer has rotated and we've come full circle
    // i.e., when the initial dealer loses dealership
    if (newInitialDealerHasRotated && prevDealer === match.initialDealerIndex) {
      const nextRound = getNextRound(match.currentRound);
      const isLastRound = match.mode === 'quick'
        ? match.currentRound === WindTile.EAST
        : match.currentRound === WindTile.NORTH;

      if (isLastRound) {
        return {
          ...match,
          playerScores: newScores,
          handResults: newResults,
          totalHandsPlayed: match.totalHandsPlayed + 1,
          currentHand: null,
          phase: 'finished',
        };
      }

      // Advance to next round
      newRound = nextRound!;
      newHandNumber = 1;
      newInitialDealerIndex = newDealerIndex;
      newInitialDealerHasRotated = false;
    }
  }

  return {
    ...match,
    currentRound: newRound,
    handNumber: newHandNumber,
    totalHandsPlayed: match.totalHandsPlayed + 1,
    initialDealerIndex: newInitialDealerIndex,
    currentDealerIndex: newDealerIndex,
    initialDealerHasRotated: newInitialDealerHasRotated,
    playerScores: newScores,
    handResults: newResults,
    currentHand: null, // will be created when player continues
    phase: 'betweenHands',
  };
}

/** Create the next hand's GameState and transition to playing. */
export function startNextHand(match: MatchState): MatchState {
  if (match.phase !== 'betweenHands') return match;

  const hand = createHand(
    {
      mode: match.mode,
      difficulty: match.difficulty,
      playerNames: match.playerNames,
      humanPlayerId: match.humanPlayerId,
      minFaan: match.minFaan,
    },
    match.currentDealerIndex,
    match.currentRound,
  );

  // Inject cumulative scores into the hand's players
  const players = hand.players.map((p, i) => ({
    ...p,
    score: match.playerScores[i],
  }));

  return {
    ...match,
    currentHand: { ...hand, players },
    phase: 'playing',
  };
}

/** Get seat winds based on who is dealer (dealer is always East). */
export function getSeatWinds(dealerIndex: number, playerCount: number = 4): WindTile[] {
  const winds: WindTile[] = [];
  for (let i = 0; i < playerCount; i++) {
    const offset = (i - dealerIndex + playerCount) % playerCount;
    winds.push(WIND_ORDER[offset]);
  }
  return winds;
}

/** Compute final rankings sorted by score descending. */
export function computeFinalRankings(match: MatchState): { playerIndex: number; name: string; score: number; rank: number }[] {
  return match.playerNames
    .map((name, i) => ({ playerIndex: i, name, score: match.playerScores[i] }))
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ============================================
// Helpers
// ============================================

function getNextRound(current: WindTile): WindTile | null {
  const idx = WIND_ORDER.indexOf(current);
  return idx < WIND_ORDER.length - 1 ? WIND_ORDER[idx + 1] : null;
}

function getPlayerId(playerIndex: number, humanPlayerId: string): string {
  return playerIndex === 0 ? humanPlayerId : `ai_${playerIndex}`;
}

function createHand(
  options: Pick<MatchOptions, 'difficulty' | 'playerNames' | 'humanPlayerId' | 'minFaan'> & { mode?: GameMode },
  dealerIndex: number,
  prevailingWind: WindTile,
): GameState {
  const seatWinds = getSeatWinds(dealerIndex, options.playerNames.length);
  const gameOptions: GameOptions = {
    playerNames: options.playerNames,
    aiPlayers: options.playerNames
      .map((_, i) => (i === 0 ? null : { index: i, difficulty: options.difficulty }))
      .filter((x): x is { index: number; difficulty: 'easy' | 'medium' | 'hard' } => x !== null),
    humanPlayerId: options.humanPlayerId,
    dealerIndex,
    seatWinds,
    prevailingWind,
    minFaan: options.minFaan,
  };
  return initializeGame(gameOptions);
}

function applyPayments(scoreChanges: number[], payment: PaymentBreakdown): void {
  for (const p of payment.payments) {
    scoreChanges[p.fromPlayerIndex] -= p.amount;
    scoreChanges[p.toPlayerIndex] += p.amount;
  }
}
