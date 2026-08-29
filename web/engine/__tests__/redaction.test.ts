import { describe, it, expect } from 'vitest';
import { initializeGame, applyAction, GameOptions } from '../turnManager';
import { redactFor, assertAuthoritative } from '../redaction';
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
    let next: GameState | null;
    if (live.turnPhase === 'draw') {
      next = applyAction(live, player.id, { type: 'DRAW' });
    } else if (live.turnPhase === 'discard') {
      next = applyAction(live, player.id, getAIDecision(live, seat).action);
    } else {
      // Claim window: answer for whoever still owes one.
      const claimantId = live.claimablePlayers.find(
        id => !live.passedPlayers.includes(id) &&
              !live.pendingClaims.some(c => c.playerId === id),
      );
      if (!claimantId) break;
      next = applyAction(live, claimantId, { type: 'PASS' });
    }
    // Never swallow a rejection: a driver that silently stops advancing would
    // leave every assertion below testing the deal state instead.
    expect(next, `turn ${i} (${live.turnPhase}) was rejected`).not.toBeNull();
    live = next!;
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
    // The live wall is only 78 at the deal (144 - 52 dealt - 14 dead wall), so
    // comparing against the dealt state is the only assertion that proves the
    // driver advanced. A fixed bound above 78 would pass on the deal itself.
    const dealt = initializeGame(options('redact-alpha'));
    expect(mid.phase).toBe(GamePhase.PLAYING);
    expect(mid.wall.length).toBeLessThan(dealt.wall.length);
    expect(mid.turnHistory.length).toBeGreaterThan(5);
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

describe('redaction — leaks the review caught', () => {
  const base = initializeGame(options('redact-leaks'));

  it('does not name which rivals hold a legal claim on the discard', () => {
    // `claimablePlayers` comes from `getAllClaims`, so membership *is* a
    // statement about a rival's concealed hand: "seat 2 holds a pair of this
    // tile". `passedPlayers` is a subset, so it says the same thing one beat
    // later. Neither may cross the wire.
    const window: GameState = {
      ...base,
      turnPhase: 'claim',
      claimablePlayers: [base.players[0].id, base.players[2].id],
      passedPlayers: [base.players[2].id],
    };

    const view = redactFor(window, 0);
    // The viewer keeps their own membership — `canPlayerClaim` tests it, and
    // the UI asks "have I already acted?".
    expect(view.claimablePlayers).toEqual([base.players[0].id]);
    // Seat 2's eligibility, and its decision to decline, are both gone.
    expect(view.passedPlayers).toEqual([]);

    // A seat with no claim of its own learns nothing at all.
    const rival = redactFor(window, 1);
    expect(rival.claimablePlayers).toEqual([]);
    expect(rival.passedPlayers).toEqual([]);

    // Seat 2 still sees its own pass, so its client can render "you passed".
    expect(redactFor(window, 2).passedPlayers).toEqual([base.players[2].id]);
  });

  it('does not hand the next drawer the tile the previous player drew', () => {
    // handleDiscard leaves lastDrawnTile set, and during a claim window
    // currentPlayerIndex names the seat that draws next, not the drawer. Keying
    // on the turn would leak a tile still concealed in seat 1's hand.
    const held = base.players[1].hand[0];
    const claiming: GameState = {
      ...base,
      turnPhase: 'claim',
      currentPlayerIndex: 2,
      lastDrawnTile: held,
      lastDiscardedBy: base.players[1].id,
      claimablePlayers: [base.players[2].id],
    };

    expect(redactFor(claiming, 2).lastDrawnTile).toBeUndefined();
    expect(redactFor(claiming, 3).lastDrawnTile).toBeUndefined();
    // Its owner still sees it.
    expect(redactFor(claiming, 1).lastDrawnTile).toEqual(held);
  });

  it('hides a concealed kong from everyone but its owner', () => {
    const kongTiles = base.players[1].hand.slice(0, 4);
    const withKong: GameState = {
      ...base,
      players: base.players.map((p, i) =>
        i === 1
          ? {
              ...p,
              melds: [
                { tiles: kongTiles, type: 'kong' as const, isConcealed: true },
                { tiles: base.players[1].hand.slice(4, 7), type: 'pung' as const, isConcealed: false },
              ],
            }
          : p,
      ),
    };

    const rival = redactFor(withKong, 0).players[1];
    // The table knows a kong was declared, not which tile it was made of.
    expect(rival.melds[0].type).toBe('kong');
    expect(rival.melds[0].isConcealed).toBe(true);
    expect(rival.melds[0].tiles).toHaveLength(4);
    expect(rival.melds[0].tiles.every(isHiddenTile)).toBe(true);
    // An exposed meld is genuinely public and passes through.
    expect(rival.melds[1].tiles).toEqual(withKong.players[1].melds[1].tiles);
    // Its owner still sees their own kong.
    expect(redactFor(withKong, 1).players[1].melds[0].tiles).toEqual(kongTiles);
  });

  it('refuses a seat it cannot resolve rather than hiding everything', () => {
    expect(() => redactFor(base, 4)).toThrow(/no seat 4/);
    expect(() => redactFor(base, -1)).toThrow(/no seat -1/);
  });

  it('never hands back the engine\'s own state object', () => {
    expect(redactFor(base, 0)).not.toBe(base);
    const finished: GameState = { ...base, phase: GamePhase.FINISHED };
    expect(redactFor(finished, 0)).not.toBe(finished);
  });

  it('lets authoritative code refuse a redacted view', () => {
    expect(() => assertAuthoritative(base)).not.toThrow();
    expect(() => assertAuthoritative(redactFor(base, 0))).toThrow(/redacted view/);
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
