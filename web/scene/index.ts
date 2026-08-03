/**
 * The state-to-scene seam.
 *
 * `projectScene` turns authoritative game state into a `SceneModel`: the
 * settled truth a renderer draws. It is complete on its own — a renderer that
 * ignores every animation and simply draws the latest projection is correct.
 *
 * Nothing here imports React, three.js or a DOM API, and nothing here reads
 * renderer-local state. Both are asserted structurally in `__tests__`.
 */

export { projectScene } from './projection';
export type {
  SceneModel, SceneTile, SceneSeat, SceneSlot, SceneSlotKind, SceneTransform,
  SceneVec3, SceneWall, ScenePhase, SceneCosmetics, SceneCosmeticsInput,
  SceneProjectionInput, SceneTileId, SeatId, TileEmphasis, TileFace,
} from './types';
export { seatAngle, seatToTable, TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH } from './layout';
