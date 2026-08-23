import { describe, it, expect } from 'vitest';
import { initializeGame, applyAction, GameOptions } from '../turnManager';
import { redactFor } from '../redaction';
import { getAIDecision } from '../ai';
import { GameState, GamePhase, gameStateToJson } from '@/models/GameState';
import { TileFactory, HIDDEN_TILE_ID_PREFIX, isHiddenTile } from '@/models/Tile';

const options = (seed: string): GameOptions => ({
  playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
  aiPlayers: [
    { index: 1, difficulty: 'easy' },
    { index: 2, difficulty: 'easy' },
    { index: 3, difficulty: 'easy' },
  ],
  humanPlayerId: 'human-1',
  seed,
});

/**
 * Drive a hand a little way in so the state under test has a partly-consumed
 * wall, some discards and some melds — a redaction bug is far likelier to hide
 * in mid-hand state than at the deal.
 */
function playSomeTurns(state: GameState, turns: number): GameState {
  let live = state;
  for (let i = 0; i < turns && live.phase === GamePhase.PLAYING; i++) {
    const seat = live.currentPlayerIndex;
    const player = live.players[seat];
    if (live.turnPhase === 'draw') {
      live = applyAction(live, player.id, { type: 'DRAW' }) ?? live;
    } else if (live.turnPhase === 'discard') {
      live = applyAction(live, player.id, getAIDecision(live, seat).action) ?? live;
    } else {
      // Claim window: answer for whoever still owes one.
      const claimantId = live.claimablePlayers.find(
        id => !live.passedPlayers.includes(id) &&
              !live.pendingClaims.some(c => c.playerId === id),
      );
      if (!claimantId) break;
      live = applyAction(live, claimantId, { type: 'PASS' }) ?? live;
    }
  }
  return live;
}

/** Every string anywhere in a serialised view, however deeply nested. */
function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => allStrings(v, out));
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(v => allStrings(v, out));
  }
  return out;
}

describe('redaction — the placeholder identity', () => {
  it('no real tile can be mistaken for a hidden one', () => {
    const collisions = TileFactory.getAllTiles()
      .filter(t => t.id.startsWith(HIDDEN_TILE_ID_PREFIX));
    expect(collisions).toEqual([]);
  });
});

describe('redaction — what a seat may not know', () => {
  const mid = playSomeTurns(initializeGame(options('redact-alpha')), 40);
  const view = redactFor(mid, 0);

  it('the state under test is genuinely mid-hand', () => {
    expect(mid.phase).toBe(GamePhase.PLAYING);
    expect(mid.wall.length).toBeLessThan(84);
    expect(mid.discardPile.length).toBeGreaterThan(0);
  });

  it('leaks no opponent, wall or dead-wall tile anywhere in the serialised view', () => {
    // The test that matters: it walks the whole payload rather than the fields
    // redaction happens to know about, so a leak through some field nobody
    // enumerated still fails here.
    const secrets = new Set<string>([
      ...mid.players.slice(1).flatMap(p => p.hand.map(t => t.id)),
      ...mid.wall.map(t => t.id),
      ...mid.deadWall.map(t => t.id),
    ]);
    expect(secrets.size).toBeGreaterThan(50);

    const leaked = allStrings(gameStateToJson(view)).filter(s => secrets.has(s));
    expect(leaked).toEqual([]);
  });

  it('leaks neither the seed nor the id that embeds it', () => {
    const seed = mid.seed!;
    expect(seed).toBeTruthy();
    expect(view.seed).toBeUndefined();
    expect(view.id).not.toContain(seed);
    expect(allStrings(gameStateToJson(view)).filter(s => s.includes(seed))).toEqual([]);
  });

  it('hides what another seat drew', () => {
    const drawn = playSomeTurns(initializeGame(options('redact-draw')), 1);
    expect(drawn.lastDrawnTile).toBeDefined();
    // Seat 0 dealt first, so drive to a seat that is not the viewer.
    const other = drawn.currentPlayerIndex === 0 ? 1 : 0;
    expect(redactFor(drawn, other).lastDrawnTile).toBeUndefined();
    expect(redactFor(drawn, drawn.currentPlayerIndex).lastDrawnTile)
      .toEqual(drawn.lastDrawnTile);
  });

  it('replaces every opponent tile with a hidden placeholder', () => {
    for (const seat of [1, 2, 3]) {
      expect(view.players[seat].hand.every(isHiddenTile)).toBe(true);
    }
    expect(view.wall.every(isHiddenTile)).toBe(true);
    expect(view.deadWall.every(isHiddenTile)).toBe(true);
  });

  it('gives placeholders stable, distinct keys', () => {
    const ids = view.wall.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Same input, same output — React keys must not thrash between renders.
    expect(redactFor(mid, 0).wall.map(t => t.id)).toEqual(ids);
  });
});

describe('redaction — what a seat may know', () => {
  const mid = playSomeTurns(initializeGame(options('redact-bravo')), 40);
  const view = redactFor(mid, 0);

  it('preserves every public count', () => {
    expect(view.wall).toHaveLength(mid.wall.length);
    expect(view.deadWall).toHaveLength(mid.deadWall.length);
    mid.players.forEach((p, i) => {
      expect(view.players[i].hand).toHaveLength(p.hand.length);
    });
  });

  it('leaves the viewer their own hand, tile for tile', () => {
    expect(view.players[0].hand).toEqual(mid.players[0].hand);
  });

  it('leaves public state untouched', () => {
    expect(view.discardPile).toEqual(mid.discardPile);
    expect(view.playerDiscards).toEqual(mid.playerDiscards);
    expect(view.turnHistory).toEqual(mid.turnHistory);
    expect(view.turnPhase).toBe(mid.turnPhase);
    expect(view.currentPlayerIndex).toBe(mid.currentPlayerIndex);
    expect(view.claimablePlayers).toEqual(mid.claimablePlayers);
    expect(view.passedPlayers).toEqual(mid.passedPlayers);
    mid.players.forEach((p, i) => {
      expect(view.players[i].melds).toEqual(p.melds);
      expect(view.players[i].flowers).toEqual(p.flowers);
      expect(view.players[i].score).toBe(p.score);
      expect(view.players[i].seatWind).toBe(p.seatWind);
    });
  });
});

describe('redaction — claims and endings', () => {
  const base = initializeGame(options('redact-claims'));

  it('hides the tiles a rival commits but keeps the viewer their own', () => {
    const withClaims: GameState = {
      ...base,
      turnPhase: 'claim',
      pendingClaims: [
        { playerId: base.players[0].id, claimType: 'pung', tiles: base.players[0].hand.slice(0, 2) },
        { playerId: base.players[1].id, claimType: 'pung', tiles: base.players[1].hand.slice(0, 2) },
      ],
    };
    const view = redactFor(withClaims, 0);

    expect(view.pendingClaims[0].tiles).toEqual(withClaims.pendingClaims[0].tiles);
    expect(view.pendingClaims[1].tiles).toEqual([]);
    // The claim itself stays public — everyone at a table hears "pung".
    expect(view.pendingClaims.map(c => c.claimType)).toEqual(['pung', 'pung']);
    expect(view.pendingClaims.map(c => c.playerId))
      .toEqual(withClaims.pendingClaims.map(c => c.playerId));
  });

  it('returns a finished hand whole, seed included, so the deal can be audited', () => {
    const finished: GameState = { ...base, phase: GamePhase.FINISHED };
    const view = redactFor(finished, 1);

    expect(view.seed).toBe(finished.seed);
    expect(view.wall).toEqual(finished.wall);
    expect(view.players[0].hand).toEqual(finished.players[0].hand);
  });
});

describe('redaction — purity', () => {
  it('does not mutate the state it was given', () => {
    const mid = playSomeTurns(initializeGame(options('redact-purity')), 30);
    const before = JSON.parse(JSON.stringify(gameStateToJson(mid)));
    redactFor(mid, 0);
    expect(JSON.parse(JSON.stringify(gameStateToJson(mid)))).toEqual(before);
  });
});
