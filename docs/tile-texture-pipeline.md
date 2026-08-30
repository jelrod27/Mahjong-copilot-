# Tile texture pipeline

Builds the compressed tile textures for the 3D table, and the gate that proves
compression has not destroyed the artwork.

Implements [#125](https://github.com/jelrod27/Mahjong-copilot-/issues/125),
under the decisions settled in [#113 §6–§7](https://github.com/jelrod27/Mahjong-copilot-/issues/113)
and the research in [#104](https://github.com/jelrod27/Mahjong-copilot-/issues/104).

> **This ticket introduces no runtime loading.** The pipeline writes files and
> the files are committed. Nothing in the app reads them yet — the loader, the
> CSP change and the transcoder are part of a later pull request in the slice.

## Commands

```bash
cd web
npm run tiles:toolchain   # install the pinned encoder (checksum-verified)
npm run tiles:build       # rasterise + encode + measure
npm run tiles:gate        # legibility gate (requires tiles:build first)
```

`tiles:build` installs the toolchain on demand, so `tiles:toolchain` is only
needed to pre-warm a CI cache.

## What it produces

Committed build outputs:

| Artefact | Contents |
|---|---|
| `web/public/tiles/hk-faces.ktx2` | 384×512, **43-layer array**, UASTC sRGB — 42 faces + the tile back |
| `web/public/tiles/hk-height.ktx2` | 192×256, **42-layer array**, UASTC linear — engraving relief |
| `web/public/tiles/hk-detail-normal.ktx2` | 256², single texture — shared tiling bone-grain normal |
| `web/scripts/tiles/tile-textures.manifest.json` | measured payload, layer map, encoder version, checksums |
| `web/scripts/tiles/gate/legibility-report.json` | per-face before/after metrics |
| `web/scripts/tiles/gate/contact-sheet.png` | all 42 faces, before \| after \| amplified diff |

Intermediates land in `web/scripts/tiles/build/` and are gitignored.

## Measured payload

| Texture | Dimensions | Layers | GPU |
|---|---|---|---|
| Faces | 384×512 | 43 | 10.752 MiB |
| Height | 192×256 | 42 | 2.627 MiB |
| Detail normal | 256×256 | 1 | 0.083 MiB |
| **Total** | | | **13.462 MiB** (budget 13.5 MiB, headroom 39.6 KB) |

Download total is **1.359 MiB** across the three files — do not confuse the two
budgets. GPU cost is the block-compressed size after upload; the files on disk
are zstd-supercompressed.

That is an **8.88× reduction** against the 119.5 MiB the uncompressed 640×854
RGBA8 approach cost, *while adding* an engraving channel it did not have. The
spec's "8.9×" is the rounded form of this figure.

GPU bytes are computed by exact block accounting — `ceil(w/4) × ceil(h/4) × 16`
summed over the whole mip chain — not the 4/3 mip approximation, because partial
blocks are charged whole and the tail levels do not shrink to nothing.

**The headroom is 0.28%.** Any resolution increase breaches the budget. Treat
`config.mjs` resolutions as fixed unless the budget in #113 §6 is renegotiated.

## Decisions worth not re-deriving

**Array texture, not an atlas.** At equal texel count an atlas costs the same or
more, needs gutters, and lets mip levels bleed one glyph into another. Bleeding a
萬 into a 中 at mip 3 across 42 thin-stroke faces is unshippable. Array layers
cannot bleed into each other by construction. The build verifies `layerCount`
from the encoded file rather than trusting the flags it passed.

**UASTC is forced, not chosen.** The art is a glyph on transparency, so it needs
alpha. With alpha, ETC1S transcodes to 8 bpp — the same as UASTC — so ETC1S's
memory advantage disappears and only its thin-stroke artefacts remain.

**Faces ship as glyph-on-transparency.** The ivory ground, sheen and palette tint
live in the material. Baking them in would multiply the texture set by the number
of tile palettes.

**Composition matches the DOM board.** The letterbox reproduces the prototype's
`pad = width × 0.09` min-fit exactly, so the 3D tiles and the DOM tiles are the
same artwork at the same proportions. The vendored SVGs are not all the same
width (296, 300 and 301 all occur), so the fit is computed per file.

**The back is full-bleed.** It is the tile surface, not artwork sitting on one,
so it skips the inset. It carries no height-map layer — the hatch is flat.

## The legibility gate

At 384×512 a stroke in 萬 is roughly one encoder block wide, so compression can
destroy legibility while every averaged quality number still looks healthy. The
gate is blocking.

- **Before** is the encoder's input PNG. **After** is the encoded texture decoded
  through `ktx extract --transcode rgba8` — the same transcode a device performs
  on upload. Only compression differs between the two.
- Both are composited onto an ivory ground before measuring. A player reads the
  glyph against the tile, and alpha damage is invisible against transparency.
- Measured at **80×110 device px**: a hand tile at a 390×844 CSS viewport is
  ~40×55 CSS px and `devicePixelRatio` is clamped to 2.

### Why it also measures at full resolution

Downsampling to 80×110 is itself a strong low-pass filter, so it hides much of
the damage it is being asked to detect. Measured against deliberately degraded
encodes of this exact artwork:

| Encoding | Screen SSIM | Screen max Δ | Full-res SSIM |
|---|---|---|---|
| **UASTC q3 — shipped** | **0.99993** | **7** | **0.99752** |
| UASTC q1 | 0.99993 | 6 | 0.99735 |
| UASTC q0 + RDO λ8 | 0.99986 | 14 | 0.99435 |
| ETC1S default | 0.99970 | 16 | 0.99553 |
| ETC1S qlevel 40 | 0.99928 | 26 | 0.98725 |

Screen SSIM spans 0.0007 across that entire range and on its own would wave
ETC1S straight through. Screen max-delta and full-resolution SSIM both separate
cleanly. So the gate keeps the phone-size judgement the acceptance criterion asks
for **and** a sensitive regression detector, and every degraded encode above is
rejected by at least two of the three thresholds:

```
screen SSIM      ≥ 0.9998
screen max delta ≤ 12
full-res SSIM    ≥ 0.996
```

Reproduce the table by editing the `--encode` flags in `config.mjs`, running
`tiles:build` and `tiles:gate`, and reading `summary` from the report. Restore
the settings afterwards — the artefacts are committed.

The hardest faces are the dense circle tiles (Circles 7–9) and Winter, which is
consistent with the research's expectation that fine repeated detail, not the
character glyphs, is the binding case at this resolution.

### Why not a browser screenshot

The acceptance criterion says "screenshotted". Doing that literally would mean
loading a `.ktx2` in a real page, which requires the KTX2 loader, a self-hosted
transcoder and the CSP change — all explicitly later work, and all forbidden by
this ticket's "no runtime loading" criterion. Decoding through the encoder's own
transcoder measures the same pixels a GPU would sample, deterministically and
without a browser.

## Reproducibility

The encoder is pinned to **KTX-Software 4.4.2**, installed from the Khronos
release tarball and verified against a SHA-256 recorded in `toolchain.mjs`. A
non-matching `ktx` on `PATH` is rejected rather than used, because encoder output
is version-dependent.

Rebuilds are **byte-identical** on Linux x64 — verified — which is what lets CI
diff a fresh encode against the committed files. `--testrun` is passed so the
encoder does not stamp a writer string that would churn the artefacts.

Linux x64 and arm64 install automatically. On other platforms install
KTX-Software 4.4.2 yourself (`brew install ktx`) and put `ktx` on `PATH`.
Byte-identical output is only claimed for Linux x64, which is what CI runs.

## CI

The `tile-textures` job runs on every pull request and every push to `main`:

1. install the pinned encoder (cached, keyed on version)
2. `tiles:build` — re-encode from source
3. `git diff --exit-code` on `public/tiles` and the manifest — proves the
   committed artefacts are reproducible
4. `tiles:gate` — the legibility gate
5. `git diff --exit-code` on `scripts/tiles/gate` — proves the committed
   evidence is current

The contact sheet and report upload as an artifact on every run, pass or fail,
so a reviewer can look at the faces rather than only the numbers.

The ordinary `quality` job additionally runs `scripts/tiles/__tests__/`, which
checks the committed manifest and report against the pipeline's own definitions
without needing the encoder.

## Changing the artwork or the encoder

1. Edit `config.mjs` (resolutions, encoder flags, thresholds) or replace the
   source SVGs.
2. `npm run tiles:build && npm run tiles:gate`.
3. Commit `public/tiles/*.ktx2`, the manifest, and `scripts/tiles/gate/`.
4. If a threshold moved, regenerate the calibration table above — a threshold
   with no measured bad encode below it is not a gate.

Adding or renaming a tile also breaks `faces.test.ts`, which pins the texture set
to the engine's distinct tile keys. That is deliberate: it is the check that art
and layer indices cannot drift apart.

## Not in this ticket

Runtime loading, `KTX2Loader`, the self-hosted transcoder, the CSP change
(`wasm-unsafe-eval` and `worker-src 'self' blob:`), instancing, and the
`sampler2DArray` material patch. See #113 §6 and §14.

A layer-index module for the runtime is deliberately not generated: nothing
consumes it yet, and the mapping is already recorded in the manifest and pinned
by tests. Generate it alongside the loader that needs it.
