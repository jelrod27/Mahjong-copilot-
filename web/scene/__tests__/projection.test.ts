import { describe, it, expect } from 'vitest';
import { projectScene } from '../projection';
import {
  DEAD_WALL_SLOTS,
  DISCARD_COLUMNS,
  DISCARD_COLUMN_PITCH,
  DISCARD_ROW_PITCH,
  DISCARD_START_Z,
  HAND_Z,
  MELD_Z,
  PITCH_FACE_DOWN,
  PITCH_FACE_UP,
  PITCH_UPRIGHT,
  TILE_DEPTH,
  TILE_HEIGHT,
  seatAngle,
} from '../layout';
import type { SceneModel, SceneProjectionInput, SceneTile, SeatId } from '../types';
import { GamePhase } from '@/models/GameState';
import type { GameState } from '@/models/GameState';
import { TileSuit, WindTile } from '@/models/Tile';
import { getTilePalette, getTableFelt, getRoster } from '@/lib/cosmetics';
import {
  VIEWER_ID,
  claimWindowGame,
  dealtGame,
  emptyWallGame,
  finishedGame,
  midHandGame,
} from './fixtures';

function project(
  game: GameState,
  overrides: Partial<SceneProjectionInput> = {},
  previous?: SceneModel | null,
): SceneModel {
  return projectScene(
    {
      game,
      viewerId: VIEWER_ID,
      cosmetics: {},
      ...overrides,
    },
    previous,
  );
}

const tilesIn = (scene: SceneModel, kind: SceneTile['slot']['kind'], seat?: SeatId) =>
  scene.tiles.filter(t => t.slot.kind === kind && (seat === undefined || t.slot.seat === seat));

/** Every fixture the property tests sweep. */
const ALL_FIXTURES: [name: string, game: GameState][] = [
  ['mid hand', midHandGame()],
  ['real deal', dealtGame()],
  ['claim window', claimWindowGame()],
  ['finished hand', finishedGame()],
  ['empty wall', emptyWallGame()],
];

/* ── Golden projections ─────────────────────────────────────────────────── */

describe('golden projection of a hand in progress', () => {
  const scene = project(midHandGame());

  it('projects every slot kind', () => {
    const kinds = new Set(scene.tiles.map(t => t.slot.kind));
    expect([...kinds].sort()).toEqual(['discard', 'flower', 'hand', 'meld', 'wall']);
  });

  it('projects every tile the state holds, and no more', () => {
    const game = midHandGame();
    const handTiles = game.players.reduce((n, p) => n + p.hand.length, 0);
    const meldTiles = game.players.reduce(
      (n, p) => n + p.melds.reduce((m, meld) => m + meld.tiles.length, 0), 0);
    const flowerTiles = game.players.reduce((n, p) => n + p.flowers.length, 0);
    const discardTiles = Object.values(game.playerDiscards).reduce((n, d) => n + d.length, 0);
    const wallTiles = game.wall.length + game.deadWall.length;

    expect(scene.tiles).toHaveLength(
      handTiles + meldTiles + flowerTiles + discardTiles + wallTiles,
    );
  });

  it('reports the wall as two counts a player can read', () => {
    expect(scene.wall).toEqual({ liveCount: 40, deadCount: 14 });
  });

  it('reports the phase and whose turn it is, seat-relative', () => {
    expect(scene.phase).toEqual({
      game: GamePhase.PLAYING,
      turn: 'discard',
      activeSeat: 0,
    });
  });

  it('lays the viewer\'s hand out as a centred upright row in front of them', () => {
    const hand = tilesIn(scene, 'hand', 0);
    expect(hand).toHaveLength(5);
    expect(hand.every(t => t.transform.pitch === PITCH_UPRIGHT)).toBe(true);
    expect(hand.every(t => t.transform.position.z === HAND_Z)).toBe(true);
    expect(hand.every(t => t.transform.position.y === TILE_HEIGHT / 2)).toBe(true);
    expect(hand.map(t => t.transform.position.x)).toEqual(
      [...hand.map(t => t.transform.position.x)].sort((a, b) => a - b),
    );
    expect(hand[2].transform.position.x).toBeCloseTo(0);
  });

  it('lays a discard pool out in rows of seven, growing away from its seat', () => {
    const discards = tilesIn(scene, 'discard', 1);
    expect(discards).toHaveLength(9);

    const first = discards[0].transform.position;
    const eighth = discards[7].transform.position;
    // Seat 1 sits to the viewer's right, so its pool runs along +x.
    expect(first.x).toBeCloseTo(DISCARD_START_Z);
    expect(eighth.x).toBeCloseTo(DISCARD_START_Z + DISCARD_ROW_PITCH);
    expect(discards[0].slot.index).toBe(0);
    expect(discards.every(t => t.transform.pitch === PITCH_FACE_UP)).toBe(true);
    expect(discards.every(t => t.transform.position.y === TILE_DEPTH / 2)).toBe(true);
  });

  it('wraps a discard pool onto the next row after seven tiles', () => {
    const discards = tilesIn(scene, 'discard', 1);
    const first = discards[0].transform.position;
    const seventh = discards[6].transform.position;
    const eighth = discards[7].transform.position;

    // Seven tiles span the block's full width…
    expect(Math.abs(seventh.z - first.z))
      .toBeCloseTo((DISCARD_COLUMNS - 1) * DISCARD_COLUMN_PITCH);
    // …then the eighth restarts the row, one row further from the centre.
    expect(eighth.z).toBeCloseTo(first.z);
    expect(Math.abs(eighth.x - first.x)).toBeCloseTo(DISCARD_ROW_PITCH);
  });

  it('lays exposed melds out face-up in front of their owner', () => {
    const melds = tilesIn(scene, 'meld', 1);
    expect(melds).toHaveLength(3);
    expect(melds.every(t => t.slot.meldIndex === 0)).toBe(true);
    expect(melds.map(t => t.slot.index)).toEqual([0, 1, 2]);
    expect(melds.every(t => t.transform.pitch === PITCH_FACE_UP)).toBe(true);
    expect(melds.every(t => t.transform.position.x === MELD_Z)).toBe(true);
  });

  it('turns the outer tiles of a concealed kong face down, as the table does', () => {
    const kong = tilesIn(scene, 'meld', 2);
    expect(kong.map(t => t.face === null)).toEqual([true, false, false, true]);
    expect(kong.map(t => t.transform.pitch)).toEqual([
      PITCH_FACE_DOWN, PITCH_FACE_UP, PITCH_FACE_UP, PITCH_FACE_DOWN,
    ]);
  });

  it('keeps a concealed kong\'s engine ids, because a declared kong is public', () => {
    const kong = tilesIn(scene, 'meld', 2);
    expect(kong.map(t => t.id)).toEqual([
      'character_7_1', 'character_7_2', 'character_7_3', 'character_7_4',
    ]);
  });

  it('sets bonus tiles aside face-up beyond the melds', () => {
    const flowers = tilesIn(scene, 'flower', 2);
    expect(flowers).toHaveLength(2);
    expect(flowers.every(t => t.transform.pitch === PITCH_FACE_UP)).toBe(true);
    expect(flowers.every(t => t.face?.suit === TileSuit.FLOWER)).toBe(true);
  });

  it('gives the dead wall its own region of the ring', () => {
    const wall = tilesIn(scene, 'wall');
    const deadSlots = wall.filter(t => t.slot.index < DEAD_WALL_SLOTS);
    const liveSlots = wall.filter(t => t.slot.index >= DEAD_WALL_SLOTS);
    expect(deadSlots).toHaveLength(14);
    expect(liveSlots).toHaveLength(40);
  });

  it('draws a replacement from the dead wall, not from the live end', () => {
    // A kong or flower takes deadWall[0]; the live wall is untouched, so no
    // live tile may move and the tile that leaves must be a dead-wall slot.
    const before = project(midHandGame());
    const afterReplacement = midHandGame();
    afterReplacement.deadWall = afterReplacement.deadWall.slice(1);
    const after = project(afterReplacement, {}, before);

    const wallIds = (s: SceneModel) =>
      new Set(s.tiles.filter(t => t.slot.kind === 'wall').map(t => t.id));
    const gone = [...wallIds(before)].filter(id => !wallIds(after).has(id));

    expect(gone).toEqual([`wall:${DEAD_WALL_SLOTS - 1}`]);

    // Every live-wall tile keeps its exact transform.
    const byId = new Map(after.tiles.map(t => [t.id, t]));
    for (const tile of before.tiles.filter(
      t => t.slot.kind === 'wall' && t.slot.index >= DEAD_WALL_SLOTS,
    )) {
      expect(byId.get(tile.id)?.transform).toEqual(tile.transform);
    }
  });

  it('lays the wall face-down as a ring stacked two high', () => {
    const wall = tilesIn(scene, 'wall');
    expect(wall).toHaveLength(54);
    expect(wall.every(t => t.face === null)).toBe(true);
    expect(wall.every(t => t.transform.pitch === PITCH_FACE_DOWN)).toBe(true);

    const levels = new Set(wall.map(t => t.transform.position.y));
    expect(levels.size).toBe(2);
  });

  it('describes a face by its canonical identity and its suit', () => {
    const hand = tilesIn(scene, 'hand', 0);
    expect(hand[0].face).toEqual({ key: 'dot_1', suit: TileSuit.DOT });
  });

  it('projects an empty wall without inventing tiles', () => {
    const empty = project(emptyWallGame());
    expect(tilesIn(empty, 'wall')).toHaveLength(0);
    expect(empty.wall).toEqual({ liveCount: 0, deadCount: 0 });
  });

  it('projects a finished hand', () => {
    const scene = project(finishedGame());
    expect(scene.phase.game).toBe(GamePhase.FINISHED);
    expect(scene.tiles.length).toBeGreaterThan(0);
  });
});

/* ── Seats ──────────────────────────────────────────────────────────────── */

describe('seats are viewer-relative', () => {
  it('always puts the viewer at seat 0', () => {
    for (const [, game] of ALL_FIXTURES) {
      for (const player of game.players) {
        const scene = projectScene({ game, viewerId: player.id, cosmetics: {} });
        expect(scene.seats[0].playerId).toBe(player.id);
        expect(scene.seats[0].isViewer).toBe(true);
        expect(scene.seats[0].id).toBe(0);
      }
    }
  });

  it('orders seats by id, one quarter turn apart', () => {
    const scene = project(midHandGame());
    expect(scene.seats.map(s => s.id)).toEqual([0, 1, 2, 3]);
    expect(scene.seats.map(s => s.angle)).toEqual([0, 1, 2, 3].map(s => seatAngle(s as SeatId)));
  });

  it('seats the player to the viewer\'s right at seat 1 and their left at seat 3', () => {
    const game = midHandGame();
    const scene = projectScene({ game, viewerId: 'ai-2', cosmetics: {} });
    // Table order is human, ai-1, ai-2, ai-3; from ai-2's chair ai-3 is next.
    expect(scene.seats.map(s => s.playerId)).toEqual([
      'ai-2', 'ai-3', VIEWER_ID, 'ai-1',
    ]);
  });

  it('carries the seat wind and the dealer marker', () => {
    const scene = project(midHandGame());
    expect(scene.seats[0].seatWind).toBe(WindTile.EAST);
    expect(scene.seats.filter(s => s.isDealer)).toHaveLength(1);
    expect(scene.seats.find(s => s.isDealer)?.playerId).toBe(VIEWER_ID);
  });

  it('reports the active seat relative to the viewer, not the table', () => {
    const game = midHandGame({ currentPlayerIndex: 2 });
    expect(project(game).phase.activeSeat).toBe(2);
    expect(projectScene({ game, viewerId: 'ai-1', cosmetics: {} }).phase.activeSeat).toBe(1);
  });

  it('refuses to project for someone who is not at the table', () => {
    expect(() => project(midHandGame(), { viewerId: 'nobody' })).toThrow(/not in this game/);
  });
});

/* ── Hidden information ─────────────────────────────────────────────────── */

describe('hidden information is filtered at projection time', () => {
  it.each(ALL_FIXTURES)(
    'never gives an opponent\'s concealed hand tile a face (%s)',
    (_name, game) => {
      for (const player of game.players) {
        const scene = projectScene({ game, viewerId: player.id, cosmetics: {} });
        const opponentHand = scene.tiles.filter(
          t => t.slot.kind === 'hand' && t.slot.seat !== 0,
        );
        expect(opponentHand.length).toBeGreaterThan(0);
        expect(opponentHand.every(t => t.face === null)).toBe(true);
      }
    },
  );

  it.each(ALL_FIXTURES)('never gives a wall tile a face (%s)', (_name, game) => {
    const scene = project(game);
    expect(scene.tiles.filter(t => t.slot.kind === 'wall').every(t => t.face === null)).toBe(true);
  });

  it.each(ALL_FIXTURES)(
    'never leaks a concealed tile\'s engine id either (%s)',
    (_name, game) => {
      for (const player of game.players) {
        const scene = projectScene({ game, viewerId: player.id, cosmetics: {} });

        const hiddenEngineIds = new Set([
          ...game.players
            .filter(p => p.id !== player.id)
            .flatMap(p => p.hand.map(t => t.id)),
          ...game.wall.map(t => t.id),
          ...game.deadWall.map(t => t.id),
        ]);

        const concealedSceneIds = scene.tiles
          .filter(t => t.face === null && t.slot.kind !== 'meld')
          .map(t => t.id);

        for (const id of concealedSceneIds) {
          expect(hiddenEngineIds.has(id)).toBe(false);
        }
      }
    },
  );

  it('does give the viewer their own hand, faces and engine ids intact', () => {
    const game = midHandGame();
    const scene = project(game);
    const hand = scene.tiles.filter(t => t.slot.kind === 'hand' && t.slot.seat === 0);
    expect(hand.map(t => t.id)).toEqual(game.players[0].hand.map(t => t.id));
    expect(hand.every(t => t.face !== null)).toBe(true);
  });

  it('shows an opponent\'s tile count without showing the tiles', () => {
    const game = midHandGame();
    const scene = project(game);
    const seat3Hand = scene.tiles.filter(t => t.slot.kind === 'hand' && t.slot.seat === 3);
    expect(seat3Hand).toHaveLength(game.players[3].hand.length);
  });

  it('reveals a tile once it is discarded', () => {
    const scene = project(midHandGame());
    const discards = scene.tiles.filter(t => t.slot.kind === 'discard');
    expect(discards.length).toBeGreaterThan(0);
    expect(discards.every(t => t.face !== null)).toBe(true);
  });
});

/* ── Identity ───────────────────────────────────────────────────────────── */

describe('tile identity', () => {
  it('uses the engine\'s per-physical-tile id for everything the viewer sees', () => {
    const game = midHandGame();
    const scene = project(game);
    const engineIds = new Set([
      ...game.players.flatMap(p => [
        ...p.hand.map(t => t.id),
        ...p.flowers.map(t => t.id),
        ...p.melds.flatMap(m => m.tiles.map(t => t.id)),
      ]),
      ...Object.values(game.playerDiscards).flat().map(t => t.id),
    ]);

    const visible = scene.tiles.filter(t => t.face !== null);
    expect(visible.length).toBeGreaterThan(0);
    for (const tile of visible) {
      expect(engineIds.has(tile.id)).toBe(true);
    }
  });

  it('gives every tile in the scene a distinct id', () => {
    for (const [, game] of ALL_FIXTURES) {
      const scene = project(game);
      expect(new Set(scene.tiles.map(t => t.id)).size).toBe(scene.tiles.length);
    }
  });

  it('keeps a discard\'s id across revisions as the pool grows', () => {
    const before = project(midHandGame());
    const grown = midHandGame();
    grown.playerDiscards[VIEWER_ID] = [
      ...grown.playerDiscards[VIEWER_ID],
      grown.players[0].hand[0],
    ];
    const after = project(grown, {}, before);

    const idsOf = (scene: SceneModel) =>
      scene.tiles.filter(t => t.slot.kind === 'discard' && t.slot.seat === 0).map(t => t.id);

    expect(idsOf(after).slice(0, 3)).toEqual(idsOf(before));
  });

  it('keeps a discard\'s transform across revisions as the pool grows', () => {
    const before = project(midHandGame());
    const grown = midHandGame();
    grown.playerDiscards[VIEWER_ID] = [
      ...grown.playerDiscards[VIEWER_ID],
      grown.players[0].hand[0],
    ];
    const after = project(grown, {}, before);

    const byId = new Map(after.tiles.map(t => [t.id, t]));
    for (const tile of before.tiles.filter(t => t.slot.kind === 'discard')) {
      expect(byId.get(tile.id)?.transform).toEqual(tile.transform);
    }
  });

  it('renumbers an opponent\'s hand when a tile leaves it, by design', () => {
    // An opponent's ids name a position in a row of backs, not a tile — which
    // back is which is exactly the fact being withheld. Pinned so that
    // anything consuming these ids treats them as positions.
    const game = midHandGame();
    const before = project(game);
    const shorter = midHandGame();
    shorter.players[3] = {
      ...shorter.players[3],
      hand: shorter.players[3].hand.filter((_, i) => i !== 2),
    };
    const after = project(shorter, {}, before);

    const idsAt = (scene: SceneModel) =>
      scene.tiles.filter(t => t.slot.kind === 'hand' && t.slot.seat === 3).map(t => t.id);

    expect(idsAt(before)).toEqual(
      game.players[3].hand.map((_, i) => `hand:3:${i}`),
    );
    expect(idsAt(after)).toEqual(idsAt(before).slice(0, -1));
  });

  it('keeps an un-drawn wall tile in place when a tile is drawn', () => {
    const before = project(midHandGame());
    const drawn = midHandGame();
    drawn.wall = drawn.wall.slice(1);
    const after = project(drawn, {}, before);

    const byId = new Map(after.tiles.map(t => [t.id, t]));
    const wallBefore = before.tiles.filter(t => t.slot.kind === 'wall');

    // Exactly one wall slot disappears, and it is the one at the drawing end.
    expect(after.tiles.filter(t => t.slot.kind === 'wall')).toHaveLength(wallBefore.length - 1);
    for (const tile of wallBefore.slice(0, wallBefore.length - 1)) {
      expect(byId.get(tile.id)?.transform).toEqual(tile.transform);
    }
  });
});

/* ── Emphasis ───────────────────────────────────────────────────────────── */

describe('emphasis comes from authoritative state, never the renderer', () => {
  it('marks the controller\'s selected tile', () => {
    const game = midHandGame();
    const selectedTileId = game.players[0].hand[1].id;
    const scene = project(game, { selectedTileId });
    const selected = scene.tiles.filter(t => t.emphasis.includes('selected'));
    expect(selected.map(t => t.id)).toEqual([selectedTileId]);
  });

  it('marks the discard open to claims only while claims are open', () => {
    const open = project(claimWindowGame());
    expect(open.tiles.filter(t => t.emphasis.includes('lastDiscard')).map(t => t.id))
      .toEqual(['character_8_1']);

    const closed = project(midHandGame());
    expect(closed.tiles.filter(t => t.emphasis.includes('lastDiscard'))).toHaveLength(0);
  });

  it('marks the winning tile once the hand is over', () => {
    const scene = project(finishedGame());
    expect(scene.tiles.filter(t => t.emphasis.includes('winningTile'))).toHaveLength(1);
  });

  it('never puts emphasis on an opponent\'s concealed tile', () => {
    const game = midHandGame();
    const scene = project(game, { selectedTileId: game.players[1].hand[0].id });
    const opponentTiles = scene.tiles.filter(
      t => t.slot.kind === 'hand' && t.slot.seat !== 0,
    );
    expect(opponentTiles.every(t => t.emphasis.length === 0)).toBe(true);
  });

  it('leaves emphasis empty when the controller offers none', () => {
    const scene = project(midHandGame());
    expect(scene.tiles.every(t => t.emphasis.length === 0)).toBe(true);
  });
});

/* ── Cosmetics ──────────────────────────────────────────────────────────── */

describe('cosmetics enter through the scene model', () => {
  it('resolves the palette, felt and roster the player chose', () => {
    const scene = project(midHandGame(), {
      cosmetics: { paletteId: 'neon', feltId: 'casino-black', rosterId: 'alt' },
    });
    expect(scene.cosmetics.palette).toEqual(getTilePalette('neon'));
    expect(scene.cosmetics.felt).toEqual(getTableFelt('casino-black'));
    expect(scene.cosmetics.roster).toEqual(getRoster('alt'));
  });

  it('falls back to the defaults when nothing is chosen', () => {
    const scene = project(midHandGame());
    expect(scene.cosmetics.palette).toEqual(getTilePalette(null));
    expect(scene.cosmetics.felt).toEqual(getTableFelt(null));
    expect(scene.cosmetics.roster).toEqual(getRoster(null));
  });

  it('places the roster\'s NPCs in the seats the DOM board places them', () => {
    const scene = project(midHandGame(), { cosmetics: { rosterId: 'default' } });
    const roster = getRoster('default');
    expect(scene.seats.map(s => s.npcId)).toEqual([
      null, roster.seats.right, roster.seats.top, roster.seats.left,
    ]);
  });

  it('honours a Parlour seat override', () => {
    const scene = project(midHandGame(), {
      cosmetics: {
        rosterId: 'default',
        npcSeatsOverride: { left: 'sora', top: 'aki', right: 'riko' },
      },
    });
    expect(scene.seats.map(s => s.npcId)).toEqual([null, 'riko', 'aki', 'sora']);
  });
});

/* ── Revisions ──────────────────────────────────────────────────────────── */

describe('the revision counter', () => {
  it('starts at zero for the first projection', () => {
    expect(project(midHandGame()).revision).toBe(0);
  });

  it('increases on every projection, including when nothing changed', () => {
    const game = midHandGame();
    let scene = project(game);
    const seen = [scene.revision];
    for (let i = 0; i < 5; i++) {
      scene = project(game, {}, scene);
      seen.push(scene.revision);
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });

  it('advances from whatever the previous model reported', () => {
    const previous = { ...project(midHandGame()), revision: 41 };
    expect(project(midHandGame(), {}, previous).revision).toBe(42);
  });
});

/* ── Purity of the function itself ──────────────────────────────────────── */

describe('the projection is a pure function of its input', () => {
  it('returns the same scene for the same input', () => {
    const game = midHandGame();
    const input: SceneProjectionInput = { game, viewerId: VIEWER_ID, cosmetics: {} };
    expect(projectScene(input)).toEqual(projectScene(input));
  });

  it('does not mutate the game state it is given', () => {
    const game = dealtGame();
    const before = JSON.stringify(game);
    project(game);
    expect(JSON.stringify(game)).toBe(before);
  });
});

/* ── A real deal ────────────────────────────────────────────────────────── */

describe('a real deal from the engine', () => {
  const game = dealtGame();
  const scene = project(game);

  it('projects thirteen concealed tiles for every seat', () => {
    for (const seat of [0, 1, 2, 3] as SeatId[]) {
      const hand = scene.tiles.filter(t => t.slot.kind === 'hand' && t.slot.seat === seat);
      expect(hand).toHaveLength(game.players[seat].hand.length);
    }
  });

  it('projects the flowers the deal revealed', () => {
    const flowerCount = game.players.reduce((n, p) => n + p.flowers.length, 0);
    expect(scene.tiles.filter(t => t.slot.kind === 'flower')).toHaveLength(flowerCount);
  });

  it('accounts for all 144 tiles across the scene and the viewer\'s blind spots', () => {
    const projected = scene.tiles.length;
    expect(projected).toBe(
      game.players.reduce((n, p) => n + p.hand.length + p.flowers.length, 0) +
        game.wall.length +
        game.deadWall.length,
    );
    expect(projected).toBe(144);
  });
});
