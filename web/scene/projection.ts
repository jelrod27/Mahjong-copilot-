/**
 * Projects authoritative game state into a `SceneModel`.
 *
 * Pure: no React, no three.js, no DOM, no side effects. Given the same input
 * it returns the same scene, and the scene it returns is complete — a
 * renderer needs nothing else to draw a settled table.
 *
 * The projection is the only place hidden information is removed. A tile the
 * viewer may not see loses both its face and its engine id here, so no
 * renderer bug, devtools inspection or memory dump can recover it.
 */

import { tileKey } from '@/models/Tile';
import type { Tile } from '@/models/Tile';
import type { GameState, MeldInfo, Player } from '@/models/GameState';
import { getRoster, getTableFelt, getTilePalette } from '@/lib/cosmetics';
import type { NpcId } from '@/content/npcs';
import {
  DEAD_WALL_SLOTS,
  DISCARD_COLUMNS,
  DISCARD_COLUMN_PITCH,
  DISCARD_ROW_PITCH,
  DISCARD_START_Z,
  FLOWER_TILE_PITCH,
  FLOWER_Z,
  HAND_TILE_PITCH,
  HAND_Z,
  MELD_Z,
  PITCH_FACE_DOWN,
  PITCH_FACE_UP,
  PITCH_UPRIGHT,
  TILE_DEPTH,
  TILE_HEIGHT,
  WALL_SLOT_COUNT,
  meldRowLocalX,
  rowLocalX,
  seatAngle,
  seatToTable,
  wallSlotLocal,
} from './layout';
import type {
  SceneCosmetics,
  SceneCosmeticsInput,
  SceneModel,
  SceneProjectionInput,
  SceneSeat,
  SceneSlot,
  SceneTile,
  SceneTransform,
  SceneVec3,
  SeatId,
  TileEmphasis,
  TileFace,
} from './types';

const NO_EMPHASIS: readonly TileEmphasis[] = Object.freeze([]);

/** Which opponent seat each roster position sits in, from the viewer's chair. */
const ROSTER_POSITION_BY_SEAT: Record<1 | 2 | 3, 'right' | 'top' | 'left'> = {
  1: 'right',
  2: 'top',
  3: 'left',
};

/**
 * Project a game state into the settled scene a renderer draws.
 *
 * Pass the previous model to advance the revision counter. Revisions are
 * monotonic so that an animation command issued against an older scene can be
 * recognised as stale and dropped rather than replayed.
 */
export function projectScene(
  input: SceneProjectionInput,
  previous?: SceneModel | null,
): SceneModel {
  const { game, viewerId } = input;

  const viewerIndex = game.players.findIndex(p => p.id === viewerId);
  if (viewerIndex === -1) {
    // Silently falling back to seat 0 would show one player another's hand,
    // so this fails loudly instead.
    throw new Error(`projectScene: viewer "${viewerId}" is not in this game`);
  }

  // Seats are counted round the table from the viewer's chair, so the viewer
  // is always seat 0 and every renderer draws the table from where they sit.
  const seatCount = game.players.length;
  const seatOf = (playerIndex: number): SeatId => {
    const offset = (playerIndex - viewerIndex + seatCount) % seatCount;
    return offset as SeatId;
  };

  const cosmetics = resolveCosmetics(input.cosmetics);
  const seats = game.players
    .map((player, index) => projectSeat(player, seatOf(index), input.cosmetics))
    .sort((a, b) => a.id - b.id);

  const tiles: SceneTile[] = [];
  game.players.forEach((player, index) => {
    const seat = seatOf(index);
    tiles.push(...projectHand(player, seat, seat === 0, input));
    tiles.push(...projectMelds(player, seat));
    tiles.push(...projectFlowers(player, seat));
    tiles.push(...projectDiscards(player, seat, game));
  });
  tiles.push(...projectWall(game));

  return {
    revision: (previous?.revision ?? -1) + 1,
    viewerId,
    seats,
    tiles,
    wall: {
      liveCount: game.wall.length,
      deadCount: game.deadWall.length,
    },
    phase: {
      game: game.phase,
      turn: game.turnPhase,
      activeSeat: seatOf(game.currentPlayerIndex),
    },
    cosmetics,
  };
}

function resolveCosmetics(input: SceneCosmeticsInput): SceneCosmetics {
  return {
    palette: getTilePalette(input.paletteId),
    felt: getTableFelt(input.feltId),
    roster: getRoster(input.rosterId),
  };
}

function projectSeat(
  player: Player,
  seat: SeatId,
  cosmetics: SceneCosmeticsInput,
): SceneSeat {
  return {
    id: seat,
    playerId: player.id,
    seatWind: player.seatWind,
    isDealer: player.isDealer,
    isViewer: seat === 0,
    angle: seatAngle(seat),
    npcId: npcForSeat(seat, cosmetics),
  };
}

function npcForSeat(seat: SeatId, cosmetics: SceneCosmeticsInput): NpcId | null {
  if (seat === 0) return null;
  const position = ROSTER_POSITION_BY_SEAT[seat];
  return cosmetics.npcSeatsOverride
    ? cosmetics.npcSeatsOverride[position]
    : getRoster(cosmetics.rosterId).seats[position];
}

/**
 * A seat's concealed hand: upright tiles facing their owner.
 *
 * Only the viewer's own tiles carry a face, and only the viewer's tiles keep
 * their engine ids — an id such as `bamboo_5_2` names the tile as plainly as
 * the face does.
 *
 * An opponent's ids are positional, so unlike every other slot they do *not*
 * survive a change to the hand: discarding from the middle of a row renumbers
 * everything after it. That is inherent rather than an oversight — a row of
 * face-down backs is a count, and which back is which is exactly the fact
 * being withheld. Anything keying off these ids must treat them as the
 * position they name, not as a tile.
 */
function projectHand(
  player: Player,
  seat: SeatId,
  isViewer: boolean,
  input: SceneProjectionInput,
): SceneTile[] {
  const count = player.hand.length;
  return player.hand.map((tile, index) => ({
    id: isViewer ? tile.id : `hand:${seat}:${index}`,
    face: isViewer ? faceOf(tile) : null,
    slot: { kind: 'hand', seat, index } satisfies SceneSlot,
    transform: makeTransform(
      {
        x: rowLocalX(index, count, HAND_TILE_PITCH),
        y: TILE_HEIGHT / 2,
        z: HAND_Z,
      },
      seat,
      PITCH_UPRIGHT,
    ),
    emphasis: isViewer ? handEmphasis(tile, input) : NO_EMPHASIS,
  }));
}

function handEmphasis(
  tile: Tile,
  input: SceneProjectionInput,
): readonly TileEmphasis[] {
  const emphasis: TileEmphasis[] = [];
  if (tile.id === input.selectedTileId) emphasis.push('selected');
  if (tile.id === input.game.winningTile?.id) emphasis.push('winningTile');
  return emphasis.length > 0 ? emphasis : NO_EMPHASIS;
}

/**
 * Exposed melds, lying face-up in front of their owner.
 *
 * A concealed kong is declared publicly, so its identity is not hidden
 * information — but the table convention is to turn its outer two tiles face
 * down, which the DOM board already does.
 */
function projectMelds(player: Player, seat: SeatId): SceneTile[] {
  const xs = meldRowLocalX(player.melds.map(m => m.tiles.length));
  const tiles: SceneTile[] = [];

  player.melds.forEach((meld, meldIndex) => {
    meld.tiles.forEach((tile, index) => {
      tiles.push({
        id: tile.id,
        face: showsMeldBack(meld, index) ? null : faceOf(tile),
        slot: { kind: 'meld', seat, index, meldIndex } satisfies SceneSlot,
        transform: makeTransform(
          { x: xs[meldIndex][index], y: TILE_DEPTH / 2, z: MELD_Z },
          seat,
          showsMeldBack(meld, index) ? PITCH_FACE_DOWN : PITCH_FACE_UP,
        ),
        emphasis: NO_EMPHASIS,
      });
    });
  });

  return tiles;
}

function showsMeldBack(meld: MeldInfo, index: number): boolean {
  return meld.isConcealed && meld.type === 'kong' && (index === 0 || index === 3);
}

/** Bonus tiles, set aside face-up beyond the owner's melds. */
function projectFlowers(player: Player, seat: SeatId): SceneTile[] {
  const count = player.flowers.length;
  return player.flowers.map((tile, index) => ({
    id: tile.id,
    face: faceOf(tile),
    slot: { kind: 'flower', seat, index } satisfies SceneSlot,
    transform: makeTransform(
      {
        x: rowLocalX(index, count, FLOWER_TILE_PITCH),
        y: TILE_DEPTH / 2,
        z: FLOWER_Z,
      },
      seat,
      PITCH_FACE_UP,
    ),
    emphasis: NO_EMPHASIS,
  }));
}

/** A seat's discard pool: rows growing outward from the table centre. */
function projectDiscards(
  player: Player,
  seat: SeatId,
  game: GameState,
): SceneTile[] {
  const discards = game.playerDiscards[player.id] ?? [];
  const openToClaims = game.turnPhase === 'claim' ? game.lastDiscardedTile?.id : undefined;

  return discards.map((tile, index) => {
    const column = index % DISCARD_COLUMNS;
    const row = Math.floor(index / DISCARD_COLUMNS);
    const emphasis: TileEmphasis[] = [];
    if (tile.id === openToClaims) emphasis.push('lastDiscard');
    if (tile.id === game.winningTile?.id) emphasis.push('winningTile');

    return {
      id: tile.id,
      face: faceOf(tile),
      slot: { kind: 'discard', seat, index } satisfies SceneSlot,
      transform: makeTransform(
        {
          x: rowLocalX(column, DISCARD_COLUMNS, DISCARD_COLUMN_PITCH),
          y: TILE_DEPTH / 2,
          z: DISCARD_START_Z + row * DISCARD_ROW_PITCH,
        },
        seat,
        PITCH_FACE_UP,
      ),
      emphasis: emphasis.length > 0 ? emphasis : NO_EMPHASIS,
    };
  });
}

/**
 * The wall, as the ring it physically is.
 *
 * The dead wall keeps its own region of the ring and the live wall sits
 * beyond it, because replacement tiles for kongs and flowers are taken from
 * the dead wall's end — not from where the next ordinary draw comes.
 *
 * Within each region, slots are counted so that the next tile to be drawn
 * occupies the highest slot. A tile still in the wall therefore keeps its
 * slot — and so its position and its id — for the whole hand, rather than
 * every remaining tile shuffling along on each draw.
 *
 * Wall tiles are anonymous by construction: which physical tile sits where is
 * the single most valuable hidden fact in the game, so no engine id reaches
 * the scene.
 */
function projectWall(game: GameState): SceneTile[] {
  const deadCount = Math.min(game.deadWall.length, DEAD_WALL_SLOTS);
  const liveCount = Math.min(game.wall.length, WALL_SLOT_COUNT - DEAD_WALL_SLOTS);

  const slots = [
    ...Array.from({ length: deadCount }, (_, i) => i),
    ...Array.from({ length: liveCount }, (_, i) => DEAD_WALL_SLOTS + i),
  ];

  return slots.map(slot => {
    const { side, local } = wallSlotLocal(slot);
    return {
      id: `wall:${slot}`,
      face: null,
      slot: { kind: 'wall', seat: side, index: slot } satisfies SceneSlot,
      transform: makeTransform(local, side, PITCH_FACE_DOWN),
      emphasis: NO_EMPHASIS,
    };
  });
}

function faceOf(tile: Tile): TileFace {
  return { key: tileKey(tile), suit: tile.suit };
}

function makeTransform(local: SceneVec3, seat: SeatId, pitch: number): SceneTransform {
  return {
    position: seatToTable(local, seat),
    yaw: seatAngle(seat),
    pitch,
  };
}
