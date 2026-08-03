/**
 * Table geometry for the scene projection.
 *
 * All distances are in table units, where one tile is `TILE_WIDTH` across.
 * The table surface is y = 0 and tiles are positioned by their centre, so a
 * tile lying flat sits at y = TILE_DEPTH / 2 and one standing upright sits at
 * y = TILE_HEIGHT / 2.
 *
 * Every seat has the same local frame, rotated about the table's vertical
 * axis by that seat's angle: +z runs from the table centre out toward the
 * seat, +x runs to that seat's right. Placing a row of tiles is therefore
 * always "lay it out in seat-local space, then rotate".
 *
 * These values are provisional art. The camera and table layout are
 * deliberately still open; what is *not* open is the corner invariant below.
 */

import type { SceneVec3, SeatId } from './types';

export const TILE_WIDTH = 0.62;
export const TILE_HEIGHT = 0.82;
export const TILE_DEPTH = 0.4;

/** Pitch for a tile lying flat, printed face upward. */
export const PITCH_FACE_UP = -Math.PI / 2;
/** Pitch for a tile lying flat, printed face against the table. */
export const PITCH_FACE_DOWN = Math.PI / 2;
/** Pitch for a tile standing upright, face toward its owner. */
export const PITCH_UPRIGHT = 0;

/* ── Discards ─────────────────────────────────────────────────────────────
   A block of rows growing outward from the table centre in front of its
   owner. Seven columns is the usual reading width. */

export const DISCARD_COLUMNS = 7;
export const DISCARD_COLUMN_PITCH = TILE_WIDTH * 1.1;
export const DISCARD_ROW_PITCH = TILE_HEIGHT * 1.1;

/**
 * Distance from the table centre to the centre of a discard block's first row.
 *
 * Load-bearing. Every seat's block is the same rectangle a quarter turn
 * apart, so they miss each other exactly when a block's near edge lies
 * further out than its own half-width; fail that and two pools claim the same
 * corner. The prototype's 2.5 clears the half-width but not the near edge.
 *
 * Three rows — 21 discards, more than a player can reach — stay inside the
 * wall ring, and the wall a fourth row would reach has been drawn away by
 * then. `layout.test.ts` pins both bounds.
 */
export const DISCARD_START_Z = 3.0;

/* ── The wall ─────────────────────────────────────────────────────────────
   A closed square ring of 18 stacks per side, two tiles high: the 144-tile
   set laid out as it is built at the start of a hand. Remaining tiles fill
   the ring from the far end, so an un-drawn tile never moves. */

export const WALL_STACKS_PER_SIDE = 18;
export const WALL_LEVELS = 2;
export const WALL_SLOTS_PER_SIDE = WALL_STACKS_PER_SIDE * WALL_LEVELS;
export const WALL_SLOT_COUNT = WALL_SLOTS_PER_SIDE * 4;
export const WALL_COLUMN_PITCH = TILE_WIDTH * 1.06;
export const WALL_Z = 6.5;

/**
 * Slots reserved at the start of the ring for the dead wall — the tiles a
 * kong or a flower draws its replacement from. The engine deals exactly 14.
 */
export const DEAD_WALL_SLOTS = 14;

/* ── Exposed melds, flowers, and the concealed hand ───────────────────── */

export const MELD_TILE_PITCH = TILE_WIDTH * 1.06;
/** Gap between one meld and the next, so groups read as groups. */
export const MELD_GAP = TILE_WIDTH * 0.5;
export const MELD_Z = 7.5;

export const FLOWER_TILE_PITCH = TILE_WIDTH * 1.06;
export const FLOWER_Z = 8.6;

export const HAND_TILE_PITCH = TILE_WIDTH * 1.06;
export const HAND_Z = 9.3;

/** Radians from the viewer's seat to `seat`, about the table's vertical axis. */
export function seatAngle(seat: SeatId): number {
  return seat * (Math.PI / 2);
}

/**
 * Rotate a seat-local position into table space.
 *
 * The same rotation is applied to a tile's yaw, so a seat's whole frame —
 * where its tiles sit and which way they face — turns together.
 */
export function seatToTable(local: SceneVec3, seat: SeatId): SceneVec3 {
  const a = seatAngle(seat);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return {
    x: local.x * cos + local.z * sin,
    y: local.y,
    z: -local.x * sin + local.z * cos,
  };
}

/** Seat-local x of tile `index` in a centred row of `count` tiles. */
export function rowLocalX(index: number, count: number, pitch: number): number {
  return (index - (count - 1) / 2) * pitch;
}

/**
 * Half the width a centred row occupies, including the outer tiles' own
 * width — the distance from the row's centre line to the edge of the tile
 * furthest out.
 */
export function rowHalfWidth(count: number, pitch: number): number {
  if (count <= 0) return 0;
  return ((count - 1) / 2) * pitch + TILE_WIDTH / 2;
}

/** Half-width of a full discard block. */
export function discardBlockHalfWidth(): number {
  return rowHalfWidth(DISCARD_COLUMNS, DISCARD_COLUMN_PITCH);
}

/** Distance from the table centre to the near edge of a seat's first row. */
export function discardBlockNearEdge(): number {
  return DISCARD_START_Z - TILE_HEIGHT / 2;
}

/** Seat-local x of each tile in a seat's exposed melds, laid out as one row. */
export function meldRowLocalX(meldTileCounts: readonly number[]): number[][] {
  const totalTiles = meldTileCounts.reduce((sum, n) => sum + n, 0);
  if (totalTiles === 0) return meldTileCounts.map(() => []);

  const runWidth =
    totalTiles * MELD_TILE_PITCH + (meldTileCounts.length - 1) * MELD_GAP;
  let cursor = -runWidth / 2 + MELD_TILE_PITCH / 2;

  return meldTileCounts.map(count => {
    const xs: number[] = [];
    for (let i = 0; i < count; i++) {
      xs.push(cursor);
      cursor += MELD_TILE_PITCH;
    }
    cursor += MELD_GAP;
    return xs;
  });
}

/** Half-width of a seat's meld row, for the same corner check as discards. */
export function meldRowHalfWidth(meldTileCounts: readonly number[]): number {
  const xs = meldRowLocalX(meldTileCounts).flat();
  if (xs.length === 0) return 0;
  return Math.max(...xs.map(Math.abs)) + TILE_WIDTH / 2;
}

/**
 * Where a wall tile sits, given its slot index counted from the *end* of the
 * wall. Slot 0 is the last tile that will ever be drawn, so a tile that is
 * still in the wall keeps the same slot — and therefore the same position and
 * the same id — for the whole hand.
 */
export function wallSlotLocal(slot: number): {
  side: SeatId;
  local: SceneVec3;
} {
  const side = (Math.floor(slot / WALL_SLOTS_PER_SIDE) % 4) as SeatId;
  const within = slot % WALL_SLOTS_PER_SIDE;
  const stack = Math.floor(within / WALL_LEVELS);
  const level = within % WALL_LEVELS;
  return {
    side,
    local: {
      x: rowLocalX(stack, WALL_STACKS_PER_SIDE, WALL_COLUMN_PITCH),
      y: TILE_DEPTH / 2 + level * TILE_DEPTH,
      z: WALL_Z,
    },
  };
}
