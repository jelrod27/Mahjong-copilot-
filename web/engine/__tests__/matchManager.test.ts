import { describe, it, expect } from 'vitest';
import { WindTile } from '@/models/Tile';
import { GamePhase } from '@/models/GameState';
import { MatchState } from '@/models/MatchState';
import {
  initializeMatch,
  advanceMatch,
  startNextHand,
  getSeatWinds,
  computeFinalRankings,
} from '../matchManager';

const BASE_OPTIONS = {
  mode: 'quick' as const,
  difficulty: 'easy' as const,
  playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
  humanPlayerId: 'human-player',
};

function finishHand(match: MatchState, winnerId: string | null, isSelfDrawn = false) {
  const hand = match.currentHand!;
  return {
    ...hand,
    phase: GamePhase.FINISHED,
    winnerId,
    isSelfDrawn,
    finishedAt: new Date(),
  };
}

describe('initializeMatch', () => {
  it('creates a match with correct defaults', () => {
    const match = initializeMatch(BASE_OPTIONS);

    expect(match.mode).toBe('quick');
    expect(match.difficulty).toBe('easy');
    expect(match.currentRound).toBe(WindTile.EAST);
    expect(match.handNumber).toBe(1);
    expect(match.totalHandsPlayed).toBe(0);
    expect(match.currentDealerIndex).toBe(0);
    expect(match.initialDealerIndex).toBe(0);
    expect(match.initialDealerHasRotated).toBe(false);
    expect(match.playerScores).toEqual([500, 500, 500, 500]);
    expect(match.phase).toBe('playing');
    expect(match.currentHand).not.toBeNull();
    expect(match.handResults).toHaveLength(0);
  });

  it('first hand has correct prevailing wind and dealer', () => {
    const match = initializeMatch(BASE_OPTIONS);
    const hand = match.currentHand!;

    expect(hand.prevailingWind).toBe(WindTile.EAST);
    expect(hand.players[0].isDealer).toBe(true);
    expect(hand.players[0].seatWind).toBe(WindTile.EAST);
    expect(hand.currentPlayerIndex).toBe(0);
  });
});

describe('getSeatWinds', () => {
  it('dealer 0 gets standard wind assignment', () => {
    const winds = getSeatWinds(0);
    expect(winds).toEqual([WindTile.EAST, WindTile.SOUTH, WindTile.WEST, WindTile.NORTH]);
  });

  it('dealer 1 makes player 1 East', () => {
    const winds = getSeatWinds(1);
    expect(winds[1]).toBe(WindTile.EAST);
    expect(winds[0]).toBe(WindTile.NORTH);
    expect(winds[2]).toBe(WindTile.SOUTH);
    expect(winds[3]).toBe(WindTile.WEST);
  });

  it('dealer 2 makes player 2 East', () => {
    const winds = getSeatWinds(2);
    expect(winds[2]).toBe(WindTile.EAST);
  });
});

describe('advanceMatch — dealer rotation', () => {
  it('dealer stays on dealer win', () => {
    const match = initializeMatch(BASE_OPTIONS);
    const completedHand = finishHand(match, 'human-player');

    const advanced = advanceMatch(match, completedHand, null);

    expect(advanced.currentDealerIndex).toBe(0); // dealer stays
    expect(advanced.handNumber).toBe(2);
    expect(advanced.phase).toBe('betweenHands');
  });

  it('dealer stays on draw', () => {
    const match = initializeMatch(BASE_OPTIONS);
    const completedHand = finishHand(match, null); // no winner

    const advanced = advanceMatch(match, completedHand, null);

    expect(advanced.currentDealerIndex).toBe(0); // dealer stays on draw
    expect(advanced.handNumber).toBe(2);
  });

  it('dealer rotates on non-dealer win', () => {
    // Use full mode so the match doesn't end after initial dealer loses
    const match = initializeMatch({ ...BASE_OPTIONS, mode: 'full' });
    const completedHand = finishHand(match, 'ai_1');

    const advanced = advanceMatch(match, completedHand, null);

    expect(advanced.currentDealerIndex).toBe(1); // rotated
  });
});

describe('advanceMatch — round progression', () => {
  it('quick game ends after East round', () => {
    let match = initializeMatch(BASE_OPTIONS);

    // Simulate a full dealer cycle to end East round.
    // Round advances when dealership returns to the initial dealer.
    // Hand 1: dealer 0 loses → dealer=1, initialDealerHasRotated=true
    match = advanceMatch(match, finishHand(match, 'ai_1'), null);
    expect(match.phase).toBe('betweenHands');
    match = startNextHand(match);

    // Hand 2: dealer 1 loses → dealer=2
    match = advanceMatch(match, finishHand(match, 'ai_2'), null);
    expect(match.phase).toBe('betweenHands');
    match = startNextHand(match);

    // Hand 3: dealer 2 loses → dealer=3
    match = advanceMatch(match, finishHand(match, 'ai_3'), null);
    expect(match.phase).toBe('betweenHands');
    match = startNextHand(match);

    // Hand 4: dealer 3 loses → dealer returns to 0, East round ends
    match = advanceMatch(match, finishHand(match, 'human-player'), null);

    // Quick game = East round only, so match finishes
    expect(match.phase).toBe('finished');
  });

  it('full game progresses through rounds', () => {
    let match = initializeMatch({ ...BASE_OPTIONS, mode: 'full' });

    // Simulate a full dealer cycle to end the East round.
    // Round advances when dealership returns to the initial dealer.
    // Hand 1: dealer 0 loses → dealer=1, initialDealerHasRotated=true
    match = advanceMatch(match, finishHand(match, 'ai_1'), null);
    expect(match.phase).toBe('betweenHands');
    match = startNextHand(match);

    // Hand 2: dealer 1 loses → dealer=2
    match = advanceMatch(match, finishHand(match, 'ai_2'), null);
    expect(match.phase).toBe('betweenHands');
    match = startNextHand(match);

    // Hand 3: dealer 2 loses → dealer=3
    match = advanceMatch(match, finishHand(match, 'ai_3'), null);
    expect(match.phase).toBe('betweenHands');
    match = startNextHand(match);

    // Hand 4: dealer 3 loses → dealer returns to 0, East round ends, South begins
    match = advanceMatch(match, finishHand(match, 'human-player'), null);

    expect(match.phase).toBe('betweenHands');
    // After a full dealer cycle, round advances. Dealer is back to initial (0).
    expect(match.currentRound).toBe(WindTile.SOUTH);
    expect(match.currentDealerIndex).toBe(0);
    expect(match.handNumber).toBe(1);
  });

  it('dealer consecutive wins extend the round', () => {
    let match = initializeMatch(BASE_OPTIONS);

    // Dealer wins 3 times in a row
    for (let i = 0; i < 3; i++) {
      const hand = finishHand(match, 'human-player');
      match = advanceMatch(match, hand, null);
      expect(match.currentDealerIndex).toBe(0);
      expect(match.phase).toBe('betweenHands');
      match = startNextHand(match);
    }

    expect(match.handNumber).toBe(4);
    expect(match.currentRound).toBe(WindTile.EAST);
  });
});

describe('advanceMatch — score accumulation', () => {
  it('applies payment changes to cumulative scores', () => {
    const match = initializeMatch(BASE_OPTIONS);
    const completedHand = finishHand(match, 'human-player', true);

    const mockResult = {
      fans: [{ name: 'Test', fan: 1, description: 'test' }],
      totalFan: 1,
      basePoints: 8,
      totalPoints: 16,
      melds: [],
      pair: [],
      payment: {
        payments: [
          { fromPlayerIndex: 1, toPlayerIndex: 0, amount: 32 },
          { fromPlayerIndex: 2, toPlayerIndex: 0, amount: 32 },
          { fromPlayerIndex: 3, toPlayerIndex: 0, amount: 32 },
        ],
      },
    };

    const advanced = advanceMatch(match, completedHand, mockResult);

    expect(advanced.playerScores[0]).toBe(500 + 96); // winner gains
    expect(advanced.playerScores[1]).toBe(500 - 32);
    expect(advanced.playerScores[2]).toBe(500 - 32);
    expect(advanced.playerScores[3]).toBe(500 - 32);
  });

  it('records hand result in history', () => {
    const match = initializeMatch(BASE_OPTIONS);
    const completedHand = finishHand(match, 'ai_2');

    const advanced = advanceMatch(match, completedHand, null);

    expect(advanced.handResults).toHaveLength(1);
    expect(advanced.handResults[0].winnerId).toBe('ai_2');
    expect(advanced.handResults[0].round).toBe(WindTile.EAST);
    expect(advanced.handResults[0].dealerIndex).toBe(0);
  });
});

describe('startNextHand', () => {
  it('creates new hand with correct dealer and wind', () => {
    let match = initializeMatch({ ...BASE_OPTIONS, mode: 'full' });

    // Simulate 3 hands: advance + start next
    for (let i = 0; i < 3; i++) {
      const hand = finishHand(match, 'ai_' + (i + 1));
      match = advanceMatch(match, hand, null);
      expect(match.phase).toBe('betweenHands');
      match = startNextHand(match);
    }

    // 4th hand: dealer returns to initial, round advances to South
    match = advanceMatch(match, finishHand(match, 'human-player'), null);

    expect(match.phase).toBe('betweenHands');
    expect(match.currentRound).toBe(WindTile.SOUTH);
    expect(match.currentDealerIndex).toBe(0);
    match = startNextHand(match);

    expect(match.phase).toBe('playing');
    expect(match.currentHand).not.toBeNull();
    expect(match.currentHand!.players[0].isDealer).toBe(true);
    expect(match.currentHand!.players[0].seatWind).toBe(WindTile.EAST);
    expect(match.currentHand!.prevailingWind).toBe(WindTile.SOUTH);
  });

  it('injects cumulative scores into hand players', () => {
    let match = initializeMatch({ ...BASE_OPTIONS, mode: 'full' });

    // Advance with some score changes
    const mockResult = {
      fans: [], totalFan: 0, basePoints: 8, totalPoints: 8, melds: [], pair: [],
      payment: {
        payments: [{ fromPlayerIndex: 1, toPlayerIndex: 0, amount: 50 }],
      },
    };
    const hand1 = finishHand(match, 'ai_1');
    match = advanceMatch(match, hand1, mockResult);
    match = startNextHand(match);

    expect(match.currentHand!.players[0].score).toBe(550);
    expect(match.currentHand!.players[1].score).toBe(450);
  });
});

describe('computeFinalRankings', () => {
  it('returns players sorted by score descending', () => {
    const match = initializeMatch(BASE_OPTIONS);
    match.playerScores = [400, 600, 500, 300];

    const rankings = computeFinalRankings(match);

    expect(rankings[0].name).toBe('AI 1');
    expect(rankings[0].score).toBe(600);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[3].name).toBe('AI 3');
    expect(rankings[3].rank).toBe(4);
  });
});
