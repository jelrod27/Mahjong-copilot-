'use client';

/**
 * PROTOTYPE — throwaway. WebGL board, to compare against the CSS board.
 *
 * Modes:
 *   'sea'   (variant D) — discards only, mounted in the centre slot. Hybrid scope.
 *   'full'  (variant E) — discards + the human hand as upright 3D tiles.
 *   'board' (variant F) — the whole table full-bleed: felt + rim, the live wall,
 *                         all four seats (human face-up, three AI face-down),
 *                         exposed melds, and the discard sea. DOM keeps only
 *                         the HUD, action bar, and NPC plaques.
 *
 * Tile faces are canvas textures: palette faceBg painted first, then the PNG
 * artwork (see tileArt.ts for why PNG and not SVG here).
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Tile, tileKey } from '@/models/Tile';
import { isGameFinished, type GameState, type MeldInfo } from '@/models/GameState';
import type { TilePalette } from '@/lib/cosmetics';
import { tileArtSrc } from './tileArt';
import { createNpcRigSet } from './npcRig';
import { makeFeltTextures, makeWoodTextures, makeRimGeometry } from './boardMaterials';
import {
  deriveTableEvent,
  gazeSeat,
  reactionFor,
  restingEmotion,
  type TableEvent,
  type TableSnapshot,
} from './npcFocus';
import type { NpcId } from '@/content/npcs';

const TILE_W = 0.62;
const TILE_H = 0.82;
const TILE_D = 0.4;
/** Felt surface. Tiles are centred on y=0, so their undersides rest here. */
const TABLE_Y = -TILE_D / 2;
/**
 * Distance from table centre to a seat's character.
 *
 * Inside the felt (half-width 9.3), which is what makes the crop work. The bust
 * is sunk below the table surface, and a horizontal opaque plane viewed from
 * above occludes everything beneath it — so the felt itself hides the flat
 * bottom edge of the artwork. Pushing the characters out past the felt looks
 * like it should work better and does the opposite: out there nothing is left
 * to crop against and they float with a visible hard cut.
 */
const SEAT_RADIUS = 9.15;
/**
 * Where a seat's DOM plaque anchors: on the felt in front of the character,
 * not on the character. Projecting the character's own position put the name
 * card across their chest once they were actually drawn there.
 */
const PLAQUE_RADIUS = SEAT_RADIUS - 1.9;

export type TableMode = 'sea' | 'full' | 'board' | 'max';

/** Where each seat's DOM plaque should sit, in canvas pixels. */
export type SeatAnchors = Record<string, { x: number; y: number }>;

/** Rounded-rect tile body, extruded with a bevel so edges catch the light. */
function makeTileGeometry(): THREE.ExtrudeGeometry {
  const w = TILE_W;
  const h = TILE_H;
  const r = 0.09;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: TILE_D,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 5,
    curveSegments: 18,
  });
  geo.center();

  // ExtrudeGeometry's default UVs are world-ish; remap the face group to 0..1
  // so the tile artwork lands square on the front.
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(
      i,
      (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x),
      (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y),
    );
  }
  uv.needsUpdate = true;
  return geo;
}

function baseFaceCanvas(palette: TilePalette) {
  const W = 640;
  const H = 854;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = palette.faceBg;
  ctx.fillRect(0, 0, W, H);
  const sheen = ctx.createLinearGradient(0, 0, 0, H);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.07)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  return { canvas, ctx, W, H };
}

let maxAnisotropy = 8;
export function setMaxAnisotropy(value: number) { maxAnisotropy = value; }

function finishTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

async function makeFaceTexture(tile: Tile, palette: TilePalette): Promise<THREE.CanvasTexture> {
  const { canvas, ctx, W, H } = baseFaceCanvas(palette);
  try {
    const src = tileArtSrc(tile, 'png');
    const blob = await (await fetch(src)).blob();
    const full = await createImageBitmap(blob);
    const pad = W * 0.09;
    const scale = Math.min((W - pad * 2) / full.width, (H - pad * 2) / full.height);
    const dw = Math.round(full.width * scale);
    const dh = Math.round(full.height * scale);

    // The source art is 1200x1680; drawing it straight into this canvas is a
    // ~3x downscale, and canvas drawImage does that with a single bilinear
    // tap — which aliases badly and is what made the faces look crunchy.
    // Resampling through createImageBitmap gets a proper filtered downscale.
    const fitted = await createImageBitmap(full, {
      resizeWidth: dw,
      resizeHeight: dh,
      resizeQuality: 'high',
    });
    ctx.drawImage(fitted, Math.round((W - dw) / 2), Math.round((H - dh) / 2));
    full.close();
    fitted.close();
  } catch {
    /* prototype: a face that fails to rasterise just stays blank */
  }
  return finishTexture(canvas);
}

/** Mirrors RetroTile's diagonal back pattern. */
function makeBackTexture(): THREE.CanvasTexture {
  const W = 640;
  const H = 854;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2a4538';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1a2b1e';
  ctx.lineWidth = 10;
  for (let i = -H; i < W + H; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  return finishTexture(canvas);
}

interface ThreeTableProps {
  game: GameState;
  humanPlayerId: string;
  palette: TilePalette;
  mode: TableMode;
  onTileSelect?: (tile: Tile) => void;
  selectedTileId?: string;
  className?: string;
  /** Called on resize with each seat's projected screen position. */
  onSeatAnchors?: (anchors: SeatAnchors) => void;
  /** Which character sits at each seat, so they can be drawn IN the scene. */
  npcSeats?: Record<string, NpcId>;
  /** Beginner Assist: per-tile discard advice. Easy mode's whole point. */
  tutorColors?: Map<string, 'green' | 'orange' | 'red'>;
  suggestedTileId?: string;
}

/**
 * Matches TUTOR_COLORS in RetroTile, which resolves these same design tokens
 * (--color-success / --color-accent / --color-destructive in globals.css).
 * Rendered unlit so the advice colour is exactly the token — a lit material
 * would shade it, which is precisely what breaks a colour-coded assist.
 */
const TUTOR_HEX: Record<string, number> = {
  green: 0x5daf6a,
  orange: 0xc9a84c,
  red: 0xc75b4a,
  suggested: 0xffd166,
};

export default function ThreeTable(props: ThreeTableProps) {
  const { mode, className } = props;
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ sync: (p: ThreeTableProps) => void; dispose: () => void } | null>(null);
  // Seeded with the first render's props so the mount effect below can read a
  // correct `mode` immediately, then refreshed after every render. Writing it
  // during render instead would be a render-phase side effect, which React 19
  // treats as a correctness error rather than a style preference.
  const propsRef = useRef<ThreeTableProps>(props);
  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const initialMode = propsRef.current.mode;
    const isMax = initialMode === 'max';
    const isBoard = initialMode === 'board' || isMax;
    const isFull = initialMode === 'full';

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isMax ? 0.92 : isBoard ? 1.05 : 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

    const camera = new THREE.PerspectiveCamera(isBoard ? 38 : isFull ? 42 : 38, 1, 0.1, 120);
    if (isBoard) camera.position.set(0, 11.5, 13.2);
    else camera.position.set(0, isFull ? 6.0 : 7.6, isFull ? 8.6 : 6.4);
    const lookTarget = new THREE.Vector3(0, 0, isMax ? 2.4 : isBoard ? 1.4 : isFull ? 2.1 : 0.2);
    camera.lookAt(lookTarget);
    /** How far the camera looks down. The NPC rigs pitch back by this to stay upright. */
    const PITCH = THREE.MathUtils.degToRad(isMax ? 39 : 50);

    // --- Lighting
    scene.add(new THREE.AmbientLight(0x8899bb, isMax ? 0.18 : isBoard ? 0.85 : 1.1));
    const key = new THREE.DirectionalLight(0xfff1d6, isMax ? 1.35 : isBoard ? 2.7 : 2.4);
    key.position.set(-5.5, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(isMax ? 4096 : 2048, isMax ? 4096 : 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    const ext = isBoard ? 13 : 8;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    key.shadow.bias = -0.0009;
    key.shadow.radius = isMax ? 1.6 : 3;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fd0ff, isMax ? 0.18 : 0.5);
    fill.position.set(6, 5, -5);
    scene.add(fill);

    // --- Variant G: image-based lighting + bloom.
    // RoomEnvironment is generated in-engine, so there is no external HDR to
    // fetch — it gives the clearcoat faces something real to reflect without
    // adding a network asset or tripping the site's CSP.
    let pmrem: THREE.PMREMGenerator | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    let composer: EffectComposer | null = null;
    let composerTarget: THREE.WebGLRenderTarget | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let gtaoPass: GTAOPass | null = null;
    if (isMax) {
      pmrem = new THREE.PMREMGenerator(renderer);
      envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.3;

      // The renderer's `antialias: true` applies to the DEFAULT framebuffer
      // only. Rendering through a composer swaps that for a render target, and
      // EffectComposer's default target has samples: 0 — so every edge in the
      // scene went unantialiased the moment post-processing was switched on.
      // An explicitly multisampled target puts MSAA back.
      const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2());
      composerTarget = new THREE.WebGLRenderTarget(drawSize.width, drawSize.height, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      composer = new EffectComposer(renderer, composerTarget);
      composer.addPass(new RenderPass(scene, camera));

      // Ambient occlusion is where depth actually reads on this board: the
      // contact line under every tile, the crevices in the wall stacks, the
      // gaps between meld rows. It only ever darkens, so unlike extra geometry
      // or a brighter rim it buys depth without pulling the eye to the table.
      gtaoPass = new GTAOPass(scene, camera, 1, 1);
      gtaoPass.output = GTAOPass.OUTPUT.Default;
      gtaoPass.blendIntensity = 0.85;
      gtaoPass.updateGtaoMaterial({
        // World units. A tile is 0.62 wide, so this samples roughly half a tile
        // — enough to catch tile-to-felt contact without darkening whole areas.
        radius: 0.34,
        distanceExponent: 1.4,
        thickness: 0.6,
        scale: 1.05,
        samples: 16,
        screenSpaceRadius: false,
      });
      composer.addPass(gtaoPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        0.12, // strength — a sheen on lit tile edges, not a glow filter
        0.55, // radius
        1.0, // threshold: only genuine highlights bloom
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // --- Ground
    const boardDisposables: Array<{ dispose: () => void }> = [];
    if (isBoard) {
      // A real table: felt top plus a wooden rim, so the 3D board stands on
      // its own instead of borrowing the CSS felt.
      //
      // Both surfaces were flat-coloured boxes, which is why the table read as a
      // slab. The detail now lives in the material — cloth nap, wood grain, and
      // an edge falloff that darkens the board outward — rather than in bigger
      // shapes, so the table gains character without becoming what the eye goes
      // to first. See boardMaterials.ts.
      const feltTex = makeFeltTextures();
      boardDisposables.push(feltTex.map, feltTex.normalMap, feltTex.roughnessMap);
      const felt = new THREE.Mesh(
        new THREE.BoxGeometry(18.6, 0.5, 18.6),
        new THREE.MeshStandardMaterial({
          map: feltTex.map,
          normalMap: feltTex.normalMap,
          // Cloth fibre is far finer than the table-scale colour map, so the two
          // run at different repeats. three gives every map its own UV
          // transform, so this needs no second UV set.
          normalScale: new THREE.Vector2(0.55, 0.55),
          roughnessMap: feltTex.roughnessMap,
          roughness: 1,
          metalness: 0,
        }),
      );
      felt.position.y = TABLE_Y - 0.25;
      felt.receiveShadow = true;
      scene.add(felt);
      boardDisposables.push(felt.geometry, felt.material as THREE.Material);

      const woodTex = makeWoodTextures();
      boardDisposables.push(woodTex.map, woodTex.roughnessMap);
      const rimGeometry = makeRimGeometry(20.6, 18.4, 0.62);
      const rim = new THREE.Mesh(
        rimGeometry,
        new THREE.MeshStandardMaterial({
          map: woodTex.map,
          roughnessMap: woodTex.roughnessMap,
          roughness: 1,
          metalness: 0.04,
        }),
      );
      // makeRimGeometry normalises its top face to y=0, so this positions the
      // timber by where its surface sits. Barely proud of the felt: a raised lip
      // would frame the board and pull the eye to the edge.
      rim.position.y = TABLE_Y + 0.02;
      rim.receiveShadow = true;
      scene.add(rim);
      boardDisposables.push(rimGeometry, rim.material as THREE.Material);
    } else {
      // Shadow-only ground: the board's CSS felt shows through the transparent
      // canvas, so tiles sit on the real table rather than a paler second one.
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.ShadowMaterial({ opacity: 0.44 }),
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -TILE_D / 2 - 0.001;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);
    }

    const geometry = makeTileGeometry();
    const sideMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf6ead0, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4,
    });
    const backTexture = makeBackTexture();
    const backMaterial = new THREE.MeshPhysicalMaterial({
      map: backTexture, roughness: 0.55, clearcoat: 0.25,
    });

    const texCache = new Map<string, Promise<THREE.CanvasTexture>>();
    const matCache = new Map<string, THREE.MeshPhysicalMaterial>();
    const createdTextures: THREE.Texture[] = [backTexture];

    function faceMaterials(tile: Tile, pal: TilePalette): THREE.Material[] {
      const k = `${tileKey(tile)}|${pal.id}`;
      let mat = matCache.get(k);
      if (!mat) {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.22,
        });
        matCache.set(k, mat);
        let p = texCache.get(k);
        if (!p) {
          p = makeFaceTexture(tile, pal);
          texCache.set(k, p);
        }
        p.then(tex => {
          createdTextures.push(tex);
          mat!.map = tex;
          mat!.needsUpdate = true;
          // Faces arrive async. Under render-on-demand the frames budgeted for
          // this layout are long spent by then, so the texture has to ask for
          // its own redraw or the tile stays blank until the next move.
          invalidate();
        });
      }
      return [mat, sideMaterial];
    }
    const backMaterials: THREE.Material[] = [backMaterial, sideMaterial];

    const tileGroup = new THREE.Group();
    scene.add(tileGroup);

    // --- NPCs, in the scene rather than floating above it.
    //
    // Each character is a 2.5D rig — four rasterised slices of the portrait
    // spaced along z — that turns to look at whoever is acting. The two halves
    // are one feature: slices with nothing to turn them are an expensive flat
    // plane, and a turning flat plane is a sliding sticker. See npcRig.ts.
    //
    // `invalidate` is referenced through a closure rather than passed directly
    // because it is declared further down; calling it at construction time would
    // hit the temporal dead zone.
    const npcRigs = createNpcRigSet(scene, TABLE_Y, PITCH, () => invalidate());

    // Reaction bookkeeping. The prototype recovers "who just did what" by
    // diffing snapshots; see the note in npcFocus.ts about presentation/events.
    let prevSnapshot: TableSnapshot | null = null;
    let lastDiscarder: number | null = null;
    let tableEvent: TableEvent | null = null;
    /** A table event only holds the room's attention for so long. */
    let tableEventUntil = 0;
    const EVENT_ATTENTION_MS = 2200;
    /** Per-player wall-clock deadline after which a reaction decays to rest. */
    const reactionUntil = new Map<string, number>();
    /** Idle glances: when the next one is due, and when it should release. */
    const glanceDue = new Map<string, number>();
    const glanceUntil = new Map<string, number>();
    /** Seat of each rig, so a glance can pick somebody else to look at. */
    const seatOfPlayer = new Map<string, number>();

    const GLANCE_MIN_MS = 10000;
    const GLANCE_MAX_MS = 18000;
    const GLANCE_HOLD_MS = 1300;

    /**
     * Only one character may hold an idle glance at a time.
     *
     * Three independent glancers is both worse-looking — heads swivelling in
     * unison reads as uncanny rather than alive — and three times the cost.
     * Under render-on-demand every easing character is a redrawing GPU, so a
     * single token caps the idle duty cycle at one animator's worth instead of
     * letting it compound. Measured effect is in the prototype README.
     */
    let glanceHolder: string | null = null;

    const scheduleGlance = (playerId: string, now: number) => {
      glanceDue.set(playerId, now + GLANCE_MIN_MS + Math.random() * (GLANCE_MAX_MS - GLANCE_MIN_MS));
    };

    /** World position a seat's character occupies. */
    const seatPosition = (seat: number) => seatToWorld(0, SEAT_RADIUS, seat);

    /**
     * Who to glance at when nothing is happening.
     *
     * Weighted toward the other characters on purpose — a table where everyone
     * only ever looks at the player is the thing this is meant to fix — but not
     * exclusively, or the player stops existing in the scene.
     */
    const pickGlanceSeat = (seat: number) => {
      if (Math.random() < 0.3) return 0;
      const others = [1, 2, 3].filter(s => s !== seat);
      return others[Math.floor(Math.random() * others.length)];
    };

    const meshes = new Map<string, THREE.Mesh>();
    const pickable: THREE.Mesh[] = [];
    const bars = new Map<string, THREE.Mesh>();
    const seenBars = new Set<string>();
    const barGeometry = new THREE.BoxGeometry(TILE_W * 0.82, 0.06, 0.14);

    // Frames still owed to the compositor after a change (see the frame loop).
    let dirty = 3;
    const invalidate = () => { dirty = 2; };

    /** Advice lozenges only exist for tiles the tutor spoke about this turn. */
    function sweepBars() {
      for (const [id, bar] of bars) bar.visible = seenBars.has(id);
    }

    /** Rotate a seat-local (x,z) into world space. Seat 0 is nearest camera. */
    function seatToWorld(lx: number, lz: number, seat: number) {
      const a = -seat * (Math.PI / 2);
      return { x: lx * Math.cos(a) - lz * Math.sin(a), z: lx * Math.sin(a) + lz * Math.cos(a) };
    }

    function acquire(
      id: string,
      tile: Tile | null,
      pal: TilePalette,
      seen: Set<string>,
    ): THREE.Mesh {
      seen.add(id);
      let mesh = meshes.get(id);
      if (!mesh) {
        mesh = new THREE.Mesh(geometry, tile ? faceMaterials(tile, pal) : backMaterials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        tileGroup.add(mesh);
        meshes.set(id, mesh);
      }
      return mesh;
    }

    function layout(p: ThreeTableProps) {
      const seen = new Set<string>();
      pickable.length = 0;
      seenBars.clear();
      const { game, palette: pal } = p;
      const boardMode = p.mode === 'board' || p.mode === 'max';
      const players = game.players;
      const humanIndex = players.findIndex(pl => pl.id === p.humanPlayerId);
      const seatOf = (i: number) => (i - humanIndex + players.length) % players.length;
      // Discard geometry. DISCARD_START must stay greater than the block's own
      // half-width or adjacent seats' blocks intersect at the corners — that is
      // the tile-overlap bug. 7 cols: half-width 2.36, start 2.5.
      const cols = 7;
      const DISCARD_START = 2.5;
      const DISCARD_ROW = TILE_H * 1.1;

      // --- Discards: a block per seat, in front of that player.
      players.forEach((player, i) => {
        const seat = seatOf(i);
        const tiles = game.playerDiscards?.[player.id] ?? [];
        tiles.forEach((tile, n) => {
          const lx = ((n % cols) - (cols - 1) / 2) * TILE_W * 1.1;
          const lz = DISCARD_START + Math.floor(n / cols) * DISCARD_ROW;
          const { x, z } = seatToWorld(lx, lz, seat);
          const mesh = acquire(`d:${tile.id}`, tile, pal, seen);
          if (mesh.userData.init !== true) {
            mesh.userData.init = true;
            mesh.position.set(x, 2.4, z); // drops in
            mesh.rotation.set(-Math.PI / 2, 0, -seat * (Math.PI / 2));
          }
          mesh.position.x = x;
          mesh.position.z = z;
          mesh.userData.targetY = 0;
        });
      });

      if (p.mode === 'sea') {
        for (const [id, mesh] of meshes) {
          if (!seen.has(id)) { tileGroup.remove(mesh); meshes.delete(id); }
        }
        sweepBars();
        invalidate();
        return;
      }

      // --- Human hand: upright, facing the camera.
      const hand = players[humanIndex]?.hand ?? [];
      const handZ = boardMode ? 7.6 : 4.35;
      hand.forEach((tile, n) => {
        const mesh = acquire(`h:${tile.id}`, tile, pal, seen);
        const isSel = tile.id === p.selectedTileId;
        const isSuggested = tile.id === p.suggestedTileId;
        const x = (n - (hand.length - 1) / 2) * TILE_W * 1.06;
        mesh.userData.tile = tile;
        mesh.userData.init = true;
        mesh.rotation.set(-0.34, 0, 0);
        mesh.position.set(
          x,
          (isSel ? 0.42 : isSuggested ? 0.3 : 0.16) + TILE_H / 2 - 0.12,
          handZ,
        );
        mesh.userData.targetY = mesh.position.y;
        pickable.push(mesh);

        // Beginner Assist strip. The DOM hand carried this as a coloured bar
        // across the tile face; in 3D it becomes a lozenge at the tile's foot.
        const advice = isSuggested ? 'suggested' : p.tutorColors?.get(tile.id);
        if (advice) {
          let bar = bars.get(tile.id);
          if (!bar) {
            bar = new THREE.Mesh(barGeometry, new THREE.MeshBasicMaterial());
            tileGroup.add(bar);
            bars.set(tile.id, bar);
          }
          (bar.material as THREE.MeshBasicMaterial).color.setHex(TUTOR_HEX[advice]);
          bar.position.set(x, 0.03, handZ + 0.33);
          bar.visible = true;
          seenBars.add(tile.id);
        }
      });

      if (!boardMode) {
        for (const [id, mesh] of meshes) {
          if (!seen.has(id)) { tileGroup.remove(mesh); meshes.delete(id); }
        }
        sweepBars();
        invalidate();
        return;
      }

      // --- Opponent hands: face-down, standing along their edge.
      players.forEach((player, i) => {
        const seat = seatOf(i);
        if (seat === 0) return;
        const count = player.hand.length;
        for (let n = 0; n < count; n++) {
          const lx = (n - (count - 1) / 2) * TILE_W * 1.06;
          const { x, z } = seatToWorld(lx, 7.6, seat);
          const mesh = acquire(`o:${player.id}:${n}`, null, pal, seen);
          mesh.userData.init = true;
          mesh.rotation.set(-0.16, -seat * (Math.PI / 2), 0, 'YXZ');
          mesh.position.set(x, TILE_H / 2 - 0.1, z);
          mesh.userData.targetY = mesh.position.y;
        }
      });

      // --- NPC characters at their seats.
      if (p.npcSeats) {
        // Everything below works in seat space (0 = human, clockwise), because
        // that is what the gaze geometry and npcFocus both speak.
        const bySeat: string[] = [];
        players.forEach((pl, i) => { bySeat[seatOf(i)] = pl.id; });
        const meldsOf = (id: string) => players.find(pl => pl.id === id)?.melds.length ?? 0;

        const snapshot: TableSnapshot = {
          discards: bySeat.map(id => (game.playerDiscards?.[id] ?? []).length),
          melds: bySeat.map(id => meldsOf(id)),
          current: seatOf(game.currentPlayerIndex),
          finished: isGameFinished(game),
          winner: game.winnerId ? seatOf(players.findIndex(pl => pl.id === game.winnerId)) : null,
        };

        const event = deriveTableEvent(prevSnapshot, snapshot, lastDiscarder);
        if (event) {
          tableEvent = event;
          tableEventUntil = performance.now() + EVENT_ATTENTION_MS;
        }
        if (event?.kind === 'discard') lastDiscarder = event.seat;
        prevSnapshot = snapshot;

        const now = performance.now();
        const seen = new Set<string>();
        players.forEach((player, i) => {
          const seat = seatOf(i);
          if (seat === 0) return;
          const npcId = p.npcSeats?.[player.id];
          if (!npcId) return;
          seen.add(player.id);
          seatOfPlayer.set(player.id, seat);
          npcRigs.ensure(player.id, npcId, seat, seatPosition(seat), camera);
          if (!glanceDue.has(player.id)) scheduleGlance(player.id, now);

          // A reaction overrides the resting expression until it decays. Only
          // the face slice re-rasterises, so this is one texture, not a rig.
          const reaction = reactionFor(seat, event);
          if (reaction) {
            npcRigs.setEmotion(player.id, reaction.emotion);
            reactionUntil.set(player.id, now + reaction.holdMs);
          } else if ((reactionUntil.get(player.id) ?? 0) <= now) {
            npcRigs.setEmotion(player.id, restingEmotion(seat, snapshot.current));
          }

          // Look at whoever just acted. A glance in flight owns the gaze until
          // it releases, so a head does not snap mid-glance.
          if ((glanceUntil.get(player.id) ?? 0) <= now) {
            const target = gazeSeat(seat, tableEvent, snapshot.current);
            npcRigs.setGaze(player.id, target === seat ? null : seatPosition(target));
          }
          npcRigs.setLeaning(player.id, snapshot.current === seat);
        });
        npcRigs.sweep(seen);
      }

      // --- Exposed melds: face-up, just inside each player's hand.
      players.forEach((player, i) => {
        const seat = seatOf(i);
        player.melds.forEach((meld: MeldInfo, mi) => {
          meld.tiles.forEach((tile, ti) => {
            const lx = -3.4 + mi * (TILE_W * 3.4) + ti * TILE_W * 1.04;
            const { x, z } = seatToWorld(lx, 5.95, seat);
            const mesh = acquire(`m:${player.id}:${mi}:${ti}`, tile, pal, seen);
            mesh.userData.init = true;
            mesh.rotation.set(-Math.PI / 2, 0, -seat * (Math.PI / 2));
            mesh.position.set(x, 0, z);
            mesh.userData.targetY = 0;
          });
        });
      });

      // --- The wall: face-down, stacked two high, ringing the table.
      const remaining = game.wall.length;
      const perSide = Math.ceil(remaining / 8); // 4 sides x 2 levels
      let placed = 0;
      for (let side = 0; side < 4 && placed < remaining; side++) {
        for (let n = 0; n < perSide && placed < remaining; n++) {
          for (let level = 0; level < 2 && placed < remaining; level++) {
            const lx = (n - (perSide - 1) / 2) * TILE_W * 1.06;
            const { x, z } = seatToWorld(lx, 6.75, side);
            const mesh = acquire(`w:${side}:${n}:${level}`, null, pal, seen);
            mesh.userData.init = true;
            mesh.castShadow = false; // 100+ extra shadow casters for no visual gain
            mesh.rotation.set(-Math.PI / 2, 0, -side * (Math.PI / 2));
            mesh.position.set(x, level * TILE_D * 1.02, z);
            mesh.userData.targetY = mesh.position.y;
            placed++;
          }
        }
      }

      for (const [id, mesh] of meshes) {
        if (!seen.has(id)) { tileGroup.remove(mesh); meshes.delete(id); }
      }
      sweepBars();
      invalidate();
    }

    layout(propsRef.current);

    // --- Click picking — the 3D replacement for a per-tile <button>
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function onClick(e: MouseEvent) {
      const p = propsRef.current;
      if (p.mode === 'sea' || !p.onTileSelect) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickable, false)[0];
      if (hit) p.onTileSelect((hit.object as THREE.Mesh).userData.tile as Tile);
    }
    renderer.domElement.addEventListener('click', onClick);

    // --- Dynamic framing.
    // The 3D board has no flexbox: nothing reflows when the viewport changes,
    // so the camera has to do the layout. Fit the table's bounding sphere to
    // whichever of the two FOVs is tighter, and the board fills any aspect
    // ratio — wide desktop or tall phone — without cropping the hand.
    const CONTENT_RADIUS = isMax ? 7.8 : 8.7;

    function fitCamera(w: number, h: number) {
      camera.aspect = w / h;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const dist = Math.max(
        CONTENT_RADIUS / Math.tan(vFov / 2),
        CONTENT_RADIUS / Math.tan(hFov / 2),
      );
      camera.position.set(
        0,
        lookTarget.y + dist * Math.sin(PITCH),
        lookTarget.z + dist * Math.cos(PITCH),
      );
      camera.lookAt(lookTarget);
      camera.updateProjectionMatrix();
    }

    /** Project each seat's world position to canvas pixels for its DOM plaque. */
    function emitSeatAnchors(w: number, h: number) {
      const p = propsRef.current;
      if (!p.onSeatAnchors) return;
      const players = p.game.players;
      const humanIndex = players.findIndex(pl => pl.id === p.humanPlayerId);
      const anchors: SeatAnchors = {};
      const v = new THREE.Vector3();
      players.forEach((player, i) => {
        const seat = (i - humanIndex + players.length) % players.length;
        if (seat === 0) return;
        const { x, z } = seatToWorld(0, PLAQUE_RADIUS, seat);
        v.set(x, TABLE_Y, z).project(camera);
        // Clamp into the canvas: on a narrow viewport the side seats project
        // past the edge, and a plaque half off-screen is worse than one nudged
        // inward. This is the DOM-overlay tax that the 2D rim layout never paid.
        const padX = Math.min(96, w * 0.26);
        const padY = Math.min(44, h * 0.1);
        anchors[player.id] = {
          x: THREE.MathUtils.clamp(((v.x + 1) / 2) * w, padX, w - padX),
          y: THREE.MathUtils.clamp(((1 - v.y) / 2) * h, padY, h - padY),
        };
      });
      p.onSeatAnchors(anchors);
    }

    function resize() {
      const w = mount!.clientWidth || 1;
      const h = mount!.clientHeight || 1;
      renderer.setSize(w, h, false);
      if (isBoard) {
        fitCamera(w, h);
      } else {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      composer?.setSize(w, h);
      bloomPass?.setSize(w, h);
      const dw = Math.floor(w * renderer.getPixelRatio());
      const dh = Math.floor(h * renderer.getPixelRatio());
      composerTarget?.setSize(dw, dh);
      // EffectComposer.setSize forwards CSS pixels to every pass, but AO is
      // sampled against the real depth buffer — at CSS size on a 2x display it
      // would sample half the pixels it is compositing onto.
      gtaoPass?.setSize(dw, dh);
      emitSeatAnchors(w, h);
      invalidate();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Camera is fixed. An idle drift reads as drunk rather than cinematic, and
    // it fights the board's job of holding still while you read the discards.
    let raf = 0;
    let lastTime = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = now;

      // Exponential settle expressed per SECOND, not per frame. The old
      // `+= delta * 0.18` converged 2.4x faster on a 144Hz screen than on 60Hz
      // and stuttered whenever the frame interval wobbled — that was the jitter.
      const k = 1 - Math.exp(-11 * dt);
      let animating = false;
      for (const mesh of meshes.values()) {
        const target = (mesh.userData.targetY as number) ?? 0;
        const delta = target - mesh.position.y;
        if (Math.abs(delta) > 0.0015) {
          mesh.position.y += delta * k;
          animating = true;
        } else if (mesh.position.y !== target) {
          mesh.position.y = target;
          animating = true;
        }
      }

      // NPC gaze, lean, reaction decay and idle glances.
      //
      // This is the one thing that costs idle frames. Everything else on this
      // board settles and then goes quiet; characters that never move again read
      // as frozen, so glances keep them alive at roughly a 6% duty cycle.
      const rigIds = npcRigs.ids();
      if (rigIds.length) {
        const current = prevSnapshot?.current ?? 0;
        if (tableEvent && now >= tableEventUntil) tableEvent = null;

        for (const id of rigIds) {
          const seat = seatOfPlayer.get(id);
          if (seat === undefined) continue;

          const restGaze = () => {
            const target = gazeSeat(seat, tableEvent, current);
            npcRigs.setGaze(id, target === seat ? null : seatPosition(target));
          };

          const holding = glanceUntil.get(id) ?? 0;
          if (holding > 0) {
            if (now >= holding) {
              glanceUntil.set(id, 0);
              if (glanceHolder === id) glanceHolder = null;
              restGaze();
              scheduleGlance(id, now);
            }
          } else if (now >= (glanceDue.get(id) ?? Infinity)) {
            // A real event, or somebody else already glancing, outranks an idle
            // glance; just push this one back rather than dropping it.
            if (tableEvent || glanceHolder !== null) {
              scheduleGlance(id, now);
            } else {
              glanceHolder = id;
              npcRigs.setGaze(id, seatPosition(pickGlanceSeat(seat)));
              glanceUntil.set(id, now + GLANCE_HOLD_MS);
            }
          }

          const reacting = reactionUntil.get(id) ?? 0;
          if (reacting > 0 && now >= reacting) {
            reactionUntil.set(id, 0);
            npcRigs.setEmotion(id, restingEmotion(seat, current));
          }
        }
        if (npcRigs.update(dt)) animating = true;
      }

      // Render on demand. The board is static between moves, so redrawing a
      // shadow-mapped, bloomed scene 60x a second bought nothing and kept the
      // GPU hot — which is what made the frame pacing uneven in the first place.
      const w = window as unknown as Record<string, number>;
      w.__protoTicks = (w.__protoTicks ?? 0) + 1;
      if (animating || dirty > 0) {
        if (animating) w.__protoAnimFrames = (w.__protoAnimFrames ?? 0) + 1;
        if (dirty > 0) dirty--;
        if (composer) composer.render();
        else renderer.render(scene, camera);
        w.__protoRenders = (w.__protoRenders ?? 0) + 1;
      }
      // Wall-clock, so the effect of the dt clamp below is visible in the trace.
      w.__protoElapsed = now;
    }
    raf = requestAnimationFrame(frame);

    apiRef.current = {
      sync: layout,
      dispose: () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        renderer.domElement.removeEventListener('click', onClick);
        geometry.dispose();
        barGeometry.dispose();
        npcRigs.dispose();
        boardDisposables.forEach(d => d.dispose());
        bars.forEach(b => (b.material as THREE.Material).dispose());
        sideMaterial.dispose();
        backMaterial.dispose();
        matCache.forEach(m => m.dispose());
        createdTextures.forEach(tex => tex.dispose());
        gtaoPass?.dispose();
        composer?.dispose();
        composerTarget?.dispose();
        envRT?.dispose();
        pmrem?.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      },
    };

    return () => {
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // Scene is built once; prop changes flow through the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GameBoard re-renders several times a second while the claim and turn
  // timers tick. Relaying out the whole scene on each of those was pure churn
  // — allocating, rebuilding maps, dirtying the renderer — for a board that
  // had not changed. Only sync when something the scene actually draws moved.
  const sigRef = useRef('');
  useEffect(() => {
    const p = propsRef.current;
    const sig = [
      p.mode,
      p.palette.id,
      p.selectedTileId ?? '',
      p.suggestedTileId ?? '',
      p.game.wall.length,
      p.game.players
        .map(pl =>
          [
            pl.id,
            pl.hand.map(t => t.id).join(','),
            pl.melds.length,
            (p.game.playerDiscards?.[pl.id] ?? []).length,
          ].join(':'),
        )
        .join('|'),
      p.tutorColors ? Array.from(p.tutorColors).map(([k, v]) => k + v).join(',') : '',
    ].join('#');
    if (sig === sigRef.current) return;
    sigRef.current = sig;
    const w = window as unknown as Record<string, number>;
    w.__protoLayouts = (w.__protoLayouts ?? 0) + 1;
    apiRef.current?.sync(p);
  });

  return (
    <div
      ref={mountRef}
      className={className ?? 'proto-three-mount'}
      style={
        mode === 'board' || mode === 'max'
          ? undefined
          : { width: '100%', height: mode === 'full' ? 'clamp(300px, 52vh, 560px)' : 'clamp(230px, 40vh, 430px)' }
      }
    />
  );
}
