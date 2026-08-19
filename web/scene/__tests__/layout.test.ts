import { describe, it, expect } from 'vitest';
import {
  DISCARD_COLUMNS,
  DISCARD_COLUMN_PITCH,
  DISCARD_ROW_PITCH,
  DISCARD_START_Z,
  FLOWER_TILE_PITCH,
  FLOWER_Z,
  HAND_TILE_PITCH,
  HAND_Z,
  MELD_Z,
  TILE_DEPTH,
  TILE_HEIGHT,
  TILE_WIDTH,
  WALL_COLUMN_PITCH,
  WALL_SLOT_COUNT,
  WALL_STACKS_PER_SIDE,
  WALL_Z,
  discardBlockHalfWidth,
  discardBlockNearEdge,
  meldRowHalfWidth,
  meldRowLocalX,
  rowHalfWidth,
  rowLocalX,
  seatAngle,
  seatToTable,
  wallSlotLocal,
} from '../layout';
import type { SeatId } from '../types';

const SEATS: SeatId[] = [0, 1, 2, 3];

describe('seat frames', () => {
  it('places the viewer at angle zero', () => {
    expect(seatAngle(0)).toBe(0);
  });

  it('turns each seat a quarter turn from the last', () => {
    expect(seatAngle(1)).toBeCloseTo(Math.PI / 2);
    expect(seatAngle(2)).toBeCloseTo(Math.PI);
    expect(seatAngle(3)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('puts seat 1 to the viewer\'s right and seat 3 to their left', () => {
    const inFront = { x: 0, y: 0, z: 5 };
    expect(seatToTable(inFront, 1).x).toBeCloseTo(5);
    expect(seatToTable(inFront, 1).z).toBeCloseTo(0);
    expect(seatToTable(inFront, 3).x).toBeCloseTo(-5);
    expect(seatToTable(inFront, 3).z).toBeCloseTo(0);
  });

  it('puts seat 2 across the table from the viewer', () => {
    const placed = seatToTable({ x: 0, y: 0, z: 5 }, 2);
    expect(placed.x).toBeCloseTo(0);
    expect(placed.z).toBeCloseTo(-5);
  });

  it('preserves height and distance from the centre', () => {
    const local = { x: 1.5, y: 0.2, z: 4 };
    for (const seat of SEATS) {
      const placed = seatToTable(local, seat);
      expect(placed.y).toBe(local.y);
      expect(Math.hypot(placed.x, placed.z)).toBeCloseTo(Math.hypot(local.x, local.z));
    }
  });
});

describe('centred rows', () => {
  it('centres an odd row on the seat\'s centre line', () => {
    expect(rowLocalX(1, 3, 1)).toBe(0);
  });

  it('straddles the centre line for an even row', () => {
    expect(rowLocalX(0, 2, 1)).toBe(-0.5);
    expect(rowLocalX(1, 2, 1)).toBe(0.5);
  });

  it('measures half-width to the outer tile\'s edge, not its centre', () => {
    expect(rowHalfWidth(1, 1)).toBeCloseTo(TILE_WIDTH / 2);
    expect(rowHalfWidth(0, 1)).toBe(0);
  });
});

describe('discard block corner invariant', () => {
  // Adjacent seats' discard blocks are the same rectangle a quarter turn
  // apart. If a block's near edge falls inside the other block's half-width,
  // two pools claim the same corner of the table and their tiles intersect.
  it('starts the block beyond its own half-width', () => {
    expect(DISCARD_START_Z).toBeGreaterThan(discardBlockHalfWidth());
  });

  it('keeps the block\'s near edge beyond its own half-width too', () => {
    expect(discardBlockNearEdge()).toBeGreaterThan(discardBlockHalfWidth());
  });

  it('holds when checked as literal rectangle overlap between two seats', () => {
    // Two blocks three rows deep, seat 0 axis-aligned and seat 1 rotated.
    const halfWidth = discardBlockHalfWidth();
    const near = DISCARD_START_Z - TILE_HEIGHT / 2;
    const far = DISCARD_START_Z + 2 * DISCARD_ROW_PITCH + TILE_HEIGHT / 2;

    const seat0 = { minX: -halfWidth, maxX: halfWidth, minZ: near, maxZ: far };
    const seat1 = { minX: near, maxX: far, minZ: -halfWidth, maxZ: halfWidth };

    const overlaps =
      seat0.minX < seat1.maxX &&
      seat1.minX < seat0.maxX &&
      seat0.minZ < seat1.maxZ &&
      seat1.minZ < seat0.maxZ;
    expect(overlaps).toBe(false);
  });

  it('would fail at the prototype\'s start distance, which is why it is a test', () => {
    const prototypeStart = 2.5;
    expect(prototypeStart - TILE_HEIGHT / 2).toBeLessThan(discardBlockHalfWidth());
  });

  // A pool grows outward without bound, so it can only be shown to clear the
  // wall ring up to some depth. Three rows is 21 discards — more than a
  // player reaches in a hand — and that is the bound asserted here.
  it('keeps three rows of discards inside the wall ring', () => {
    const threeRowsFarEdge = DISCARD_START_Z + 2 * DISCARD_ROW_PITCH + TILE_HEIGHT / 2;
    expect(threeRowsFarEdge).toBeLessThan(WALL_Z - TILE_HEIGHT / 2);
  });

  it('reaches the wall ring only on a fourth row, which a hand cannot fill', () => {
    const fourRowsFarEdge = DISCARD_START_Z + 3 * DISCARD_ROW_PITCH + TILE_HEIGHT / 2;
    expect(fourRowsFarEdge).toBeGreaterThan(WALL_Z - TILE_HEIGHT / 2);
    expect(3 * DISCARD_COLUMNS).toBeGreaterThan(20);
  });
});

describe('outer bands clear the same corners', () => {
  const band = (z: number, depth: number, halfWidth: number) => ({
    nearEdge: z - depth / 2,
    halfWidth,
  });

  it('keeps a full meld row clear', () => {
    // Worst case a hand can reach: four melds, every one a kong.
    const worstCase = meldRowHalfWidth([4, 4, 4, 4]);
    const { nearEdge, halfWidth } = band(MELD_Z, TILE_HEIGHT, worstCase);
    expect(nearEdge).toBeGreaterThan(halfWidth);
  });

  it('keeps a full flower row clear', () => {
    // Worst case: one player holds all four flowers and all four seasons.
    const worstCase = rowHalfWidth(8, FLOWER_TILE_PITCH);
    const { nearEdge, halfWidth } = band(FLOWER_Z, TILE_HEIGHT, worstCase);
    expect(nearEdge).toBeGreaterThan(halfWidth);
  });

  it('keeps a full concealed hand clear', () => {
    // Worst case: 14 tiles, a dealer's opening hand before the first discard.
    const worstCase = rowHalfWidth(14, HAND_TILE_PITCH);
    const { nearEdge, halfWidth } = band(HAND_Z, TILE_DEPTH, worstCase);
    expect(nearEdge).toBeGreaterThan(halfWidth);
  });

  it('closes the wall ring without its sides overlapping', () => {
    const worstCase = rowHalfWidth(WALL_STACKS_PER_SIDE, WALL_COLUMN_PITCH);
    const { nearEdge, halfWidth } = band(WALL_Z, TILE_HEIGHT, worstCase);
    expect(nearEdge).toBeGreaterThan(halfWidth);
  });

  it('orders the bands outward from the discards without them colliding', () => {
    const far = (z: number, depth: number) => z + depth / 2;
    const nearOf = (z: number, depth: number) => z - depth / 2;
    expect(nearOf(MELD_Z, TILE_HEIGHT)).toBeGreaterThan(far(WALL_Z, TILE_HEIGHT));
    expect(nearOf(FLOWER_Z, TILE_HEIGHT)).toBeGreaterThan(far(MELD_Z, TILE_HEIGHT));
    expect(nearOf(HAND_Z, TILE_DEPTH)).toBeGreaterThan(far(FLOWER_Z, TILE_HEIGHT));
  });
});

describe('meld row layout', () => {
  it('returns one x per tile, grouped by meld', () => {
    const xs = meldRowLocalX([3, 4]);
    expect(xs.map(g => g.length)).toEqual([3, 4]);
  });

  it('centres the whole run on the seat\'s centre line', () => {
    const xs = meldRowLocalX([3, 3]).flat();
    const centre = (Math.min(...xs) + Math.max(...xs)) / 2;
    expect(centre).toBeCloseTo(0);
  });

  it('separates melds by more than it separates tiles within a meld', () => {
    const [first, second] = meldRowLocalX([3, 3]);
    const withinMeld = first[1] - first[0];
    const betweenMelds = second[0] - first[2];
    expect(betweenMelds).toBeGreaterThan(withinMeld);
  });

  it('handles a seat with no melds', () => {
    expect(meldRowLocalX([])).toEqual([]);
    expect(meldRowHalfWidth([])).toBe(0);
  });
});

describe('wall slots', () => {
  it('lays the ring out as four sides of stacked pairs', () => {
    expect(WALL_SLOT_COUNT).toBe(144);
  });

  it('stacks the second level directly above the first', () => {
    const lower = wallSlotLocal(0);
    const upper = wallSlotLocal(1);
    expect(upper.local.x).toBeCloseTo(lower.local.x);
    expect(upper.local.z).toBeCloseTo(lower.local.z);
    expect(upper.local.y).toBeGreaterThan(lower.local.y);
  });

  it('moves to the next side once a side is full', () => {
    expect(wallSlotLocal(0).side).toBe(0);
    expect(wallSlotLocal(35).side).toBe(0);
    expect(wallSlotLocal(36).side).toBe(1);
    expect(wallSlotLocal(143).side).toBe(3);
  });

  it('gives every slot on a side a distinct position', () => {
    const seen = new Set(
      Array.from({ length: 36 }, (_, i) => {
        const { local } = wallSlotLocal(i);
        return `${local.x.toFixed(4)}:${local.y.toFixed(4)}`;
      }),
    );
    expect(seen.size).toBe(36);
  });
});

describe('column pitches leave the tiles touching but not overlapping', () => {
  it.each([
    ['discard', DISCARD_COLUMN_PITCH],
    ['wall', WALL_COLUMN_PITCH],
    ['hand', HAND_TILE_PITCH],
    ['flower', FLOWER_TILE_PITCH],
  ])('%s pitch exceeds a tile width', (_name, pitch) => {
    expect(pitch).toBeGreaterThan(0.62);
  });

  it('spaces discard rows by more than a tile depth', () => {
    expect(DISCARD_ROW_PITCH).toBeGreaterThan(TILE_HEIGHT);
  });

  it('reads discards seven to a row', () => {
    expect(DISCARD_COLUMNS).toBe(7);
  });
});
