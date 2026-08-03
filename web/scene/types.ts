/**
 * Scene model — the settled truth a 3D renderer draws.
 *
 * This is the whole contract between authoritative game state and any
 * renderer. It is always complete, always valid, and always sufficient on its
 * own: given only a `SceneModel`, a renderer can draw a correct, settled
 * table. Animation is decoration layered on top, and every animation must end
 * exactly on the transforms this model specifies.
 *
 * Two rules hold without exception:
 *
 * 1. Hidden information is filtered at projection time, not at render time.
 *    A tile the viewer may not see carries neither a face nor its engine id.
 * 2. Renderer-local state is never an input. Tile *selection* is
 *    authoritative — it lives in the controller and changes the legality of
 *    the discard button — so it appears here. *Hover* is renderer-local and
 *    must never reach this model.
 */

import type { TileSuit, WindTile } from '@/models/Tile';
import type { GamePhase, GameState, TurnPhase } from '@/models/GameState';
import type {
  RosterId,
  RosterMeta,
  TableFelt,
  TableFeltId,
  TilePalette,
  TilePaletteId,
} from '@/lib/cosmetics';
import type { NpcId } from '@/content/npcs';

/**
 * Identity of a tile in the scene.
 *
 * For anything the viewer may see this is the engine's `Tile.id`, which is
 * already unique per *physical* tile — there is no parallel identity system.
 * For concealed tiles it is a synthetic positional id (`hand:2:5`, `wall:41`),
 * because an engine id such as `bamboo_5_2` would reveal the very tile the
 * null face exists to hide.
 */
export type SceneTileId = string;

/** Viewer-relative seat. The viewer is always seat 0; 1 is to their right. */
export type SeatId = 0 | 1 | 2 | 3;

export interface SceneVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * A settled tile placement in table space.
 *
 * Applied as `Ry(yaw) · Rx(pitch)` — yaw about the table's vertical axis,
 * then pitch about the tile's own left-right axis. Two angles rather than a
 * full Euler triple, so there is no rotation-order ambiguity to get wrong.
 */
export interface SceneTransform {
  /** Table space. y is up; the table surface is y = 0. */
  readonly position: SceneVec3;
  /** Radians about the table's vertical axis. Faces the tile toward its seat. */
  readonly yaw: number;
  /** Radians. 0 stands upright, -PI/2 lies face-up, +PI/2 lies face-down. */
  readonly pitch: number;
}

/** Everything a renderer needs to draw a tile's printed face. */
export interface TileFace {
  /** Canonical face identity — one of the 42 faces, e.g. `bamboo_5`. */
  readonly key: string;
  /** Drives the palette tint; the face art itself is palette-independent. */
  readonly suit: TileSuit;
}

export type SceneSlotKind = 'hand' | 'discard' | 'meld' | 'wall' | 'flower';

export interface SceneSlot {
  readonly kind: SceneSlotKind;
  /** Owning seat. For `wall`, the side of the ring the tile sits on. */
  readonly seat: SeatId;
  /** Position within the slot — hand order, discard order, meld order. */
  readonly index: number;
  /** Which of the seat's melds. Present only for `meld` slots. */
  readonly meldIndex?: number;
}

/**
 * Presentational states carried on a tile. Each is sourced from authoritative
 * game state or from the controller — never from the renderer.
 *
 * Tutor guidance is deliberately absent: the DOM owns the hand and its
 * shanten/danger colouring, so projecting it would be data no renderer reads.
 */
export type TileEmphasis =
  /** Authoritative controller selection. Not hover. */
  | 'selected'
  /** The discard currently open to claims. */
  | 'lastDiscard'
  /** The tile that completed the winning hand. */
  | 'winningTile';

export interface SceneTile {
  readonly id: SceneTileId;
  /** `null` means face-down — hidden information is filtered at projection. */
  readonly face: TileFace | null;
  readonly slot: SceneSlot;
  readonly transform: SceneTransform;
  readonly emphasis: readonly TileEmphasis[];
}

export interface SceneSeat {
  readonly id: SeatId;
  readonly playerId: string;
  readonly seatWind: WindTile;
  readonly isDealer: boolean;
  readonly isViewer: boolean;
  /** Radians about the table's vertical axis — where this seat sits. */
  readonly angle: number;
  /** NPC occupying this seat, resolved from the roster. `null` for the viewer. */
  readonly npcId: NpcId | null;
}

export interface SceneWall {
  /** Draws remaining in the live wall — the quantity a player reads. */
  readonly liveCount: number;
  /** Replacement tiles remaining for kongs and flowers. */
  readonly deadCount: number;
}

export interface ScenePhase {
  readonly game: GamePhase;
  readonly turn: TurnPhase;
  readonly activeSeat: SeatId;
}

/**
 * Resolved cosmetics. A renderer reads its colours from here rather than from
 * the settings store, so there is one place cosmetics enter the scene.
 */
export interface SceneCosmetics {
  readonly palette: TilePalette;
  readonly felt: TableFelt;
  readonly roster: RosterMeta;
}

export interface SceneModel {
  /** Monotonic. Stale animation commands compare against this. */
  readonly revision: number;
  readonly viewerId: string;
  /** Ordered by seat id, so `seats[0]` is always the viewer. */
  readonly seats: readonly SceneSeat[];
  /** Only what the viewer may see. */
  readonly tiles: readonly SceneTile[];
  readonly wall: SceneWall;
  readonly phase: ScenePhase;
  readonly cosmetics: SceneCosmetics;
}

/** Cosmetic selections as they are stored in settings, before resolution. */
export interface SceneCosmeticsInput {
  readonly paletteId?: TilePaletteId | null;
  readonly feltId?: TableFeltId | null;
  readonly rosterId?: RosterId | null;
  /** Parlour floor matches pin specific NPCs to the three opponent seats. */
  readonly npcSeatsOverride?: Record<'left' | 'top' | 'right', NpcId>;
}

export interface SceneProjectionInput {
  readonly game: GameState;
  readonly viewerId: string;
  /**
   * Authoritative selection from the controller — an engine tile id, typed as
   * the controller types it. Never hover, which is renderer-local.
   */
  readonly selectedTileId?: string;
  readonly cosmetics: SceneCosmeticsInput;
}
