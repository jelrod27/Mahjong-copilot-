import { describe, it, expect } from 'vitest';
import { initializeGame, applyAction, GameOptions } from '@/engine/turnManager';
import { GameState, GamePhase } from '@/models/GameState';
import { Tile, TileType, WindTile } from '@/models/Tile';
import { GameAction } from '@/engine/types';
import { deriveEvents, PresentationEvent } from '../events';
import { dot, bam, char, windTile, flowerTile } from '@/engine/__tests__/testHelpers';

type EventOf<K extends PresentationEvent['kind']> = Extract<PresentationEvent, { kind: K }>;

/** Narrow a stream to one event kind, keeping that variant's fields typed. */
function ofKind<K extends PresentationEvent['kind']>(
  events: PresentationEvent[],
  kind: K,
): EventOf<K>[] {
  return events.filter((e): e is EventOf<K> => e.kind === kind);
}

const HUMAN = 'human-1';

function options(overrides: Partial<GameOptions> = {}): GameOptions {
  return {
    playerNames: ['Human', 'AI 1', 'AI 2', 'AI 3'],
    aiPlayers: [
      { index: 1, difficulty: 'easy' },
      { index: 2, difficulty: 'easy' },
      { index: 3, difficulty: 'easy' },
    ],
    humanPlayerId: HUMAN,
    minFaan: 1,
    ...overrides,
  };
}

/**
 * Put specific tiles at the front of the wall / dead wall, removing them from
 * wherever else in the walls they sit. Keeps the tiles real so draws behave
 * exactly as they would in a live hand.
 */
function stackWalls(
  state: GameState,
  fronts: { wall?: Tile[]; deadWall?: Tile[] },
): GameState {
  const ids = new Set([...(fronts.wall ?? []), ...(fronts.deadWall ?? [])].map(t => t.id));
  return {
    ...state,
    wall: [...(fronts.wall ?? []), ...state.wall.filter(t => !ids.has(t.id))],
    deadWall: [...(fronts.deadWall ?? []), ...state.deadWall.filter(t => !ids.has(t.id))],
  };
}

/** Replace a seat's hand, keeping tile ids unique across the walls. */
function withHand(state: GameState, seat: number, hand: Tile[]): GameState {
  const ids = new Set(hand.map(t => t.id));
  return {
    ...state,
    players: state.players.map((p, i) => (i === seat ? { ...p, hand } : p)),
    wall: state.wall.filter(t => !ids.has(t.id)),
    deadWall: state.deadWall.filter(t => !ids.has(t.id)),
  };
}

/** 13 tiles with no pair, no run and no winning shape — claims nothing. */
function junkHand(copy: number): Tile[] {
  return [
    dot(1, copy), dot(4, copy), dot(7, copy),
    bam(1, copy), bam(4, copy), bam(7, copy),
    char(1, copy), char(4, copy), char(7, copy),
    windTile(WindTile.EAST, copy), windTile(WindTile.SOUTH, copy),
    windTile(WindTile.WEST, copy), windTile(WindTile.NORTH, copy),
  ];
}

/** 4 pungs of dots 1–4 plus a single 5-dot: 13 tiles, one 5-dot from a win. */
function nearWinHand(): Tile[] {
  return [
    dot(1, 1), dot(1, 2), dot(1, 3),
    dot(2, 1), dot(2, 2), dot(2, 3),
    dot(3, 1), dot(3, 2), dot(3, 3),
    dot(4, 1), dot(4, 2), dot(4, 3),
    dot(5, 1),
  ];
}

function act(state: GameState, seat: number, action: GameAction): { next: GameState; events: PresentationEvent[] } {
  const next = applyAction(state, state.players[seat].id, action);
  expect(next).not.toBeNull();
  return { next: next!, events: deriveEvents(state, action, next!, 0) };
}

describe('deriveEvents — initial deal', () => {
  // deal-145 gives every seat at least one flower and one seat three of them,
  // so a single deal transition is unavoidably multi-event.
  const dealt = initializeGame(options({ seed: 'deal-145' }));

  it('the chosen seed reveals flowers on all four seats', () => {
    expect(dealt.players.map(p => p.flowers.length)).toEqual([1, 1, 3, 1]);
  });

  it('emits one deal event carrying 13 distinct tiles per seat', () => {
    const events = deriveEvents(null, { type: 'DEAL' }, dealt, 0);
    const deal = events[0];

    expect(deal.kind).toBe('deal');
    if (deal.kind !== 'deal') return;
    expect(deal.tiles).toHaveLength(52);
    expect(new Set(deal.tiles).size).toBe(52);

    // Each seat's 13 dealt tiles include every flower that seat revealed.
    dealt.players.forEach((player, seat) => {
      const seatTiles = deal.tiles.slice(seat * 13, seat * 13 + 13);
      for (const flower of player.flowers) {
        expect(seatTiles).toContain(flower.id);
      }
    });
  });

  it('reveals every flower and draws its replacement inside the one transition', () => {
    const events = deriveEvents(null, { type: 'DEAL' }, dealt, 0);
    const flowerIds = dealt.players.map(p => p.flowers.map(f => f.id));

    expect(events.map(e => e.kind)).toEqual([
      'deal',
      'flowerReveal', 'draw',                                          // seat 0: 1 flower
      'flowerReveal', 'draw',                                          // seat 1: 1 flower
      'flowerReveal', 'flowerReveal', 'flowerReveal', 'draw', 'draw', 'draw', // seat 2: 3 flowers
      'flowerReveal', 'draw',                                          // seat 3: 1 flower
      'turnChange',
    ]);

    expect(events.slice(1)).toEqual([
      { kind: 'flowerReveal', seq: 1, seat: 0, tile: flowerIds[0][0] },
      { kind: 'draw', seq: 2, seat: 0, tile: null, source: 'deadWall' },
      { kind: 'flowerReveal', seq: 3, seat: 1, tile: flowerIds[1][0] },
      { kind: 'draw', seq: 4, seat: 1, tile: null, source: 'deadWall' },
      { kind: 'flowerReveal', seq: 5, seat: 2, tile: flowerIds[2][0] },
      { kind: 'flowerReveal', seq: 6, seat: 2, tile: flowerIds[2][1] },
      { kind: 'flowerReveal', seq: 7, seat: 2, tile: flowerIds[2][2] },
      { kind: 'draw', seq: 8, seat: 2, tile: null, source: 'deadWall' },
      { kind: 'draw', seq: 9, seat: 2, tile: null, source: 'deadWall' },
      { kind: 'draw', seq: 10, seat: 2, tile: null, source: 'deadWall' },
      { kind: 'flowerReveal', seq: 11, seat: 3, tile: flowerIds[3][0] },
      { kind: 'draw', seq: 12, seat: 3, tile: null, source: 'deadWall' },
      { kind: 'turnChange', seq: 13, to: 0 },
    ]);
  });

  it('idealises the order when a deal replacement was itself a flower', () => {
    // Seed chain-1: seat 0 was dealt flower_4 and drew a plain replacement;
    // seat 1 was dealt season_1 and drew season_3 — a flower — to replace it,
    // then drew again. The engine's true order for seat 1 is
    // reveal(season_1) → draw(season_3) → reveal(season_3) → draw(plain).
    // Nothing in the dealt state records which flower arrived how, so the deal
    // is reported as if both were dealt: both reveals, then both draws.
    const chained = initializeGame(options({ seed: 'chain-1' }));
    expect(chained.players.map(p => p.flowers.map(f => f.id))).toEqual([
      ['flower_4'], ['season_1', 'season_3'], [], [],
    ]);

    const events = deriveEvents(null, { type: 'DEAL' }, chained, 0);

    expect(events.slice(1)).toEqual([
      { kind: 'flowerReveal', seq: 1, seat: 0, tile: 'flower_4' },
      { kind: 'draw', seq: 2, seat: 0, tile: null, source: 'deadWall' },
      { kind: 'flowerReveal', seq: 3, seat: 1, tile: 'season_1' },
      { kind: 'flowerReveal', seq: 4, seat: 1, tile: 'season_3' },
      { kind: 'draw', seq: 5, seat: 1, tile: null, source: 'deadWall' },
      { kind: 'draw', seq: 6, seat: 1, tile: null, source: 'deadWall' },
      { kind: 'turnChange', seq: 7, to: 0 },
    ]);

    // The approximation is confined to ordering: every flower is still
    // reported once, and every replacement the engine drew is still accounted
    // for — three draws against the three tiles the dead wall lost.
    expect(ofKind(events, 'flowerReveal')).toHaveLength(3);
    expect(ofKind(events, 'draw')).toHaveLength(14 - chained.deadWall.length);
  });

  it('reveals flowers dealer-first, matching the engine replacement order', () => {
    const eastIsSeat2 = initializeGame(options({ seed: 'deal-145', dealerIndex: 2 }));
    const events = deriveEvents(null, { type: 'DEAL' }, eastIsSeat2, 0);

    const revealSeats = ofKind(events, 'flowerReveal').map(e => e.seat);
    const seatsWithFlowers = [2, 3, 0, 1].filter(seat => eastIsSeat2.players[seat].flowers.length > 0);

    expect(Array.from(new Set(revealSeats))).toEqual(seatsWithFlowers);
    expect(events[events.length - 1]).toEqual({ kind: 'turnChange', seq: events.length - 1, to: 2 });
  });
});

describe('deriveEvents — flower loop inside one transition', () => {
  it('orders reveals and replacement draws exactly as the engine drew them', () => {
    const base = initializeGame(options({ seed: 'flower-loop' }));
    const firstFlower = flowerTile('Plum', 1);
    const secondFlower = flowerTile('Orchid', 2);
    const replacement = base.deadWall.find(t => t.type !== TileType.BONUS)!;

    const state = stackWalls(base, {
      wall: [firstFlower],
      deadWall: [secondFlower, replacement],
    });

    const { events } = act(state, 0, { type: 'DRAW' });

    expect(events).toEqual([
      { kind: 'draw', seq: 0, seat: 0, tile: firstFlower.id, source: 'wall' },
      { kind: 'flowerReveal', seq: 1, seat: 0, tile: firstFlower.id },
      { kind: 'draw', seq: 2, seat: 0, tile: secondFlower.id, source: 'deadWall' },
      { kind: 'flowerReveal', seq: 3, seat: 0, tile: secondFlower.id },
      { kind: 'draw', seq: 4, seat: 0, tile: replacement.id, source: 'deadWall' },
    ]);
  });

  it('falls back to the live wall once the dead wall is spent mid-loop', () => {
    const base = initializeGame(options({ seed: 'flower-fallback' }));
    const wallFlower = flowerTile('Plum', 1);
    const deadFlower = flowerTile('Orchid', 2);
    const replacement = base.wall.find(t => t.type !== TileType.BONUS)!;

    const stacked = stackWalls(base, {
      wall: [wallFlower, replacement],
      deadWall: [deadFlower],
    });
    // Only one tile left in the dead wall, so the second replacement has to
    // come off the live wall — the draws interleave across both piles.
    const state = { ...stacked, deadWall: stacked.deadWall.slice(0, 1) };

    const { events } = act(state, 0, { type: 'DRAW' });

    expect(events).toEqual([
      { kind: 'draw', seq: 0, seat: 0, tile: wallFlower.id, source: 'wall' },
      { kind: 'flowerReveal', seq: 1, seat: 0, tile: wallFlower.id },
      { kind: 'draw', seq: 2, seat: 0, tile: deadFlower.id, source: 'deadWall' },
      { kind: 'flowerReveal', seq: 3, seat: 0, tile: deadFlower.id },
      { kind: 'draw', seq: 4, seat: 0, tile: replacement.id, source: 'wall' },
    ]);
  });

  it('emits a plain draw when the drawn tile is not a bonus tile', () => {
    const base = initializeGame(options({ seed: 'plain-draw' }));
    const plain = base.wall.find(t => t.type !== TileType.BONUS)!;
    const state = stackWalls(base, { wall: [plain] });

    const { events } = act(state, 0, { type: 'DRAW' });

    expect(events).toEqual([
      { kind: 'draw', seq: 0, seat: 0, tile: plain.id, source: 'wall' },
    ]);
  });
});

describe('deriveEvents — kong and its replacement are one atomic transition', () => {
  const base = initializeGame(options({ seed: 'kong' }));
  const kongTiles = [dot(9, 1), dot(9, 2), dot(9, 3), dot(9, 4)];
  const kongHand = [...kongTiles, ...junkHand(2).slice(0, 9)];

  it('emits the kong meld followed by its replacement draw', () => {
    const replacement = base.deadWall.find(t => t.type !== TileType.BONUS)!;
    const state = stackWalls(
      { ...withHand(base, 0, kongHand), turnPhase: 'discard' },
      { deadWall: [replacement] },
    );

    const { events } = act(state, 0, { type: 'DECLARE_KONG', tile: dot(9, 1) });

    expect(events).toEqual([
      { kind: 'claim', seq: 0, seat: 0, claim: 'kong', tile: kongTiles[0].id, meldIndex: 0 },
      { kind: 'kongReplacement', seq: 1, seat: 0, tile: replacement.id },
    ]);
  });

  it('continues into the flower loop when the replacement is a bonus tile', () => {
    const bonus = flowerTile('Chrysanthemum', 3);
    const replacement = base.deadWall.find(t => t.type !== TileType.BONUS)!;
    const state = stackWalls(
      { ...withHand(base, 0, kongHand), turnPhase: 'discard' },
      { deadWall: [bonus, replacement] },
    );

    const { events } = act(state, 0, { type: 'DECLARE_KONG', tile: dot(9, 1) });

    expect(events).toEqual([
      { kind: 'claim', seq: 0, seat: 0, claim: 'kong', tile: kongTiles[0].id, meldIndex: 0 },
      { kind: 'kongReplacement', seq: 1, seat: 0, tile: bonus.id },
      { kind: 'flowerReveal', seq: 2, seat: 0, tile: bonus.id },
      { kind: 'draw', seq: 3, seat: 0, tile: replacement.id, source: 'deadWall' },
    ]);
  });

  it('reports a null replacement when both walls are empty', () => {
    const state = {
      ...withHand(base, 0, kongHand),
      turnPhase: 'discard' as const,
      wall: [],
      deadWall: [],
    };

    const { events } = act(state, 0, { type: 'DECLARE_KONG', tile: dot(9, 1) });

    expect(events).toEqual([
      { kind: 'claim', seq: 0, seat: 0, claim: 'kong', tile: kongTiles[0].id, meldIndex: 0 },
      { kind: 'kongReplacement', seq: 1, seat: 0, tile: null },
      { kind: 'handEnd', seq: 2, winner: null },
    ]);
  });
});

describe('deriveEvents — discards and claims', () => {
  function tableWithClaimableDiscard() {
    const base = initializeGame(options({ seed: 'claims' }));
    let state = withHand(base, 0, [dot(5, 3), ...junkHand(4).slice(0, 12)]);
    state = withHand(state, 1, [dot(5, 1), dot(5, 2), ...junkHand(1).slice(0, 11)]);
    state = withHand(state, 2, junkHand(2));
    state = withHand(state, 3, junkHand(3));
    return { ...state, turnPhase: 'discard' as const, currentPlayerIndex: 0 };
  }

  it('emits the discard and the turn moving on', () => {
    const state = tableWithClaimableDiscard();
    const { events, next } = act(state, 0, { type: 'DISCARD', tile: dot(5, 3) });

    expect(events).toEqual([
      { kind: 'discard', seq: 0, seat: 0, tile: dot(5, 3).id },
      { kind: 'turnChange', seq: 1, to: next.currentPlayerIndex },
    ]);
  });

  it('emits the meld only when the claim round resolves', () => {
    const state = tableWithClaimableDiscard();
    const discarded = act(state, 0, { type: 'DISCARD', tile: dot(5, 3) });

    // The claim itself only hands the decision to the next claimant.
    const claimed = act(discarded.next, 1, {
      type: 'CLAIM',
      claimType: 'pung',
      tilesFromHand: [dot(5, 1), dot(5, 2)],
    });
    expect(claimed.events).toEqual([{ kind: 'turnChange', seq: 0, to: 2 }]);

    const passed2 = act(claimed.next, 2, { type: 'PASS' });
    expect(passed2.events).toEqual([{ kind: 'turnChange', seq: 0, to: 3 }]);

    // The last pass resolves the round: the meld forms and the turn moves to it.
    const passed3 = act(passed2.next, 3, { type: 'PASS' });
    expect(passed3.events).toEqual([
      { kind: 'claim', seq: 0, seat: 1, claim: 'pung', tile: dot(5, 3).id, meldIndex: 0 },
      { kind: 'turnChange', seq: 1, to: 1 },
    ]);
  });
});

describe('deriveEvents — hand endings', () => {
  it('emits a win claim with no meld index, then the hand end', () => {
    const base = initializeGame(options({ seed: 'win-by-discard' }));
    let state = withHand(base, 0, [dot(5, 2), ...junkHand(4).slice(0, 12)]);
    state = withHand(state, 1, nearWinHand());
    state = withHand(state, 2, junkHand(2));
    state = withHand(state, 3, junkHand(3));
    state = { ...state, turnPhase: 'discard', currentPlayerIndex: 0 };

    const discarded = act(state, 0, { type: 'DISCARD', tile: dot(5, 2) });
    const claimed = act(discarded.next, 1, { type: 'CLAIM', claimType: 'win', tilesFromHand: [] });
    const passed2 = act(claimed.next, 2, { type: 'PASS' });
    const passed3 = act(passed2.next, 3, { type: 'PASS' });

    expect(passed3.next.phase).toBe(GamePhase.FINISHED);
    expect(passed3.events).toEqual([
      { kind: 'claim', seq: 0, seat: 1, claim: 'win', tile: dot(5, 2).id, meldIndex: -1 },
      { kind: 'handEnd', seq: 1, winner: 1, method: 'discard' },
    ]);
  });

  it('emits only the hand end for a self-drawn win', () => {
    const base = initializeGame(options({ seed: 'self-draw' }));
    const winningTile = dot(5, 2);
    const state = stackWalls(withHand(base, 0, nearWinHand()), { wall: [winningTile] });

    const drawn = act(state, 0, { type: 'DRAW' });
    expect(drawn.events).toEqual([
      { kind: 'draw', seq: 0, seat: 0, tile: winningTile.id, source: 'wall' },
    ]);

    const won = act(drawn.next, 0, { type: 'DECLARE_WIN' });
    expect(won.events).toEqual([
      { kind: 'handEnd', seq: 0, winner: 0, method: 'selfDraw' },
    ]);
  });

  it('emits a winnerless hand end when the wall runs out', () => {
    const base = initializeGame(options({ seed: 'exhaustion' }));
    const state = { ...base, wall: [] };

    const { events } = act(state, 0, { type: 'DRAW' });

    expect(events).toEqual([{ kind: 'handEnd', seq: 0, winner: null }]);
  });
});

describe('deriveEvents — sequence numbers', () => {
  it('numbers events from the caller-supplied counter', () => {
    const dealt = initializeGame(options({ seed: 'deal-145' }));
    const events = deriveEvents(null, { type: 'DEAL' }, dealt, 900);

    expect(events.map(e => e.seq)).toEqual(events.map((_, i) => 900 + i));
  });

  it('stays contiguous when a caller-held counter drives consecutive transitions', () => {
    const base = initializeGame(options({ seed: 'counter' }));
    let state = base;
    let counter = 0;
    const stream: PresentationEvent[] = [];

    const run = (seat: number, action: GameAction) => {
      const next = applyAction(state, state.players[seat].id, action)!;
      const events = deriveEvents(state, action, next, counter);
      counter += events.length;
      stream.push(...events);
      state = next;
    };

    run(0, { type: 'DRAW' });
    run(0, { type: 'DISCARD', tile: state.players[0].hand[0] });

    expect(stream.length).toBeGreaterThan(1);
    expect(stream.map(e => e.seq)).toEqual(stream.map((_, i) => i));
  });
});

describe('deriveEvents — invariants across a full AI hand', () => {
  /**
   * Cross-checks every derived transition against the raw state delta: the
   * tiles that actually left the walls, the flowers that actually appeared,
   * the melds that actually formed. Catches ordering or attribution drift that
   * a hand-written golden would miss.
   */
  function checkTransition(previous: GameState, next: GameState, events: PresentationEvent[]) {
    // Deliberately not the prefix-slice the module uses: a tile counts as
    // drawn if it left the walls as a set and arrived in the drawing seat's
    // hand or flower rack. A wrong slice formula cannot hide behind itself.
    const inWallsBefore = new Set([...previous.wall, ...previous.deadWall].map(t => t.id));
    const inWallsAfter = new Set([...next.wall, ...next.deadWall].map(t => t.id));

    const draws = [...ofKind(events, 'draw'), ...ofKind(events, 'kongReplacement')];
    expect(draws.filter(e => e.tile !== null)).toHaveLength(inWallsBefore.size - inWallsAfter.size);
    for (const draw of draws) {
      if (draw.tile === null) continue;
      expect(inWallsBefore.has(draw.tile)).toBe(true);
      expect(inWallsAfter.has(draw.tile)).toBe(false);
      const seatTiles = [...next.players[draw.seat].hand, ...next.players[draw.seat].flowers];
      expect(seatTiles.map(t => t.id)).toContain(draw.tile);
    }

    const revealed = ofKind(events, 'flowerReveal').map(e => e.tile);
    const flowersGained = previous.players.flatMap((p, i) =>
      next.players[i].flowers.slice(p.flowers.length).map(t => t.id),
    );
    expect(revealed).toEqual(flowersGained);

    const discardsGained = previous.players.flatMap(p => {
      const before = previous.playerDiscards[p.id]?.length ?? 0;
      return (next.playerDiscards[p.id] ?? []).slice(before).map(t => t.id);
    });
    expect(ofKind(events, 'discard').map(e => e.tile)).toEqual(discardsGained);

    const meldsChanged = previous.players.filter((p, i) => {
      const after = next.players[i].melds;
      return after.length !== p.melds.length
        || p.melds.some((m, mi) => after[mi].tiles.length !== m.tiles.length);
    }).length;
    const meldClaims = ofKind(events, 'claim').filter(e => e.meldIndex >= 0);
    expect(meldClaims).toHaveLength(meldsChanged);

    const ended = next.phase === GamePhase.FINISHED;
    expect(events.some(e => e.kind === 'handEnd')).toBe(ended);
    const turnMoved = next.currentPlayerIndex !== previous.currentPlayerIndex && !ended;
    expect(events.some(e => e.kind === 'turnChange')).toBe(turnMoved);
  }

  it('holds for every transition of a full engine-driven hand', async () => {
    const { getAIDecision, getAIClaimDecision } = await import('@/engine/ai');
    const { getLegalClaims } = await import('@/engine/turnManager');

    for (const seed of ['sweep-1', 'sweep-2', 'sweep-3']) {
      let state = initializeGame(
        options({
          seed,
          aiPlayers: [
            { index: 0, difficulty: 'easy' },
            { index: 1, difficulty: 'medium' },
            { index: 2, difficulty: 'hard' },
            { index: 3, difficulty: 'medium' },
          ],
        }),
      );

      let counter = 0;
      const dealEvents = deriveEvents(null, { type: 'DEAL' }, state, counter);
      counter += dealEvents.length;
      expect(dealEvents[0].kind).toBe('deal');

      let steps = 0;
      while (state.phase === GamePhase.PLAYING && steps < 2000) {
        steps++;
        const seat = state.currentPlayerIndex;
        const player = state.players[seat];

        let action: GameAction;
        if (state.turnPhase === 'draw') {
          action = { type: 'DRAW' };
        } else if (state.turnPhase === 'discard') {
          action = getAIDecision(state, seat).action;
        } else {
          const claims = getLegalClaims(state, seat);
          action = claims.length > 0
            ? getAIClaimDecision(state, seat, claims).action
            : { type: 'PASS' };
        }

        let next = applyAction(state, player.id, action);
        if (!next) {
          action = { type: 'PASS' };
          next = applyAction(state, player.id, action);
        }
        expect(next).not.toBeNull();

        const events = deriveEvents(state, action, next!, counter);
        expect(events.map(e => e.seq)).toEqual(events.map((_, i) => counter + i));
        counter += events.length;
        checkTransition(state, next!, events);
        state = next!;
      }

      expect(state.phase).toBe(GamePhase.FINISHED);
    }
  });
});
