/**
 * ELO rating calculation for 4-player Mahjong.
 * Pairwise: winner gains against each of the 3 losers.
 * Pure functions — no dependencies.
 */

export interface EloPlayer {
  id: string;
  elo: number;
  gamesPlayed: number;
}

export interface EloResult {
  playerId: string;
  oldElo: number;
  newElo: number;
  change: number;
}

/**
 * Calculate K-factor based on games played.
 * K=32 for first 30 games (volatile), K=24 after (stable).
 */
function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < 30 ? 32 : 24;
}

/**
 * Expected score of player A against player B.
 */
function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculate ELO changes for a 4-player game.
 *
 * @param players - Array of 4 players with their current ELO
 * @param placements - Array of player IDs in order of placement [1st, 2nd, 3rd, 4th]
 * @returns Array of ELO results for each player
 */
export function calculateElo(
  players: EloPlayer[],
  placements: string[],
): EloResult[] {
  // Validate that every player appears in placements
  if (players.length !== placements.length) {
    return [];
  }
  for (const p of players) {
    if (!placements.includes(p.id)) {
      throw new Error(`Player ${p.id} missing from placements`);
    }
  }

  const results: EloResult[] = [];

  for (const player of players) {
    const K = getKFactor(player.gamesPlayed);
    const placement = placements.indexOf(player.id);
    let totalChange = 0;

    // Pairwise comparison against each other player
    for (const opponent of players) {
      if (opponent.id === player.id) continue;

      const expected = expectedScore(player.elo, opponent.elo);
      const opponentPlacement = placements.indexOf(opponent.id);

      // Actual score: 1 if beat opponent, 0.5 if tie, 0 if lost
      let actual: number;
      if (placement < opponentPlacement) {
        actual = 1; // Won against this opponent
      } else if (placement > opponentPlacement) {
        actual = 0; // Lost against this opponent
      } else {
        actual = 0.5; // Tie
      }

      // Each pairwise comparison weighted by 1/3 (3 opponents)
      totalChange += (K / 3) * (actual - expected);
    }

    const newElo = Math.max(100, Math.round(player.elo + totalChange));

    results.push({
      playerId: player.id,
      oldElo: player.elo,
      newElo,
      change: newElo - player.elo,
    });
  }

  return results;
}

/**
 * Soft reset ELO toward 1200 for seasonal resets.
 * Moves rating 50% toward 1200.
 */
export function softResetElo(currentElo: number): number {
  return Math.round(currentElo + (1200 - currentElo) * 0.5);
}
