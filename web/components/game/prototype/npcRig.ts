/**
 * PROTOTYPE — throwaway.
 *
 * The characters as 2.5D rigs: four rasterised depth slices of the existing
 * CharacterPortrait, spaced along z, that yaw and lean as a unit.
 *
 * Why not one plane. A flat portrait billboarded at a fixed camera is a
 * postcard, and no amount of lighting fixes that — the README's "cardboard
 * standee" finding. Depth here comes from parallax instead: the slices only
 * separate when the character turns, so the rig is worth nothing without the
 * gaze behaviour that turns them, and the gaze behaviour looks like a sliding
 * sticker without the rig. They ship together or not at all.
 *
 * Why not fully face the table. Facing a side seat inward would be correct and
 * would maximise parallax, and it would also make them invisible: a flat plane
 * seen at 90 degrees is a line. The rig instead sits at a fixed blend between
 * facing the camera and facing the table, so the side seats are always read as
 * three-quarter views. That blend is the whole compromise.
 *
 * Why the rig is pitched back. Yaw alone leaves the plane world-vertical, and a
 * world-vertical plane seen off-centre through a camera that is looking DOWN
 * projects with apparent roll — the character reads as slowly falling over, worst
 * at the side seats where it reached about 20 degrees. This is not an orientation
 * bug, it is what perspective does, and it is the real reason the first version
 * billboarded. Pitching each rig back by the camera's own pitch restores what the
 * billboard was buying (upright, unforeshortened) while keeping the yaw free for
 * parallax.
 *
 * Unlit, still. These are flat stylised 2D characters and shading them with the
 * table's key light is what makes them read as cardboard in the first place. The
 * scene's job here is placement, parallax and occlusion, not relighting the art.
 */

import * as THREE from 'three';
import type { NpcId, NpcEmotion } from '@/content/npcs';
import {
  PORTRAIT_LAYERS,
  renderPortraitLayer,
  type PortraitLayer,
} from './portraitTexture';
const PLANE_W = 3.1;
const PLANE_H = 3.72;

/**
 * How far the bust sits below the table surface.
 *
 * The portrait art ends flat at the bottom of its viewBox, so a bust resting
 * exactly on the felt terminates in a hard horizontal cut — which reads as
 * exactly the cardboard cut-out the rig exists to avoid. Sinking it lets the
 * table edge do the cropping instead, the way a real player is cropped by the
 * table they are sitting at.
 */
const BASE_SINK = 0.15;


/**
 * Slice spacing, in world units, back to front.
 *
 * Total spread is ~10% of the bust height. Anatomically a head is far deeper
 * than that, but four flat cards spread that far stop reading as one person and
 * start reading as four cards. This is the most separation that still reads as
 * volume.
 */
const LAYER_Z: Record<PortraitLayer, number> = {
  back: -0.14,
  body: 0,
  face: 0.11,
  front: 0.22,
};

/** How far toward facing the table centre the rig sits, 0 = pure billboard. */
const INWARD_BIAS = 0.34;
/** Gaze swing either side of the resting facing. */
const GAZE_MAX = THREE.MathUtils.degToRad(30);
/** Hard readability guard: never turn further than this from facing the camera. */
const READABLE_MAX = THREE.MathUtils.degToRad(52);
/** Forward lean while it is this character's turn. */
const LEAN = THREE.MathUtils.degToRad(6);

const YAW_EASE = 9;
const LEAN_EASE = 8;

function shortestAngle(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Yaw that points a +z-facing plane at (tx, tz) from (fx, fz). */
export function yawToward(fx: number, fz: number, tx: number, tz: number): number {
  return Math.atan2(tx - fx, tz - fz);
}

interface Rig {
  group: THREE.Group;
  layers: Map<PortraitLayer, THREE.Mesh>;
  npcId: NpcId;
  seat: number;
  emotion: NpcEmotion;
  /** Facing with no gaze applied: the camera/table blend for this seat. */
  restYaw: number;
  camYaw: number;
  yaw: number;
  targetYaw: number;
  lean: number;
  targetLean: number;
  /** Guards against a slow rasterisation landing after the emotion moved on. */
  faceToken: number;
}

export interface NpcRigSet {
  ensure(
    playerId: string,
    npcId: NpcId,
    seat: number,
    pos: { x: number; z: number },
    camera: THREE.Camera,
  ): void;
  /** Aim a character at a world position. Pass null to return to rest. */
  setGaze(playerId: string, target: { x: number; z: number } | null): void;
  setLeaning(playerId: string, leaning: boolean): void;
  setEmotion(playerId: string, emotion: NpcEmotion): void;
  /** Eases every rig. Returns true while anything is still moving. */
  update(dt: number): boolean;
  /** Removes rigs for players not in `seen`. */
  sweep(seen: Set<string>): void;
  has(playerId: string): boolean;
  ids(): string[];
  dispose(): void;
}

export function createNpcRigSet(
  parent: THREE.Object3D,
  tableY: number,
  cameraPitch: number,
  invalidate: () => void,
  textureSize = 512,
): NpcRigSet {
  const rigs = new Map<string, Rig>();
  const planeGeometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
  /**
   * Set once the rig set is torn down.
   *
   * Rasterisation is async, so a slice can resolve after unmount or after a
   * variant switch. Without this the callback would find its mesh (layers are
   * never cleared), build a texture, assign it to a material whose dispose()
   * has already run, and poke a frame loop that no longer exists.
   */
  let disposed = false;

  function applyLayerTexture(rig: Rig, layer: PortraitLayer, token: number) {
    renderPortraitLayer(rig.npcId, rig.emotion, layer, textureSize).then((canvas) => {
      if (disposed) return;
      // The face slice re-rasterises on every reaction; if the character has
      // reacted again in the meantime this result is already stale.
      if (layer === 'face' && rig.faceToken !== token) return;
      const mesh = rig.layers.get(layer);
      if (!mesh) return;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      // Replacing, not accumulating. An earlier version pushed every texture
      // into a list that lived until unmount: dispose() frees the GPU copy, but
      // the list kept the JS reference, and a CanvasTexture holds its 512x614
      // canvas — ~1.26MB of backing store per reaction that GC could never
      // reclaim. Three characters reacting across a match ran to hundreds of MB.
      // The material already owns exactly one texture; that is the whole set.
      mat.map?.dispose();
      mat.map = tex;
      mat.opacity = 1;
      mat.needsUpdate = true;
      // Slices arrive async. Under render-on-demand the frames budgeted for this
      // layout are long spent, so each texture has to ask for its own redraw.
      invalidate();
    });
  }

  /** Frees a rig's meshes and the one texture each of its materials owns. */
  function destroy(rig: Rig) {
    parent.remove(rig.group);
    rig.layers.forEach((m) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    });
    rig.layers.clear();
  }

  function build(playerId: string, npcId: NpcId, seat: number, pos: { x: number; z: number }): Rig {
    const group = new THREE.Group();
    group.rotation.order = 'YXZ'; // yaw first, then the pitch-back and lean
    group.rotation.x = -cameraPitch;
    group.position.set(pos.x, tableY + PLANE_H / 2 - BASE_SINK, pos.z);

    const layers = new Map<PortraitLayer, THREE.Mesh>();
    PORTRAIT_LAYERS.forEach((layer, i) => {
      const mesh = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({
          transparent: true,
          // alphaTest lets the cut-out silhouette write depth, so the wall and
          // the melds occlude the character's feet instead of the character
          // hovering in front of the whole board.
          alphaTest: 0.35,
          depthWrite: true,
          opacity: 0,
        }),
      );
      mesh.position.z = LAYER_Z[layer];
      mesh.renderOrder = 2 + i;
      group.add(mesh);
      layers.set(layer, mesh);
    });

    parent.add(group);

    const rig: Rig = {
      group,
      layers,
      npcId,
      seat,
      emotion: 'idle',
      restYaw: 0,
      camYaw: 0,
      yaw: 0,
      targetYaw: 0,
      lean: 0,
      targetLean: 0,
      faceToken: 0,
    };
    for (const layer of PORTRAIT_LAYERS) applyLayerTexture(rig, layer, 0);
    return rig;
  }

  function restingYaw(rig: Rig, camera: THREE.Camera): number {
    const { x, z } = rig.group.position;
    const camYaw = yawToward(x, z, camera.position.x, camera.position.z);
    const inYaw = yawToward(x, z, 0, 0);
    rig.camYaw = camYaw;
    return camYaw + shortestAngle(camYaw, inYaw) * INWARD_BIAS;
  }

  return {
    ensure(playerId, npcId, seat, pos, camera) {
      let rig = rigs.get(playerId);
      if (rig && rig.npcId !== npcId) {
        // Different character in the same seat: rebuild rather than repaint.
        destroy(rig);
        rigs.delete(playerId);
        rig = undefined;
      }
      if (!rig) {
        rig = build(playerId, npcId, seat, pos);
        rigs.set(playerId, rig);
        rig.restYaw = restingYaw(rig, camera);
        rig.yaw = rig.restYaw;
        rig.targetYaw = rig.restYaw;
        rig.group.rotation.y = rig.yaw;
        return;
      }
      rig.seat = seat;
      rig.group.position.x = pos.x;
      rig.group.position.z = pos.z;
      rig.restYaw = restingYaw(rig, camera);
    },

    setGaze(playerId, target) {
      const rig = rigs.get(playerId);
      if (!rig) return;
      if (!target) {
        rig.targetYaw = rig.restYaw;
        return;
      }
      const { x, z } = rig.group.position;
      const want = yawToward(x, z, target.x, target.z);
      // Swing is limited around the resting facing, then clamped again around
      // camera-facing so a character can never turn far enough to vanish.
      const swung = rig.restYaw + THREE.MathUtils.clamp(
        shortestAngle(rig.restYaw, want),
        -GAZE_MAX,
        GAZE_MAX,
      );
      rig.targetYaw = rig.camYaw + THREE.MathUtils.clamp(
        shortestAngle(rig.camYaw, swung),
        -READABLE_MAX,
        READABLE_MAX,
      );
    },

    setLeaning(playerId, leaning) {
      const rig = rigs.get(playerId);
      if (rig) rig.targetLean = leaning ? LEAN : 0;
    },

    setEmotion(playerId, emotion) {
      const rig = rigs.get(playerId);
      if (!rig || rig.emotion === emotion) return;
      rig.emotion = emotion;
      // Only the face slice varies with emotion — see portraitTexture. The other
      // three are already correct and stay on their cached textures.
      rig.faceToken++;
      applyLayerTexture(rig, 'face', rig.faceToken);
    },

    update(dt) {
      const yk = 1 - Math.exp(-YAW_EASE * dt);
      const lk = 1 - Math.exp(-LEAN_EASE * dt);
      let moving = false;
      for (const rig of rigs.values()) {
        const dy = shortestAngle(rig.yaw, rig.targetYaw);
        if (Math.abs(dy) > 0.0008) {
          rig.yaw += dy * yk;
          rig.group.rotation.y = rig.yaw;
          moving = true;
        } else if (rig.yaw !== rig.targetYaw) {
          rig.yaw = rig.targetYaw;
          rig.group.rotation.y = rig.yaw;
          moving = true;
        }

        const dl = rig.targetLean - rig.lean;
        if (Math.abs(dl) > 0.0008) {
          rig.lean += dl * lk;
          rig.group.rotation.x = -cameraPitch + rig.lean;
          moving = true;
        } else if (rig.lean !== rig.targetLean) {
          rig.lean = rig.targetLean;
          rig.group.rotation.x = -cameraPitch + rig.lean;
          moving = true;
        }
      }
      return moving;
    },

    sweep(seen) {
      for (const [id, rig] of rigs) {
        if (seen.has(id)) continue;
        destroy(rig);
        rigs.delete(id);
      }
    },

    has: (playerId) => rigs.has(playerId),
    ids: () => Array.from(rigs.keys()),

    dispose() {
      disposed = true;
      for (const rig of rigs.values()) destroy(rig);
      rigs.clear();
      planeGeometry.dispose();
    },
  };
}
