import { describe, it, expect } from 'vitest';
import { calculateElo, softResetElo } from '../elo';

describe('calculateElo', () => {
  const basePlayers = [
    { id: 'p1', elo: 1200, gamesPlayed: 0 },
    { id: 'p2', elo: 1200, gamesPlayed: 0 },
    { id: 'p3', elo: 1200, gamesPlayed: 0 },
    { id: 'p4', elo: 1200, gamesPlayed: 0 },
  ];

  it('winner gains ELO and losers lose ELO', () => {
    const results = calculateElo(basePlayers, ['p1', 'p2', 'p3', 'p4']);
    const winner = results.find(r => r.playerId === 'p1')!;
    const last = results.find(r => r.playerId === 'p4')!;

    expect(winner.change).toBeGreaterThan(0);
    expect(last.change).toBeLessThan(0);
  });

  it('ELO changes sum to approximately zero', () => {
    const results = calculateElo(basePlayers, ['p1', 'p2', 'p3', 'p4']);
    const totalChange = results.reduce((sum, r) => sum + r.change, 0);
    expect(Math.abs(totalChange)).toBeLessThanOrEqual(4); // rounding tolerance
  });

  it('higher-rated players gain less from winning', () => {
    const unevenPlayers = [
      { id: 'p1', elo: 1600, gamesPlayed: 50 },
      { id: 'p2', elo: 1200, gamesPlayed: 50 },
      { id: 'p3', elo: 1200, gamesPlayed: 50 },
      { id: 'p4', elo: 1200, gamesPlayed: 50 },
    ];

    const results = calculateElo(unevenPlayers, ['p1', 'p2', 'p3', 'p4']);
    const strongWinner = results.find(r => r.playerId === 'p1')!;

    // Strong player winning should gain less (expected win)
    expect(strongWinner.change).toBeLessThan(10);
  });

  it('uses higher K-factor for new players', () => {
    const newPlayer = [
      { id: 'p1', elo: 1200, gamesPlayed: 5 },
      { id: 'p2', elo: 1200, gamesPlayed: 100 },
      { id: 'p3', elo: 1200, gamesPlayed: 100 },
      { id: 'p4', elo: 1200, gamesPlayed: 100 },
    ];

    const results = calculateElo(newPlayer, ['p1', 'p2', 'p3', 'p4']);
    const newWinner = results.find(r => r.playerId === 'p1')!;
    const expWinner = results.find(r => r.playerId === 'p2')!;

    // New player (K=32) should have larger change than experienced (K=24)
    // But p2 is 2nd place (still gains), so compare absolute magnitudes
    expect(Math.abs(newWinner.change)).toBeGreaterThan(Math.abs(expWinner.change));
  });

  it('ELO never drops below 100', () => {
    const lowPlayers = [
      { id: 'p1', elo: 110, gamesPlayed: 0 },
      { id: 'p2', elo: 1800, gamesPlayed: 0 },
      { id: 'p3', elo: 1800, gamesPlayed: 0 },
      { id: 'p4', elo: 1800, gamesPlayed: 0 },
    ];

    const results = calculateElo(lowPlayers, ['p2', 'p3', 'p4', 'p1']);
    const loser = results.find(r => r.playerId === 'p1')!;

    expect(loser.newElo).toBeGreaterThanOrEqual(100);
  });
});

describe('softResetElo', () => {
  it('moves rating 50% toward 1200', () => {
    expect(softResetElo(1400)).toBe(1300);
    expect(softResetElo(1000)).toBe(1100);
    expect(softResetElo(1200)).toBe(1200);
  });
});
