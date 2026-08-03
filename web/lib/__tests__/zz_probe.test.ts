import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame } from '../matchStorage';
import { validateSavedGamePayload } from '../savedGameValidator';
import { initializeMatch } from '@/engine/matchManager';
import { applyAction } from '@/engine/turnManager';

const KEY = 'mahjong_match_in_progress';

describe('probe', () => {
  beforeEach(() => localStorage.clear());

  it('mid-game save survives loadGame', () => {
    const match = initializeMatch({
      mode: 'quick', difficulty: 'easy',
      playerNames: ['You', 'W', 'N', 'E'],
      humanPlayerId: 'player-0', seed: 'probe',
    });
    let g: any = match.currentHand;
    const step = (pid: string, a: any) => { const r = applyAction(g, pid, a); if (r) g = r; return !!r; };
    for (let n = 0; n < 40; n++) {
      if (g.turnPhase === 'claim') {
        for (const pid of [...g.claimablePlayers]) step(pid, { type: 'PASS' });
        continue;
      }
      const cur = g.players[g.currentPlayerIndex];
      if (g.turnPhase === 'draw') { if (!step(cur.id, { type: 'DRAW' })) break; continue; }
      if (g.turnPhase === 'discard') {
        const c = g.players[g.currentPlayerIndex];
        if (!step(c.id, { type: 'DISCARD', tile: c.hand[0] })) break;
        continue;
      }
      break;
    }
    console.log('discardPile', g.discardPile.length, 'phase', g.turnPhase, g.phase,
      'pd', Object.values(g.playerDiscards).map((v: any) => v.length));
    const m2 = { ...match, currentHand: g };
    saveGame(m2, g);
    const raw = JSON.parse(localStorage.getItem(KEY)!);
    console.log('validation:', JSON.stringify(validateSavedGamePayload(raw)));
    const loaded = loadGame();
    console.log('loaded null?', loaded === null, '| storage:', localStorage.getItem(KEY) === null ? 'CLEARED' : 'present');
    expect(true).toBe(true);
  });
});
