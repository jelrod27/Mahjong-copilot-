# RESEARCH — 3D tile asset pipeline and licensing for a full HK set

Ticket: https://github.com/jelrod27/Mahjong-copilot-/issues/104
Date: 2026-08-02
Repo: `/home/justin/Projects/Mahjong`, branch `prototype/tile-faces`, three r0.185.1
Extends (does not repeat): `docs/tile-rendering-research.md` (2026-05-06, 2D SVG/DOM survey)

---

## 0. Executive answer

1. **The licensing problem is already solved and nobody noticed.** The set vendored at
   `assets/HK-mahjong-tiles-master/` is **CC0 / public domain** and is **exactly the 42
   distinct HK faces** — complete, flowers and seasons included. The 2026-05-06 survey's
   "completeness trap" (CC0-but-incomplete vs complete-but-share-alike) does not apply,
   because that survey never evaluated this source. **There is no reason to touch CC BY-SA
   art, and therefore no share-alike question to answer in practice.**
2. **You do not need authored glTF tile models.** Nobody models engraved CJK glyphs as
   triangles. In both the procedural and the glTF pipeline the engraving comes from a
   bump/normal map. Keep `THREE.ExtrudeGeometry`; add a height map. Geometry is shared and
   is not the bottleneck.
3. **The fix is right-sizing + GPU compression, not an atlas.** An atlas saves draw calls,
   not memory, and at these counts it is *worse* than the alternatives. 640×854 RGBA8 →
   384×512 UASTC-transcoded-to-BC7/ASTC takes the full 43-texture set from **119.5 MiB to
   10.75 MiB** (the ticket's 34-face figure: **94.5 MiB → 8.6 MiB**).
4. **KTX2 in this app is CSP-blocked today, in two independent ways, and one of them only
   fails in production.** This is the biggest landmine in the ticket. See §5.
5. **Textures are only about half the mobile memory problem.** Variant `max`'s 4096²
   shadow map and the 4×MSAA EffectComposer targets plausibly exceed the texture budget.
   See §9.

---

## 1. The HK set: what actually has to exist on the GPU

### 1.1 Face count — confirmed

A Hong Kong set is **144 physical tiles / 42 distinct faces**:

| Group | Distinct faces | Copies | Physical tiles |
|---|---|---|---|
| Characters 萬 1–9 | 9 | ×4 | 36 |
| Circles/Dots 筒 1–9 | 9 | ×4 | 36 |
| Bamboos 索 1–9 | 9 | ×4 | 36 |
| Winds 東南西北 | 4 | ×4 | 16 |
| Dragons 中發白 | 3 | ×4 | 12 |
| Flowers (Plum/Orchid/Chrysanthemum/Bamboo) | 4 | ×1 | 4 |
| Seasons (Spring/Summer/Autumn/Winter) | 4 | ×1 | 4 |
| **Total** | **42** | | **144** |

Corroborated externally: "A standard Hong Kong Mahjong set has 144 tiles made up of 42
unique designs" — [TileBuddy, All 42 Mahjong Tiles Explained](https://tilebuddy.app/blog/mahjong-tiles-explained/);
[Wikipedia, Mahjong tiles](https://en.wikipedia.org/wiki/Mahjong_tiles).

**GPU asset count = 42 faces + 1 back = 43 textures.** Not 144. The remaining 102 tiles are
transform matrices. The tile *side* is untextured (`sideMaterial` is a flat
`MeshPhysicalMaterial`) and stays that way.

The ticket's "~34 distinct types in a typical hand" is the *hot* set; the *resident* set
must be budgeted at 43, because a full match will touch every face.

### 1.2 The vendored asset — verified

`assets/HK-mahjong-tiles-master/` (upstream: `samoheen/mahjong-tiles`)

- `LICENSE.md`: *"All files in this repository are [Public Domain](https://creativecommons.org/publicdomain/zero/1.0/)"*
  — CC0 1.0. `README.md` repeats it with a CC0 badge.
- `hongkong/svg/` — **42 SVG**, `hongkong/png/` — **42 PNG** (the 43rd PNG the ticket
  counts is `hongkong.png`, the repo's preview sheet at the root).
- Filenames enumerate exactly the 42 faces above:
  `01-white-dragon` … `03-red-dragon`, `04-east-wind` … `07-north-wind`,
  `08..16-characters-1..9`, `17..25-circles-1..9`, `26..34-bamboos-1..9`,
  `35-spring` … `38-winter`, `39-plum` … `42-bamboo`.
- SVG canvas `300×420`; art occupies `246×315` on a transparent ground (per
  `web/components/game/prototype/tileArt.ts` — the palette paints the tile face behind it).
- PNG exports are `1200×1680`, but **not uniformly** — `02-green-dragon.png` is `1183×1680`.
  Any build step must letterbox to a fixed canvas rather than assume a constant size. The
  runtime already does this (`Math.min` fit + centre in `makeFaceTexture`); move it to build time.
- Disk: 316 KB SVG / 1.2 MB PNG. Both are already copied to
  `web/public/tiles/hk` and `web/public/tiles/hk-png`.
- **White dragon style:** `01-white-dragon.svg` is a *nested rounded-rectangle frame* on a
  blank ground — the 白板 bordered-blank, which is the standard HK physical tile. This is
  the correct HK form and is *not* the Riichi blank (no markings at all). The 2026-05-06
  survey asserted the HK white dragon "shows the Chinese character 白"; that is one attested
  printing, but the bordered blank is the more common physical HK tile and is what this set
  ships. **Not a gap.**
- **No tile-back art.** The prototype draws the back procedurally (`makeBackTexture`,
  diagonal hatch on `#2a4538`). That stays procedural and is baked once at build time.

**Residual licensing risk (low, worth recording):** the repo asserts CC0 with no per-file
provenance. If any glyph were traced from a third party the dedication would be ineffective.
Mitigation is already in place — the set is vendored into the tree rather than pulled at
build time. Add the upstream URL + commit SHA + retrieval date to a `PROVENANCE.md` beside
the assets.

---

## 2. Geometry: procedural extrude vs authored glTF

### 2.1 What each can actually deliver for an *engraved glyph*

The framing in the ticket implies a choice between "extruded procedural geometry" and
"authored glTF with baked normal/roughness". For the glyph specifically, **that choice does
not exist**: no real-time pipeline models engraved CJK strokes as triangles.

- A single 萬 outline, faithfully tessellated with an engrave wall, is thousands of
  triangles. Doing that for 42 faces means 42 *distinct* meshes (no shared geometry, no
  instancing, 42× the vertex buffers) to gain detail that is invisible above ~200 screen px.
- The standard game-art answer is the bake: *"Details from a high-poly model are baked onto
  a more efficient low-poly version using normal and other texture maps… The detail lives in
  the maps, not the mesh"* —
  [nastyrodent, High-Poly to Low-Poly](https://nastyrodent.com/high-poly-to-low-poly-baking/).
  Its documented failure mode is silhouette and extreme close-up
  ([blog.pixlnexs.com](https://blog.pixlnexs.com/low-poly-vs-high-poly-3d-models/)) — neither
  applies: the glyph is interior to the face and the camera is a fixed table view.

So **the engraving is a texture in both pipelines**, and the real question is only what the
*tile body* is made of.

### 2.2 The body

`makeTileGeometry()` (ThreeTable.tsx:42-82) builds a rounded-rect `Shape` (4 lines,
4 quadratic corners) extruded with `depth 0.4, bevelThickness 0.035, bevelSize 0.03,
bevelSegments 5, curveSegments 18`, then remaps face UVs to 0..1.

Triangle estimate at current settings: outline ≈ `4×18 + 4 = 76` points; wall rings =
`bevelSegments×2 + 1 = 11` → `76×11 = 836` quads ≈ **1,672 tris**, plus two triangulated
76-gon caps ≈ 148 → **≈1,820 tris/tile**. At `curveSegments 8 / bevelSegments 3` it drops to
**≈570 tris** — a 3.2× cut from changing two numbers, no glTF required.

**Crucially the geometry is created once and shared by every tile mesh**, so vertex *memory*
is O(1) (~200 KB) regardless of 144 tiles. Only per-draw vertex shading scales, and the
prototype already measured **12 GPU renders in an entire session** under render-on-demand.
Geometry is not a problem and should not be optimised.

### 2.3 What glTF would genuinely buy, and what it costs

Buys: a slightly dished face (real tiles are not flat), a non-uniform chamfer profile,
separate UV islands for face/side/back, and an artist-tunable silhouette.

Costs: Blender in the loop, a high→low bake, an export step, `GLTFLoader` (+~25 KB gz) on top
of `KTX2Loader`, loss of runtime-tunable `TILE_W/H/D`, and **you still need all 42 face
textures**. No complete CC0 HK 144-tile glTF set exists — searching Sketchfab/CGTrader turns
up individual tiles and Japanese sets, not a licensable complete HK set
([Sketchfab mahjong tag](https://sketchfab.com/tags/mahjong)).

### 2.4 Recommendation

**Keep procedural.** Add engraving as a **bump map** (three's `bumpMap` is Mikkelsen
screen-space-derivative bump — `bumpmap_pars_fragment.glsl.js` computes `dFdx/dFdy` of the
height and perturbs the normal, which is exactly the "carved edge catches the key light"
effect, at zero geometry cost). Reduce `curveSegments 18→10` and `bevelSegments 5→4` only if
a real-device profile asks for it.

One trap: `bumpMap` samples `.x` (red). **Do not point `bumpMap` at the colour texture** —
the red dragon 中 is red (`R=1` → reads as a *raised* glyph) while 發 is green (`R=0` → a
groove). The relief would invert between tiles. Ship a dedicated single-channel height map
derived from the art's alpha (§3.4).

---

## 3. Texture strategy, with numbers

### 3.1 The formats and their real cost

Block sizes, from [Khronos KTX Developer Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXDeveloperGuide.md):
ASTC 4×4 and BC7 and ETC2-RGBA = **16 bytes / 4×4 block = 8 bpp = 1.0 B/px**;
BC1 and ETC1 and PVRTC1 = **8 bytes / block = 4 bpp = 0.5 B/px**. RGBA8 = 32 bpp = 4 B/px.
A full mip chain multiplies by 4/3.

Basis modes ([BinomialLLC wiki](https://github.com/BinomialLLC/basis_universal/wiki/Transcoder-Texture-Format-Support-for-ETC1S-and-UASTC-LDR-4x4)):
ETC1S is *"a roughly .3–3 bpp low to medium quality supercompressed mode"* (that is the
**file** rate); UASTC LDR 4×4 is *"an 8 bits/pixel LDR high quality mode… a 19 mode subset of
standard ASTC LDR 4×4"*. On the GPU, ETC1S transcodes to BC1/ETC1 (4 bpp) **when opaque**,
and to BC3/ETC2-RGBA/ASTC (8 bpp) **when it carries alpha**. UASTC always lands at 8 bpp.

> **Non-obvious consequence that decides this ticket:** the tile art is a glyph on a
> transparent ground, so the face texture *needs alpha*. With alpha, ETC1S and UASTC cost
> **the same 8 bpp on the GPU** — ETC1S's memory advantage evaporates and only its quality
> disadvantage remains. **UASTC is therefore strictly correct here**, not a luxury.

### 3.2 Per-face memory (bytes, incl. full mip chain ×4/3)

| Resolution | RGBA8 | UASTC → BC7/ASTC 4×4 (8 bpp) | ETC1S opaque → BC1/ETC1 (4 bpp) | ETC1S **with alpha** → BC3/ETC2 (8 bpp) |
|---|---|---|---|---|
| 640×854 *(current)* | 2,914,987 (**2.78 MiB**) | 728,747 (712 KiB) | 364,373 (356 KiB) | 728,747 (712 KiB) |
| 512×512 | 1,398,101 (1.33 MiB) | 349,525 (341 KiB) | 174,763 (171 KiB) | 349,525 (341 KiB) |
| **384×512** *(recommended)* | 1,048,576 (1.00 MiB) | **262,144 (256 KiB)** | 131,072 (128 KiB) | 262,144 (256 KiB) |
| 288×384 | 589,824 (576 KiB) | 147,456 (144 KiB) | 73,728 (72 KiB) | 147,456 (144 KiB) |
| 192×256 *(height map)* | 262,144 (256 KiB) | **65,536 (64 KiB)** | 32,768 (32 KiB) | 65,536 (64 KiB) |

### 3.3 Set totals

| Strategy | 34 faces (ticket's figure) | 43 textures (42 faces + back) |
|---|---|---|
| **640×854 RGBA8 canvas — today** | **99.1 MB / 94.5 MiB** ✓ matches ticket | **125.3 MB / 119.5 MiB** |
| 384×512 RGBA8 (right-size only) | 35.7 MB / 34.0 MiB | 45.1 MB / 43.0 MiB |
| 288×384 UASTC → BC7/ASTC | 5.0 MB / 4.8 MiB | 6.3 MB / 6.05 MiB |
| **384×512 UASTC → BC7/ASTC** | **8.9 MB / 8.5 MiB** | **11.3 MB / 10.75 MiB** |
| 384×512 ETC1S opaque (no alpha, ground baked in) | 4.5 MB / 4.25 MiB | 5.6 MB / 5.38 MiB |
| + 42 height maps @192×256 UASTC | — | +2.75 MB / 2.63 MiB |
| + 1 shared micro-detail normal @256² UASTC | — | +0.09 MB / 85 KiB |
| **RECOMMENDED TOTAL** | — | **≈14.1 MB / 13.5 MiB** |

**Headline: 119.5 MiB → 13.5 MiB, an 8.9× reduction** (7.0× against the ticket's 94.5 MiB
34-face baseline), *while adding* an engrave channel the current pipeline does not have.

Of that 8.9×, **4.0× comes from compression and 2.2× from right-sizing.** Both are needed.

### 3.4 Why 384×512

Tile aspect is `TILE_W/TILE_H = 0.62/0.82 = 0.756` ≈ 3:4. Both dimensions are multiples of 4,
which KTX2 requires (three warns: *"ETC1S and UASTC textures should use multiple-of-four
dimensions"*, `KTX2Loader.js:726`).

On-screen footprint sets the ceiling. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`
caps the drawing buffer at 2×. A hand tile at 390×844 CSS is roughly 40×55 CSS px → ~80×110
device px; on a 1440×900 desktop, ~100×140 CSS → ~200×280 device px. **384×512 is ~1.4×
oversampled against the worst case** — enough headroom for a future zoom/close-up without
paying for it 9× over. 640×854 is ~3× oversampled, i.e. **~9× the memory for detail nobody
can resolve.**

Note that the two sharpness bugs the prototype README blames for the "pixelated" look —
`EffectComposer` silently allocating a `samples: 0` target, and the single-tap bilinear
downscale in `ctx.drawImage` — were **both real and both fixed**. The 384→640 bump was
belt-and-braces on top of fixes that had already solved the problem. It can be walked back.

The height map only carries relief, which has no high-frequency requirement; 192×256 is
ample and costs 64 KiB/face.

### 3.5 Per-texture vs atlas vs array — the atlas is the wrong answer

**An atlas does not save GPU memory.** N textures of total T texels and one atlas of T texels
cost the same. An atlas saves *bindings and draw calls*. Here it also loses:

- **Padding waste.** 43 cells of 384×512 = 8,454,144 texels. The smallest sane grid (8×6=48
  cells) is 3072×3072 = 9,437,184 texels → BC7+mips = **12.0 MiB**, 11% worse than the
  10.75 MiB the same images cost separately. A power-of-two 4096×4096 atlas = 16.8 Mtexels →
  **22.4 MiB**, 108% worse.
- **Mip bleed.** *"When a tile's UVs are close to its edge, texture sampling may pull in
  pixels from adjacent tiles"* — [Kyle Halladay, Minimizing Mip Map Artifacts In Atlassed
  Textures](https://kylehalladay.com/blog/tutorial/2016/11/04/Texture-Atlassing-With-Mips.html).
  The universal fix is gutters, which costs *more* padding. For 42 thin-stroke CJK glyphs
  where legibility is the hard constraint, bleeding a neighbouring 萬 into a 中 at mip 3 is
  exactly the failure you cannot ship.

**A 2D array texture is strictly better.** *"Each tile exists on a separate layer and the GPU
guarantees that filtering and mipmapping do not sample across layers, completely eliminating
inter-tile bleeding"* — no gutters, no waste, exact 10.75 MiB, and it is the thing
`InstancedMesh` needs (§6). three supports it: `KTX2Loader.js:447` returns a
`CompressedArrayTexture` whenever `container.layerCount > 1`, and `ktx create --layers N`
builds one ([ktx create docs](https://github.khronos.org/KTX-Software/ktxtools/ktx_create.html):
*"Number of layers. If set the texture will be an array texture."*).

**But it needs a shader patch** — three's built-in materials declare `uniform sampler2D map`
and have no `sampler2DArray` path (the only `sampler2DArray` in `src/renderers/shaders/` is
`morphTargetsTexture`). See §6 for the exact patch and the recommendation to defer it.

### 3.6 Download size (separate budget — do not confuse with GPU memory)

Today: **1.2 MB** of PNG (42 files, ~28 KB each) — already small, because vector-derived flat
line art on transparency is the PNG best case. The 94 MB is created *at runtime by the
canvas*, not downloaded.

Estimates for KTX2 (**measure these; do not quote them**):

| Artifact | Estimated download |
|---|---|
| UASTC 384×512 + `--zcmp 18`, 43 layers | ~1.1–2.8 MB |
| ETC1S 384×512 + zstd, 43 layers | ~0.6–1.7 MB |
| Pre-encoded ASTC/BC7, **no** zstd (§5.3) | 11.3 MB raw; brotli-over-the-wire unknown |

So the recommended path roughly **doubles download while cutting GPU memory ~9×**. On a
2 MB-per-session budget that is a good trade; if download is the binding constraint, the
lever is `--zcmp` and resolution, not ETC1S (§3.1).

---

## 4. Character legibility as a hard constraint

This is the reason ETC1S is off the table on quality grounds too, independent of the alpha
argument in §3.1.

- Khronos, [KTX Artist Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md):
  ETC1S offers *"greater compression and works better with large areas of solid colors or
  mostly monochromatic values"* but gives poor results on complex textures; UASTC gives
  *"higher visual quality for high-contrast high-detail color textures"*. Their Stained Glass
  Lamp comparison: ETC1S-only shows *"obvious block compression artifacts"*.
- The failure mode is specific: block-based codecs struggle with gradient-like and thin-stroke
  content, which is precisely what a 4×4 ETC1S block does to a 1-texel 萬 stroke — it becomes
  a smear across the block. At 384×512 a stroke in 萬 is ~3–5 texels wide, i.e. **one ETC1S
  block**. There is no margin.
- Tile art sits in an awkward middle: it *is* mostly flat colour (ETC1S's best case) but the
  only thing the player reads is the thin high-contrast stroke (ETC1S's worst case). Average
  PSNR would look fine and the tile would still be unreadable.
- The bump/height map compounds it: Khronos explicitly says use UASTC for normal maps, since
  block artifacts in a height field become visible surface noise under a key light.

**Verdict: UASTC LDR 4×4 for both the face and the height map. `--uastc-quality 3` for faces
(above the default 2), 2 for height. Non-negotiable at mobile tile sizes.** Since ETC1S with
alpha costs the same 8 bpp anyway, this decision is free.

**Ship a legibility gate:** render all 42 faces at the smallest real on-screen size on a
real phone, before and after encoding, and diff. Automate it in `proto-check.mjs`. Do not
accept an encoder change without it.

---

## 5. three.js + KTX2 + this app's CSP — the landmine

### 5.1 What KTX2Loader actually does

From `web/node_modules/three/examples/jsm/loaders/KTX2Loader.js` (r185, verified locally):

1. Fetches `basis_transcoder.js` (**57,529 B**) and `basis_transcoder.wasm` (**527,333 B**)
   from `setTranscoderPath(...)` via `FileLoader` (XHR/fetch).
2. Concatenates the JS with an inlined worker body and does
   `this.workerSourceURL = URL.createObjectURL( new Blob( [ body ] ) )` (line 329) then
   `new Worker( this.workerSourceURL )` (line 334).
3. Inside the worker, instantiates the WASM transcoder.
4. `ZSTDDecoder` from `../libs/zstddec.module.js` (**39,754 B**) is a **static import**
   (line 103) — it is always bundled — but is only *instantiated* lazily, when
   `container.supercompressionScheme === KHR_SUPERCOMPRESSION_ZSTD` (line 1118). It is also
   WASM.
5. `detectSupport(renderer)` **must** be called before any load, or it throws.

r185 has **only** `setTranscoderPath` — the `setTranscoderUrls()` API from
[PR #31446](https://github.com/mrdoob/three.js/pull/31446) has not landed here.

### 5.2 Three CSP failures against `web/next.config.js`

Current production policy (`next.config.js:5-13`):

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://vercel.live;   /* 'unsafe-eval' is DEV-ONLY */
style-src  'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src   'self' https://fonts.gstatic.com;
img-src    'self' data: blob:;
connect-src 'self' https://o123.ingest.us.sentry.io https://vitals.vercel-insights.com;
frame-ancestors 'none';
```

| # | Failure | Why | Fails in |
|---|---|---|---|
| 1 | `new Worker(blob:…)` blocked | No `worker-src`. CSP3 falls back `worker-src → child-src → default-src`, and `default-src 'self'` does not admit `blob:`. `img-src`'s `blob:` is irrelevant. | **dev and prod** |
| 2 | `WebAssembly.instantiate` blocked | Chrome refuses to compile/instantiate WASM unless `script-src` carries `'wasm-unsafe-eval'` or `'unsafe-eval'` ([MDN script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)). `isDev` injects `'unsafe-eval'`; production has neither. | **prod only** ⚠️ |
| 3 | Transcoder fetch blocked if not self-hosted | The default path and every CDN recipe in the wild (`three/examples/jsm/libs/basis/`, `cdn.jsdelivr.net/gh/pmndrs/drei-assets/basis/`) are cross-origin. `FileLoader` is XHR → governed by `connect-src 'self'`. | **dev and prod** |

**Failure #2 is the dangerous one: it passes `npm run dev` and fails only on Vercel.**
CI (lint → typecheck → unit → build) will not catch it either. Any implementation must add a
Playwright assertion that a `.ktx2` texture actually loads under the production CSP.

### 5.3 The fix, and the escape hatch

**Fix (recommended).** Self-host the two transcoder files under `web/public/basis/`, call
`setTranscoderPath('/basis/')`, and amend the CSP by two directives:

```diff
-  script-src 'self' ${isDev ? "'unsafe-eval' " : ""}'unsafe-inline' https://vercel.live;
+  script-src 'self' 'wasm-unsafe-eval' ${isDev ? "'unsafe-eval' " : ""}'unsafe-inline' https://vercel.live;
+  worker-src 'self' blob:;
```

`'wasm-unsafe-eval'` is materially narrower than `'unsafe-eval'`: it permits
`WebAssembly.compile/instantiate/compileStreaming` and **not** `eval()` or `new Function()`
(MDN, ibid.; Chrome 97+, Firefox 102+, Safari 16+). `worker-src blob:` admits a worker built
from a blob, which inherits the document's CSP. `connect-src 'self'` already covers the
self-hosted `.wasm`, `.js` and `.ktx2` fetches. Copy the two files in a `postinstall`/prebuild
step from `node_modules/three/examples/jsm/libs/basis/` so they never drift from the pinned
three version.

**Escape hatch, if the CSP change is rejected.** `_createTexture` (line 484) computes
`needsTranscoder = container.vkFormat === VK_FORMAT_UNDEFINED || …`. A KTX2 file carrying a
**real** `vkFormat` (i.e. already ASTC or BC7, not Basis) skips the worker entirely and goes
straight to `createRawTexture(container)` — **no blob worker, no WASM, no CSP change**. You
would ship two artifacts (`ktx create --format ASTC_4x4_SRGB_BLOCK` and
`--format BC7_SRGB_BLOCK`) and pick via `renderer.extensions`. You must also **omit `--zcmp`**,
because zstd decoding is itself WASM. Cost: ~11.3 MB of raw block data to download (§3.6) and
two build artifacts to keep in sync. GPU memory is identical. **Document it; don't ship it.**

Rolling your own precompressed formats *without* KTX2 is worse — coverage is fragmented (ASTC
on iOS A8+ but not macOS; BC/S3TC on macOS/desktop but not iOS; ETC2 on Android;
[MDN, Compressed texture formats](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Compressed_texture_formats)),
which is the exact problem Basis exists to solve.

### 5.4 Bundle cost

| | Raw | Where |
|---|---|---|
| `KTX2Loader.js` | 36,567 B | bundled (≈10–12 KB gz est.) |
| `zstddec.module.js` | 39,754 B | bundled — static import, always (base64 WASM, gzips poorly) |
| `basis_transcoder.js` | 57,529 B | runtime fetch, cached |
| `basis_transcoder.wasm` | 527,333 B | runtime fetch, cached |
| **JS bundle delta** | **≈76 KB raw** | |
| **First-load network delta** | **≈585 KB, once** | |

Compare against `three` itself, whose production bundle delta the prototype README lists as
**unmeasured**. Measure both together before deciding; the transcoder is ~5% of what `three`
already costs.

---

## 6. Instancing with a different face per tile

**Yes, it works. Two mechanisms, one recommendation, and a reason it matters less than it looks.**

### 6.1 Per-instance layer into a `CompressedArrayTexture` (the right technique)

- Encode once: `ktx create --layers 43 … faces/*.png → hk-faces.ktx2`.
- `KTX2Loader` returns a `CompressedArrayTexture` for `layerCount > 1` (`KTX2Loader.js:447`).
- Add `geometry.setAttribute('aLayer', new THREE.InstancedBufferAttribute(Float32Array, 1))`.
- Patch the material with `onBeforeCompile`:
  - vertex: inject `attribute float aLayer; varying float vLayer;` and `vLayer = aLayer;`
  - fragment: replace `uniform sampler2D map;` with `uniform sampler2DArray map;` and
    `texture2D( map, vMapUv )` with `texture( map, vec3( vMapUv, vLayer ) )`
    (three r185 compiles standard materials as GLSL ES 3.0 under WebGL2, so `texture()` and
    `sampler2DArray` are available).
- Result: **one draw call for every face-up tile**, one texture binding, 10.75 MiB.

The per-instance-UV-offset-into-an-atlas variant works identically (`aUvOffset` vec2 instead
of `aLayer`) and is the pattern the three.js forum uses, e.g.
[How to apply offsets for texture atlas in InstancedMesh?](https://discourse.threejs.org/t/how-to-apply-offsets-for-texture-atlas-in-instancedmesh/33191)
and [Use TexturePacker atlas in an InstancedMesh](https://discourse.threejs.org/t/use-texturepacker-atlas-in-an-instancedmesh/63445);
[Troika's `InstancedUniformsMesh`](https://github.com/protectwise/troika) automates the shader
upgrade. **Prefer the array anyway** — §3.5's mip-bleed and padding arguments.

### 6.2 Constraints you will hit

- **Multi-material groups do work on `InstancedMesh`.** `WebGLRenderer.js:1910-1923` pushes
  one render item per `geometry.groups` entry for *any* object with `Array.isArray(material)`,
  including `InstancedMesh`. So the existing `[faceMaterial, sideMaterial]` split survives —
  you get 2 draw calls, not 1.
- **Face-up and face-down tiles need separate `InstancedMesh`es** (different back material),
  or the back becomes layer 42 of the same array and one uniform switch decides. The latter
  is cleaner.
- **`count` must be maintained** as the wall drains and hands change. That is bookkeeping the
  current `Map<string, Mesh>` does for free; you would replace it with a stable index
  allocator. This is the real cost of instancing here, not the shader.
- **Raycast picking** on `InstancedMesh` returns `instanceId`, so `onTileSelect` needs an
  index→tile map. Straightforward but it touches the picking path.
- Mips **cannot be generated at runtime** for compressed textures — bake them with
  `--generate-mipmap`.

### 6.3 Recommendation: do this second, not first

The prototype already measured **584 rAF ticks → 0 GPU renders** idle, and **12 renders /
5 relayouts for an entire session**. When the scene draws a dozen times per session,
collapsing ~100 draw calls into 2 saves almost nothing. **Instancing is not what makes this
mobile-safe; compression and right-sizing are.**

So: **land compression with 43 separate `.ktx2` files and 43 materials first** — identical
10.75 MiB, zero shader patches, zero layer-index mapping to keep in sync with the art, zero
changes to picking or the mesh map. Then, if a real-device profile shows draw calls or
first-paint hurting, switch to the array: it is a one-flag encoder change (`--layers 43`) plus
the ~10-line `onBeforeCompile` above.

One genuine argument for the array *now*: 43 files means 43 loads, 43 transcode tasks and 43
async texture arrivals, each of which must call `invalidate()` — the exact hazard the
prototype README flags ("async work must invalidate"). One array file is **one await**. If
first-paint flicker shows up in testing, that alone justifies going straight to the array.

---

## 7. Licensing — every candidate, and the share-alike question

### 7.1 Table

| Source | Licence | HK complete? | Flowers/Seasons | White dragon | Attribution | Verdict |
|---|---|---|---|---|---|---|
| **`samoheen/mahjong-tiles` — vendored at `assets/HK-mahjong-tiles-master/`** | **CC0 1.0 / public domain** | **✅ 42/42** | ✅ all 8 | ✅ 白板 bordered blank (HK form) | none required | **USE THIS** |
| [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) | CC0 | ❌ 34/42 | ❌ ([issue #1](https://github.com/FluffyStuff/riichi-mahjong-tiles/issues/1) open since 2017) | Riichi blank | none | alternate art style only |
| perthmahjongsoc / Cangjie6 / DemChing (Wikimedia) | **CC BY-SA 4.0** | ✅ | ✅ | ✅ | required + **share-alike** | **not needed — avoid** |
| I.Mahjong-HK font | M+ Font Licence | ✅ | ✅ | ✅ | licence notice | monochrome outlines; wrong for a colour texture pipeline |
| OpenGameArt "Mahjong Tileset" (Code Inferno) | CC BY | likely ✅ | ✅ | ✅ | **required, perpetual** | raster-only, lower quality; unnecessary |
| Sketchfab / CGTrader 3D tile models | mixed, mostly not CC0 | ❌ no complete HK set found | — | — | varies | not viable, and §2 says unnecessary |

The repo's root `LICENSE` is **MIT**. Adding CC BY-SA art would create a mixed-licence tree
requiring an explicit carve-out in `LICENSE` — another reason to stay CC0-only.

### 7.2 Does CC BY-SA survive being baked into an atlas or a glTF? — the analysis, for the record

**Short answer: attribution always survives; share-alike survives *the derived asset files*
but does not reach your source code — and the pipeline in this ticket unambiguously creates
derivatives, so it would bite.**

The mechanics, from [CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt)
and [CC's ShareAlike interpretation guidance](https://wiki.creativecommons.org/wiki/ShareAlike_interpretation):

1. **§1(a) "Adapted Material"** = material *"derived from or based upon the Licensed Material
   and in which the Licensed Material is translated, altered, arranged, transformed, or
   otherwise modified in a manner requiring permission."*
2. **§2(a)(4)** — *"Simply making modifications authorized by this Section 2(a)(4) never
   produces Adapted Material"*, referring to *"technical modifications necessary to exercise
   the Licensed Rights."* **Rasterising SVG→PNG, resampling, and encoding to KTX2 are
   technical/format modifications.** These alone do not trigger SA.
3. **Aggregation is not adaptation.** CC: *"The ShareAlike condition applies only for works
   considered adaptations under copyright law, not simply in collections with other works"*
   and *"Simply including an SA work unmodified alongside unrelated materials does not produce
   an adaptation."* So a **plain atlas or array of unmodified tile images is most likely a
   Collection, not an Adaptation.**
4. **But this pipeline modifies the art, on purpose, in three places:**
   - compositing the glyph onto the ivory ground + gradient sheen (`baseFaceCanvas`);
   - re-tinting to a `TilePalette`;
   - **deriving a height/normal map from the glyph** — a transformation of the licensed image
     into a new image. This is squarely Adapted Material.
   Each produces Adapted Material, and **§3(b)** then requires an Adapter's Licence of
   BY-SA 4.0 (or a compatible licence), plus *no additional or different terms* and **no
   Effective Technological Measures** on it.
5. **Scope of the obligation.** CC: *"Unless the larger work would be considered an adaptation
   of it, using a ShareAlike photo as a separate element within it does not require original
   materials in the larger work to be ShareAlike or compatible."* So SA would attach to the
   **atlas / array / height maps / any glTF that embeds them**, and **not** to the TypeScript,
   engine, or UI. Note the explicit counterexample CC gives — *"all synching of SA-licensed
   music with other content creates an adaptation"* — as a reminder that "it's just a
   container" reasoning fails in at least one medium.
6. **What that means operationally.** You would have to publish the derived tile-asset files
   under BY-SA 4.0 with a licence link, keep attribution to Cangjie6 in-product and in the
   files, and avoid any DRM or ToS clause that restricts those files. Perpetual, and it
   propagates to anyone who forks the art.

**Recommendation: don't take it on.** With CC0 art that is 42/42 complete, the entire question
is avoidable. Record the decision so it isn't re-litigated: **the tile-art pipeline accepts
CC0/public-domain sources only; CC BY-SA sources are excluded by policy, not by oversight.**

### 7.3 The attribution you should ship anyway (CC0 requires none)

Even though CC0 imposes no obligation, ship a credits line — it is cheap insurance and good
practice: *"Tile artwork: samoheen/mahjong-tiles, released into the public domain (CC0 1.0)."*
Put it in the Settings/About surface and in `assets/HK-mahjong-tiles-master/PROVENANCE.md`
alongside the upstream URL, commit SHA and retrieval date.

---

## 8. RECOMMENDED PIPELINE, end to end

### 8.1 Source art

`assets/HK-mahjong-tiles-master/hongkong/svg/*.svg` — 42 files, CC0, complete, already in
tree. **Prefer the SVG over the shipped PNG**: rendering from vector at build time avoids
inheriting the PNG's non-uniform widths and its own resampling, and the resolution becomes a
build parameter.

### 8.2 Build step — `web/scripts/build-tiles.mjs`, run via `npm run build:tiles`

Node + `sharp` (or `resvg-js`) + the Khronos `ktx` CLI.

```
FOR each of the 42 SVGs, in a fixed sorted order:
  1. rasterise at 4× target (1536×2048) onto a transparent RGBA canvas
  2. letterbox: fit-inside with 9% padding, centred  ← replaces the runtime Math.min fit
  3. downsample to 384×512, kernel = lanczos3        ← replaces createImageBitmap resize
  4. write  build/tiles/NN-name.png                  (glyph colour in RGB, coverage in A)
  5. height = A channel → greyscale → 1px gaussian → 192×256
     write  build/tiles/NN-name.height.png
+ back tile: rasterise the diagonal-hatch pattern once → build/tiles/43-back.png
+ emit  web/components/game/tileLayers.generated.ts  from the SAME file list
        (tile id → layer index / filename) so art and indices cannot drift

ENCODE:
  ktx create --format R8G8B8A8_SRGB  --encode uastc-ldr-4x4 --uastc-quality 3 \
             --assign-tf srgb  --generate-mipmap --zcmp 18 \
             build/tiles/*.png        → web/public/tiles/hk-faces.ktx2
  ktx create --format R8G8B8A8_UNORM --encode uastc-ldr-4x4 --uastc-quality 2 \
             --assign-tf linear --generate-mipmap --zcmp 18 \
             build/tiles/*.height.png → web/public/tiles/hk-height.ktx2
  (add --layers 43 / --layers 42 to switch to array textures — §6.3)
```

Do **not** bake the ivory ground, the sheen, or the palette tint into the texture. Leaving the
glyph on transparency and painting the ground from the material means **one texture set
regardless of how many `TilePalette`s exist** — the current `matCache`/`texCache` key of
`${tileKey(tile)}|${pal.id}` multiplies texture memory by the palette count, which is a latent
second copy of this bug.

**CI.** Runs on `ubuntu-latest`. Install KTX-Software from the pinned
[GitHub release .deb](https://github.com/KhronosGroup/KTX-Software/releases) (`sudo dpkg -i`),
or use `@gltf-transform/cli`'s `uastc` command — but note **gltf-transform shells out to the
same `ktx` binary and requires it on `PATH`** ([glTF-Transform issue #134](https://github.com/donmccurdy/glTF-Transform/issues/134);
[issue #675](https://github.com/donmccurdy/glTF-Transform/issues/675), "compress without CLI",
is still open and marked blocked). Since we are not embedding textures in a glTF, **call `ktx`
directly and skip gltf-transform entirely.**

**Because the source art is frozen CC0 and changes approximately never, commit the two `.ktx2`
artifacts** and run `build:tiles` on demand. Add a CI job, triggered only on changes to
`assets/**` or the script, that re-encodes and fails if the output differs — cheap drift
detection without making every PR install a native toolchain.

Also copy `basis_transcoder.{js,wasm}` from `node_modules/three/examples/jsm/libs/basis/` into
`web/public/basis/` in a prebuild step, so they track the pinned three version.

### 8.3 Runtime format

- `web/public/tiles/hk-faces.ktx2` — UASTC LDR 4×4, sRGB, mipped, zstd. GPU: BC7 (desktop) /
  ASTC 4×4 (mobile) / ETC2 (older Android) / RGBA8 fallback. **10.75 MiB.**
- `web/public/tiles/hk-height.ktx2` — UASTC, linear, mipped. **2.63 MiB.**
- optional `hk-detail-normal.ktx2` — one shared 256² tiling bone-grain normal. **85 KiB.**

### 8.4 Loading

```ts
// module scope, one per app
const ktx2 = new KTX2Loader().setTranscoderPath('/basis/');   // self-hosted, CSP-safe
// per renderer, BEFORE any load, or it throws:
ktx2.detectSupport(renderer);

const faceTex   = await ktx2.loadAsync('/tiles/hk-faces.ktx2');
const heightTex = await ktx2.loadAsync('/tiles/hk-height.ktx2');
faceTex.colorSpace   = THREE.SRGBColorSpace;   // height stays NoColorSpace
faceTex.anisotropy   = renderer.capabilities.getMaxAnisotropy();
// material:  map = faceTex, bumpMap = heightTex, bumpScale = -0.015 (negative = engraved)
//            keep roughness 0.32 / clearcoat 0.7 from the prototype
invalidate();                                   // render-on-demand still requires this
```

CSP must already carry `'wasm-unsafe-eval'` and `worker-src 'self' blob:` (§5.3).

### 8.5 Disposal

- Keep the texture set **resident for the whole `/play` session** — it is 13.5 MiB total and
  re-decoding costs a visible stall. Dispose on leaving `/play`, not on every `ThreeTable`
  remount. Hoist the cache above the `useEffect` that currently owns it.
- `ktx2Loader.dispose()` on teardown — it terminates the worker pool **and revokes the blob
  URL** (`KTX2Loader.js:509-514`). Skipping it leaks a blob per mount.
- Keep the existing `createdTextures` / `matCache` sweep, and add
  `renderer.forceContextLoss()` after `renderer.dispose()` so the driver releases promptly.
- **Leak canary:** assert `renderer.info.memory.textures` and `.geometries` return to their
  post-init baseline after unmount, in `proto-check.mjs`. A texture leak here is 256 KiB a
  time and will not be obvious.

---

## 9. The finding the ticket did not ask for: textures are ~half the mobile problem

Fixing textures alone will not make variant `max` mobile-safe. From `ThreeTable.tsx`:

| Allocation | Setting | Estimated GPU cost |
|---|---|---|
| Shadow map, `max` | `key.shadow.mapSize.set(4096, 4096)` (line 235) | **~50–67 MB** for one depth surface |
| Shadow map, non-`max` | 2048² | ~13–17 MB |
| `EffectComposer` target | `WebGLRenderTarget(w, h, { samples: 4 })` (line 271-275) | 4× MSAA colour **+** depth at drawing-buffer size; `EffectComposer` clones it, so **two** such targets |
| `UnrealBloomPass` | 5 mip levels, ping-pong | ~5–10 MB at phone resolution |
| `PMREMGenerator.fromScene(RoomEnvironment)` | line 260-261 | ~4 MB cube RT |

At 390×844 CSS with `pixelRatio` clamped to 2 (drawing buffer ≈ 780×1688 ≈ 1.32 Mpx), the two
MSAA targets alone are plausibly **40–80 MB**, and the 4096² shadow map is a *single
allocation larger than the entire recommended texture set*.

**Recommendations:** cap the shadow map at 2048² on mobile (or 1024² with a tighter light
frustum — the README already notes 2048 over a 26-unit frustum was ~79 texels/unit, so
shrinking the frustum buys back quality for free); drop `samples: 4 → 2` on mobile; consider
gating bloom + IBL behind a capability check, which the README already lists as an open
question ("worth deciding whether they earn their cost on a real GPU"). **Measure
`renderer.info.memory` plus `performance.measureUserAgentSpecificMemory()` on a real phone
before and after — do not ship on the strength of the texture number alone.**

---

## 10. Verification checklist for the implementation ticket

1. `npm run build` + `npx serve` (production CSP) — a `.ktx2` texture loads with **zero CSP
   violations in the console**. Add this as a Playwright assertion; dev-only testing will miss
   failure #2 in §5.2.
2. `renderer.info.memory.textures` after all 42 faces are resident ≈ 2–3 texture objects
   (arrays) or 43 (separate), and **not 43 × palettes**.
3. Real-device memory: iOS Safari + a mid-range Android, `performance.measureUserAgentSpecificMemory()`
   or Chrome DevTools GPU memory, before/after.
4. Legibility gate: all 42 faces screenshotted at the smallest real on-screen size on a phone,
   pre- and post-encode, diffed. 索 5 / 萬 8 / 發 are the hardest.
5. Bump direction: `bumpScale` must read as *engraved*, not embossed — and must be consistent
   between 中 (red) and 發 (green). If it inverts, the height map is being read from a colour
   channel (§2.4).
6. Draw calls (`renderer.info.render.calls`) before/after — but weigh it against the measured
   12 renders/session before spending anything on instancing.
7. First-paint: time from mount to all visible faces textured, with a cold HTTP cache.
8. Bundle delta from `KTX2Loader` + `zstddec` measured **together with** the still-unmeasured
   `three` delta.

---

## Sources

- [KTX2Loader — three.js docs](https://threejs.org/docs/pages/KTX2Loader.html)
- [three.js PR #31446 — setTranscoderUrls](https://github.com/mrdoob/three.js/pull/31446) (not in r185)
- [Khronos — KTX Artist Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md)
- [Khronos — KTX Developer Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXDeveloperGuide.md)
- [Khronos — `ktx create` reference](https://github.khronos.org/KTX-Software/ktxtools/ktx_create.html)
- [KhronosGroup/KTX-Software releases](https://github.com/KhronosGroup/KTX-Software/releases)
- [Basis Universal — transcoder format support (ETC1S / UASTC LDR 4x4)](https://github.com/BinomialLLC/basis_universal/wiki/Transcoder-Texture-Format-Support-for-ETC1S-and-UASTC-LDR-4x4)
- [BinomialLLC/basis_universal](https://github.com/BinomialLLC/basis_universal)
- [MDN — CSP `script-src` (`wasm-unsafe-eval`)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)
- [MDN — Compressed texture formats](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Compressed_texture_formats)
- [Kyle Halladay — Minimizing Mip Map Artifacts In Atlassed Textures](https://kylehalladay.com/blog/tutorial/2016/11/04/Texture-Atlassing-With-Mips.html)
- [three.js forum — texture atlas offsets in InstancedMesh](https://discourse.threejs.org/t/how-to-apply-offsets-for-texture-atlas-in-instancedmesh/33191)
- [three.js forum — TexturePacker atlas in an InstancedMesh](https://discourse.threejs.org/t/use-texturepacker-atlas-in-an-instancedmesh/63445)
- [glTF-Transform CLI](https://gltf-transform.dev/cli) · [issue #134](https://github.com/donmccurdy/glTF-Transform/issues/134) · [issue #675](https://github.com/donmccurdy/glTF-Transform/issues/675)
- [CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt)
- [Creative Commons — ShareAlike interpretation](https://wiki.creativecommons.org/wiki/ShareAlike_interpretation)
- [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) · [samoheen/mahjong-tiles](https://github.com/samoheen/mahjong-tiles)
- [FluffyStuff/riichi-mahjong-tiles issue #1 — Seasons and Flowers](https://github.com/FluffyStuff/riichi-mahjong-tiles/issues/1)
- [TileBuddy — All 42 Mahjong Tiles Explained](https://tilebuddy.app/blog/mahjong-tiles-explained/) · [Wikipedia — Mahjong tiles](https://en.wikipedia.org/wiki/Mahjong_tiles)
- [nastyrodent — High-Poly to Low-Poly baking](https://nastyrodent.com/high-poly-to-low-poly-baking/)

Local, verified this session: `web/next.config.js`, `web/components/game/prototype/{ThreeTable.tsx,tileArt.ts,README.md}`,
`web/node_modules/three/examples/jsm/loaders/KTX2Loader.js`, `web/node_modules/three/src/renderers/WebGLRenderer.js`,
`web/node_modules/three/src/renderers/shaders/ShaderChunk/bumpmap_pars_fragment.glsl.js`,
`assets/HK-mahjong-tiles-master/{LICENSE.md,README.md,hongkong/}`.
