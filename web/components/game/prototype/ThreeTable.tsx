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
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Tile, tileKey } from '@/models/Tile';
import type { GameState, MeldInfo } from '@/models/GameState';
import type { TilePalette } from '@/lib/cosmetics';
import { tileArtSrc } from './tileArt';
import { renderPortraitCanvas } from './portraitTexture';
import type { NpcId, NpcEmotion } from '@/content/npcs';

const TILE_W = 0.62;
const TILE_H = 0.82;
const TILE_D = 0.4;

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
  const src = tileArtSrc(tile, 'png');
  if (src) {
    try {
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
  const propsRef = useRef<ThreeTableProps>(null!);
  propsRef.current = props;

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
    if (isBoard) {
      // A real table: felt top plus a wooden rim, so the 3D board stands on
      // its own instead of borrowing the CSS felt.
      const felt = new THREE.Mesh(
        new THREE.BoxGeometry(18.6, 0.5, 18.6),
        new THREE.MeshStandardMaterial({ color: 0x1d5140, roughness: 0.98, metalness: 0 }),
      );
      felt.position.y = -TILE_D / 2 - 0.25;
      felt.receiveShadow = true;
      scene.add(felt);

      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(20.2, 0.62, 20.2),
        new THREE.MeshStandardMaterial({ color: 0x4a2f1d, roughness: 0.62, metalness: 0.05 }),
      );
      rim.position.y = -TILE_D / 2 - 0.42;
      rim.receiveShadow = true;
      scene.add(rim);
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
    // Unlit: these are flat stylised 2D characters, and shading them with the
    // table's key light makes them read as cardboard. The scene's job here is
    // placement and occlusion, not relighting the art.
    const portraits = new Map<string, THREE.Mesh>();
    const portraitGeometry = new THREE.PlaneGeometry(3.1, 3.72);
    function ensurePortrait(playerId: string, npcId: NpcId, emotion: NpcEmotion, seat: number) {
      const key = `${playerId}:${npcId}:${emotion}`;
      const existing = portraits.get(playerId);
      if (existing && existing.userData.key === key) return;
      if (existing) {
        tileGroup.remove(existing);
        (existing.material as THREE.MeshBasicMaterial).map?.dispose();
        (existing.material as THREE.Material).dispose();
        portraits.delete(playerId);
      }
      const mesh = new THREE.Mesh(
        portraitGeometry,
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }),
      );
      mesh.userData.key = key;
      mesh.renderOrder = 2;
      const { x, z } = seatToWorld(0, 9.15, seat);
      mesh.position.set(x, 2.05, z);
      tileGroup.add(mesh);
      portraits.set(playerId, mesh);
      renderPortraitCanvas(npcId, emotion, 512).then(canvas => {
        const tex = finishTexture(canvas);
        createdTextures.push(tex);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.map = tex;
        mat.opacity = 1;
        mat.needsUpdate = true;
        mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
        invalidate();
      });
    }
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
        players.forEach((player, i) => {
          const seat = seatOf(i);
          if (seat === 0) return;
          const npcId = p.npcSeats?.[player.id];
          if (!npcId) return;
          const isTheirTurn = game.currentPlayerIndex === i;
          ensurePortrait(player.id, npcId, isTheirTurn ? 'thinking' : 'idle', seat);
          const mesh = portraits.get(player.id);
          if (mesh) mesh.lookAt(camera.position.x, mesh.position.y, camera.position.z);
        });
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
    const PITCH = THREE.MathUtils.degToRad(isMax ? 39 : 50);

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
        const { x, z } = seatToWorld(0, 9.15, seat);
        v.set(x, 0.16, z).project(camera);
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
      composerTarget?.setSize(Math.floor(w * renderer.getPixelRatio()), Math.floor(h * renderer.getPixelRatio()));
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

      // Render on demand. The board is static between moves, so redrawing a
      // shadow-mapped, bloomed scene 60x a second bought nothing and kept the
      // GPU hot — which is what made the frame pacing uneven in the first place.
      const w = window as unknown as Record<string, number>;
      w.__protoTicks = (w.__protoTicks ?? 0) + 1;
      if (animating || dirty > 0) {
        if (dirty > 0) dirty--;
        if (composer) composer.render();
        else renderer.render(scene, camera);
        w.__protoRenders = (w.__protoRenders ?? 0) + 1;
      }
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
        portraitGeometry.dispose();
        portraits.forEach(m => { const mm = m.material as THREE.MeshBasicMaterial; mm.map?.dispose(); mm.dispose(); });
        bars.forEach(b => (b.material as THREE.Material).dispose());
        sideMaterial.dispose();
        backMaterial.dispose();
        matCache.forEach(m => m.dispose());
        createdTextures.forEach(tex => tex.dispose());
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
