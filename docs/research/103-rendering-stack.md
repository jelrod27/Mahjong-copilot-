# RESEARCH #103 — Rendering integration: raw three.js, R3F, or R3F + drei

**Repo:** `/home/justin/Projects/Mahjong` (app in `web/`)
**Ticket:** https://github.com/jelrod27/Mahjong-copilot-/issues/103 (parent #102, blocks #111)
**Date:** 2026-08-02
**Status:** research only — no repo files changed, nothing installed, no commits.

---

## 0. Headline recommendation

**Stay on raw imperative three.js for the 3D board. Do not adopt R3F on this repo at React 18.3.**

Not because R3F is worse — on several axes it is measurably better (§6, §7) — but because on **React 18.3.1 the only R3F you can install is `@react-three/fiber@8.18.0`, whose last release was 2025-02-19, ~17 months ago, and which will never receive another one.** Adopting R3F today means adopting a frozen major and signing up for a *joint* React 19 + R3F 9 + drei 10 migration later. The prototype already exists, already works, and every hard-won fix in it (`§1`) is three.js-level knowledge that survives any future move to R3F unchanged.

The correct time to reconsider is **as part of the React 19 upgrade**, not before it.

### Exact versions to pin

| Path | Package | Pin | Notes |
|---|---|---|---|
| **RECOMMENDED (raw three)** | `three` | `0.185.1` (exact) | already installed |
| | `@types/three` | `0.185.3` (exact) | already installed |
| | *(nothing else)* | | |
| **IF R3F is adopted anyway (React 18)** | `@react-three/fiber` | `8.18.0` (exact, not `^8`) | last v8 ever; peer `react >=18 <19`, `three >=0.133` — both satisfied |
| | `@react-three/drei` | `9.122.0` (exact) | last v9 ever; peer `react ^18`, `@react-three/fiber ^8`, `three >=0.137` |
| | `@react-three/test-renderer` | `8.2.4` (exact, devDep) | peer `react >=18 <19`, `@react-three/fiber >=8 <9` |
| | `@react-three/postprocessing` | `2.19.1` (exact) — only if bloom moves to R3F | peer `react ^18`, `@react-three/fiber ^8`, `three >= 0.138.0` |
| | `overrides.three-stdlib` | `^2.36.1` | **required** — 2.35.6 imports `LuminanceFormat`, removed in three r185 (§2.4) |
| **FUTURE (with React 19 upgrade)** | `react` / `react-dom` | `19.2.8` | satisfies R3F v9 peer `>=19 <19.3` |
| | `@react-three/fiber` | `9.7.0` | published 2026-07-31, actively maintained |
| | `@react-three/drei` | `10.7.7` | peer `react ^19`, `three >=0.159` |
| | `@react-three/test-renderer` | `9.1.1` | |
| | `@react-three/postprocessing` | `3.0.4` | |

Never `latest`, never `^` on the R3F family: `^8` and `^9` are terminal branches whose "latest patch" is fixed forever, so a caret buys nothing and only risks a resolution surprise.

---

## 1. Verified facts from the local checkout

Everything below was read, not assumed.

**`web/package.json` + `web/node_modules` (installed versions confirmed via `require('<pkg>/package.json').version`):**

| Package | Declared | Installed |
|---|---|---|
| `react` | `^18.3.0` | **18.3.1** |
| `react-dom` | `^18.3.0` | **18.3.1** |
| `next` | `^15.5.18` | **15.5.19** |
| `typescript` | `^5.0.0` | **5.9.3** |
| `three` | `^0.185.1` | **0.185.1** (`THREE.REVISION === 185`) |
| `@types/three` | `^0.185.3` | 0.185.3 |
| `vitest` | `^3.2.4` | jsdom 24, `environment: 'jsdom'` |
| `@testing-library/react` | `^16.3.2` | |
| `@playwright/test` | `^1.49.1` | 12 specs in `web/e2e/`, incl. `visual.spec.ts` with snapshots |

Confirmed: this repo is **React 18, not 19**. Next 15.5.19's own peer range is `react: "^18.2.0 || 19.0.0-rc-… || ^19.0.0"`, so React 18.3.1 + App Router is a supported Next configuration — there is no Next-side pressure to move to 19.

**Prototype (branch `prototype/tile-faces`, currently checked out):**
- `web/components/game/prototype/ThreeTable.tsx` — **805 lines** (not ~600), `'use client'`, raw imperative three.js in a single `useEffect`.
- `web/components/game/prototype/PrototypeVariant.tsx` — 408 lines, variant registry/switcher.
- `web/components/game/prototype/README.md` — 192 lines of measured findings.
- Also `tileArt.ts`, `portraitTexture.ts`, `proto-check.mjs` (headless Playwright driver).
- All five three.js addon imports it uses **exist in the installed three 0.185.1**: `environments/RoomEnvironment.js`, `postprocessing/{EffectComposer,RenderPass,UnrealBloomPass,OutputPass}.js`.

**What the raw prototype already achieves (from reading the source):**
- Extruded, bevelled tile geometry with remapped UVs so face art lands square.
- Canvas-generated face textures at 640×854, anisotropy = GPU max, high-quality `createImageBitmap` downscale.
- Full table: felt + rim, live wall, 4 seats, melds, discard blocks, 3D NPC portraits, tutor advice lozenges.
- ACES tone mapping, PCF soft shadows (4096 map in `max`), PMREM/`RoomEnvironment` IBL, UnrealBloom through an **explicitly multisampled** `WebGLRenderTarget({ samples: 4 })`.
- Dynamic camera fitting (`fitCamera`) solving the content bounding sphere against the tighter of the two FOVs.
- 3D→2D projection of seat positions to place DOM plaques, with clamping.
- Raycast click picking against a `pickable[]` array.
- **Render-on-demand** via a `dirty` counter, with `invalidate()` called from async texture `.then()` handlers.
- Per-second exponential settle (`1 - exp(-11*dt)`), framerate-independent.
- Hand-rolled dirty tracking: a `sigRef` signature string over wall length, per-player hand ids, meld counts, discard counts, palette, selection, tutor colours — so React re-renders from ticking timers don't relayout the scene.
- A ~20-line `dispose()` covering geometry, materials, textures, composer, composer target, env RT, PMREM, renderer, listeners, ResizeObserver.

**`web/next.config.js` — the CSP that matters for drei:**
```
default-src 'self';
img-src 'self' data: blob:;
connect-src 'self' https://o123.ingest.us.sentry.io https://vitals.vercel-insights.com;
```
`connect-src` is `'self'` plus two Sentry/Vercel hosts. **No CDN, no `data:` in `connect-src`.**

**`web/vitest.config.ts`** — `environment: 'jsdom'`, `include: ['**/__tests__/**/*.test.{ts,tsx}']`, coverage includes `components/**`. **`web/vitest.setup.ts` contains only jest-dom + localStorage/sessionStorage shims — no canvas or WebGL mock.** 71 test files exist; none touch `ThreeTable`. The prototype is currently covered only by Playwright + the ad-hoc `proto-check.mjs`.

**`reactStrictMode` is not set in `next.config.js`**, so Next's default applies (on in dev) → effects double-invoke in development. Relevant to both options (§7.4).

---

## 2. Version compatibility

### 2.1 The hard constraint

From the npm registry (fetched 2026-08-02):

| Package | Last release of that major | Date | `react` peer | `three` peer |
|---|---|---|---|---|
| `@react-three/fiber` | **8.18.0** | **2025-02-19** | `>=18 <19` | `>=0.133` |
| `@react-three/fiber` | 9.7.0 (`latest`) | 2026-07-31 | `>=19 <19.3` | `>=0.156` |
| `@react-three/drei` | **9.122.0** | **2025-02-19** | `^18` | `>=0.137` |
| `@react-three/drei` | 10.7.7 (`latest`) | 2025-11-13 | `^19` | `>=0.159` |
| `@react-three/test-renderer` | **8.2.4** | 2025-02-03 | `>=18 <19` | `>=0.133` |
| `@react-three/test-renderer` | 9.1.1 (`latest`) | 2026-07-31 | `^19.0.0` | `>=0.156` |
| `@react-three/postprocessing` | **2.19.1** | 2025-01-23 | `^18.0` | `>= 0.138.0` |
| `@react-three/postprocessing` | 3.0.4 (`latest`) | 2025-02-20 | `^19.0` | `>= 0.156.0` |

**R3F v8 ↔ React 18; R3F v9 ↔ React 19.** There is no version of R3F that supports both. This is stated in the [R3F installation docs](https://r3f.docs.pmnd.rs/getting-started/installation) and enforced by the peer ranges above.

**Answer to "does R3F support this repo's exact React version": yes — `@react-three/fiber@8.18.0` and only that line.** `react@18.3.1` satisfies `>=18 <19`; `react-dom@18.3.1` satisfies the same; `three@0.185.1` satisfies `>=0.133`. R3F v8's own transitive `react-reconciler@0.27.0` declares `peerDependencies: { react: "^18.0.0" }` — also satisfied by 18.3.1.

### 2.2 Peer-dependency conflicts with Next 15.5

**None.** Checked every peer edge:
- `@react-three/fiber@8.18.0` peers on `expo`, `expo-gl`, `expo-asset`, `expo-file-system`, `react-native`, `react-dom` — **all except `three` and `react` are marked optional in `peerDependenciesMeta`**, so npm will not warn or error. `npm i @react-three/fiber@8.18.0` installs cleanly with no `--legacy-peer-deps`.
- `@react-three/drei@9.122.0`: `react ^18` ✓, `react-dom ^18` ✓, `@react-three/fiber ^8` ✓, `three >=0.137` ✓.
- `@react-three/test-renderer@8.2.4`: ✓ across the board.
- Next 15.5.19 has no peer relationship with any of them.

The only conflict class in the wild is the reverse case (React 19 + R3F v8, or React 18 + R3F v9), which does not apply here.

### 2.3 The maintenance problem — this is the decisive fact

`@react-three/fiber@8.18.0` and `@react-three/drei@9.122.0` were **both published on 2025-02-19**, the day the v9/v10 lines shipped. Neither has had a release since. The GitHub releases feed shows only 9.x entries. There is no v8 backport branch, no security-patch stream, no stated LTS.

Concretely: **adopting R3F on this repo means adopting a library that has been frozen for 17 months and whose fix path for any bug you find is "upgrade React to 19".** For a solo maintainer, that is a coupled, unplanned migration hanging over the renderer.

### 2.4 three r185 compatibility of the frozen v8/v9 line

I checked this empirically rather than trusting the semver range, since drei v9 was authored against ~r173 and the repo is on r185.

- **R3F v8 core:** the only three symbols it touches are `ACESFilmicToneMapping, BasicShadowMap, Camera, Clock, ColorManagement, Layers, NoToneMapping, Object3D, OrthographicCamera, PCFShadowMap, PCFSoftShadowMap, PerspectiveCamera, Raycaster, RGBAFormat, Scene, UnsignedByteType, Vector2, Vector3, VSMShadowMap, WebGLRenderer`. **All present in r185** (verified against the installed `three`). It also feature-detects colour management (`hasColorSpace = obj => 'colorSpace' in obj || 'outputColorSpace' in obj`) and aliases `outputEncoding → outputColorSpace` at runtime, so the r152 colour-space break is handled. Low risk.
  - Minor: R3F v8 uses `THREE.Clock`, which three deprecates in favour of `Timer` in the r173–r185 window. Still present in r185; expect a console deprecation at most.
- **drei v9.122.0:** extracted all **56 distinct named imports from `'three'`** across the whole package and checked each against the installed r185 — **zero missing**. Notably, drei imports `RGBELoader`/`EXRLoader` from `three-stdlib`, not from `three`, so three's r18x `RGBELoader → HDRLoader` rename does **not** break drei.
- **`three-stdlib@2.35.6`** (drei's transitive dep): scanned 281 files, 187 named three imports — **one miss: `LuminanceFormat`**, removed in r185, used only by `postprocessing/GlitchPass.js` and `postprocessing/SSAOPass.js`. Neither is on any drei path this app would use, and **`three-stdlib@2.36.1` (2025-11-10) removed the usage.** `drei@9.122.0` declares `three-stdlib: ^2.35.6`, which permits 2.36.1, but a fresh lockfile could pick either. **Add `"three-stdlib": "^2.36.1"` to the existing `overrides` block** if drei is adopted — the repo already uses `overrides` for six other packages, so this fits the established pattern.
- **`postprocessing@6.39.4`** (via `@react-three/postprocessing@2.19.1`) declares `three: ">= 0.168.0 < 0.186.0"` — r185.1 is in range. Fine today; will need attention at three r186.

**Verdict on §2:** technically installable and technically compatible. Strategically frozen.

---

## 3. Next.js App Router integration

### 3.1 What is actually required

`'use client'` is **mandatory** for any module that constructs a `WebGLRenderer` or renders R3F's `<Canvas>`. Beyond that, the choice of raw vs R3F barely matters — both are client-only leaf components.

- **Raw three (current prototype):** `ThreeTable.tsx` has `'use client'` and does all WebGL work inside `useEffect`. Nothing touches `window`/`document` during module evaluation or render, so **it does not need `next/dynamic` + `ssr: false` at all.** It prerenders to an empty `<div ref={mountRef} />` on the server and hydrates. This is the cheapest possible integration and it is already working.
- **R3F:** `<Canvas>` also renders only a `<div><canvas/></div>` shell and creates the renderer in a layout effect, so in principle it SSRs the same way. In practice the community convention — [R3F + Next guides](https://threejsresources.com/frameworks/three-js-nextjs), [pmndrs/react-three-next](https://github.com/pmndrs/react-three-next) — is to wrap it in `dynamic(() => import('./Scene'), { ssr: false })`, because R3F pulls `three` into the server bundle for no benefit and any drei helper you add can break SSR (drei's `Html` imports `react-dom/client`; `useEnvironment` calls `useLoader` which suspends).

### 3.2 The Next 15 restriction you must know

From the [Next.js lazy-loading guide](https://nextjs.org/docs/app/guides/lazy-loading):

> **`ssr: false` option is not supported in Server Components. You will see an error if you try to use it in Server Components.**
> `ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component.

So the pattern is a **two-file sandwich**:

```
app/play/game/page.tsx            (Server Component — no dynamic import here)
  └── GameContent.tsx             'use client'  ← the dynamic(..., {ssr:false}) lives HERE
        └── ThreeTable.tsx        'use client'  ← the actual WebGL
```

`web/app/play/game/GameContent.tsx` is already a client component in this repo, so the boundary is already in the right place. This is true for both options and is **not a differentiator**.

### 3.3 Practical note

If R3F were adopted, `experimental.optimizePackageImports: ['@react-three/drei']` in `next.config.js` is worth setting — drei is a barrel with ~200 modules and Next does not include it in the default optimize list.

---

## 4. Bundle cost

All numbers below are **measured**, not quoted: I bundled with the repo's own `esbuild@0.28.1` (`--bundle --minify --format=esm`, aliasing `three` at `web/node_modules/three`) and gzipped with `gzip -9`. Bundlephobia's API was unreachable.

### 4.1 three itself

| Entry | min | **gzip** |
|---|---|---|
| `import {Vector3}` only (tree-shaking floor) | 241,931 | **54,312** |
| This repo's core three usage (renderer, scene, extrude geo, physical/standard/basic/shadow materials, canvas texture, lights, raycaster, PMREM, RT) | 558,561 | **141,842** |
| The above + the prototype's addons (RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, OutputPass) | 585,898 | **148,060** |

Two things worth knowing:
1. **`three` tree-shakes badly.** Importing a single `Vector3` already costs ~54 KB gz because `three.core.js` is one large side-effectful graph. Once `WebGLRenderer` is in, you have essentially the whole library.
2. Don't be fooled by `node_modules/three/build/three.module.min.js` (86.6 KB gz) — it is **not standalone**; it `import`s from `./three.core.min.js`. The real figure is the ~142 KB gz above.

**So: the 3D board costs ~148 KB gzip of `three` regardless of which integration you pick.** That is the dominant term and it is identical across all three options.

### 4.2 R3F on top of three

Measured per module of `@react-three/fiber@8.18.0` + its actual web-entry runtime deps (`buffer`/`base64-js` are **not** in the web graph — confirmed by grepping the ESM entry's imports):

| Piece | min | gzip |
|---|---|---|
| `react-three-fiber.esm.js` (entry) | 2,822 | 1,371 |
| internals chunk (reconciler host config, events, store, loop) | 29,290 | 11,238 |
| `react-reconciler@0.27.0` (production) | 90,590 | **27,666** |
| `scheduler@0.21.0` (production) | 4,147 | 1,807 |
| `zustand@3.7.2` | 1,565 | 850 |
| `suspend-react`, `its-fine`, `react-use-measure` | — | ~1,500 (est.) |
| **R3F total** | | **≈ 44 KB gzip** |

**~60% of R3F's weight is `react-reconciler` — a second copy of React's reconciliation engine shipped to the browser** alongside the one already inside `react-dom`. (For reference, R3F v9 vendors the reconciler into its own bundle: 153,940 min / **49,119 gz** for the internals chunk, so v9 is if anything slightly heavier.) R3F v8 also brings `scheduler@0.21` while React 18.3.1 uses `scheduler@0.23` — a small duplicate.

### 4.3 drei on top of that

drei's *own* code per helper is trivial; the weight is transitive. Measured own-code sizes (gzip): `Instances` 2.0 KB, `Bounds` 1.8 KB, `Environment` 1.3 KB, `ContactShadows` 1.1 KB, `PerspectiveCamera` 0.6 KB, `OrbitControls` 0.6 KB, `Text` 0.5 KB, `Stats` 0.4 KB, `AdaptiveDpr` 0.3 KB, `BakeShadows` 0.2 KB.

Transitive costs that matter:
- `three-stdlib` index own code: **6.3 KB gz** (per-module imports are far less; `ContactShadows` only pulls two blur shaders).
- `<Environment>` → `RGBELoader` 1.7 KB gz + `EXRLoader` 6.9 KB gz + `@monogrid/gainmap-js` decode ~4.5 KB gz + drei's own 1.3 → **≈ 15 KB gz**.
- `<Text>` → `troika-three-text` (843 KB unpacked, plus a Web Worker + font parser) — **the single heaviest drei helper**; estimate 55–70 KB gz. Not needed here (the prototype deliberately keeps text in DOM).
- `<Bvh>`/`useGLTF` → `three-mesh-bvh` (2.3 MB unpacked). Not needed here.

**A disciplined drei subset** (`Instances`, `Bounds`, `ContactShadows`, `Html`, `AdaptiveDpr`, `BakeShadows`, `PerformanceMonitor`, `Preload`) lands around **8–15 KB gz**. drei declares `"sideEffects": false` and ships per-file ESM, so webpack does tree-shake it — but drei has **22 runtime `dependencies`** (`@mediapipe/tasks-vision`, `hls.js`, `three-mesh-bvh`, `troika-three-text`, `camera-controls`, `detect-gpu`, `stats.js`, `stats-gl`, `@react-spring/three`, `@use-gesture/react`, … and, bizarrely, `cross-env`), all of which land in `node_modules` and in `npm audit` scope regardless of what you import.

### 4.4 Route-level code splitting

Identical behaviour for all three options. A `'use client'` module imported by `app/play/game/` becomes part of that route's client graph; webpack/Turbopack emits `three` as its own chunk shared by whatever routes reference it. Wrapping the scene in `dynamic(..., { ssr: false })` inside a client component moves it to a separately-fetched chunk that never loads on `/learn`, `/practice`, etc. Since the 3D board is confined to `/play/game`, **the ~148 KB `three` chunk is already off the critical path of every other route** — and that is a property of where you import it, not of R3F.

### 4.5 Summary

| Option | gzip delta over no-3D |
|---|---|
| raw three (as prototyped, with addons) | **~148 KB** |
| three + R3F | **~192 KB** (+44) |
| three + R3F + disciplined drei | **~200–207 KB** (+52–59) |
| three + R3F + drei incl. `<Environment>` | **~215–222 KB** |
| three + R3F + drei incl. `<Text>` | **~270 KB** |

R3F is a **~30% increase on an already-large 3D payload** — not catastrophic, but not free, and paid on the route where you can least afford it (a phone loading a game board).

---

## 5. Testing under jsdom with no WebGL

This is the one axis where **R3F is clearly and structurally better**, and it should be stated plainly.

### 5.1 Raw three in jsdom: effectively untestable

`new THREE.WebGLRenderer()` calls `canvas.getContext('webgl2'|'webgl')`. jsdom returns `null` (it has no WebGL and no 2D canvas without the optional `canvas` native package), and three throws `Error creating WebGL context.` The repo's `vitest.setup.ts` has no canvas/WebGL shim, which is consistent with the observed state: **`ThreeTable.tsx` has zero unit tests**, and the only coverage is Playwright + the ad-hoc headless driver `proto-check.mjs`.

What people actually do for raw three:
- **Extract the pure logic and test that.** Layout maths (`seatToWorld`, the discard column/row solver, `fitCamera`'s bounding-sphere distance, the projection+clamp in `emitSeatAnchors`, the `sig` signature builder) are pure functions of numbers. They are the parts that had real bugs — the discard-overlap bug in the README was a pure arithmetic invariant (`start distance > block half-width`) and is directly unit-testable. **This is the highest-value testing move available and it costs nothing but a refactor.**
- Mock `HTMLCanvasElement.prototype.getContext` to return a stub — brittle, and you learn nothing since nothing renders.
- Use `gl` (headless-gl) — unmaintained for modern Node, and does not support WebGL2.
- Push it all to Playwright — which is what this repo does. `proto-check.mjs` already drives headless Chrome and reads `window.__protoTicks` / `__protoRenders` / `__protoLayouts`. **Caveat the README itself records: headless Chrome uses SwiftShader software rendering, so FPS numbers are meaningless** (correctness and render-count assertions are still valid).

### 5.2 R3F in jsdom: genuinely solved

`@react-three/test-renderer@8.2.4` exists, is maintained in lockstep with R3F, and works. I read its source. It:
- Ships a complete **stub `WebGL2RenderingContext`** — a hand-listed set of ~250 no-op WebGL methods (`createProgram`, `drawElements`, `texImage2D`, `getExtension`, …).
- Monkeypatches `HTMLCanvasElement.prototype.getContext` to return that stub, so it works **with or without jsdom** (`typeof document !== 'undefined' ? document.createElement('canvas') : {getContext: () => new WebGL2RenderingContext(canvas)}`).
- Builds the **real three scene graph** through R3F's real reconciler, then exposes it as an inspectable tree.

API (per the [R3F testing docs](https://r3f.docs.pmnd.rs/api/testing) and the [RTTR readme](https://github.com/pmndrs/react-three-fiber/blob/master/packages/test-renderer/markdown/rttr.md)): `create()`, `renderer.scene`, `.children` / `.allChildren`, `toTree()`, `toGraph()`, `findByType()`, `findAll()`, `fireEvent()`, `advanceFrames()`, `update()`, `unmount()`. It is test-framework agnostic — it drops straight into the existing Vitest run.

What that buys **this** app, concretely:
- `expect(renderer.scene.findAll(m => m.type === 'Mesh')).toHaveLength(expectedTileCount)`
- assert a discarded tile's `position` lands in the right seat block, in a unit test, with no browser
- `fireEvent(tileMesh, 'click')` and assert `onTileSelect` fired with the right `Tile` — i.e. **raycast-driven interaction becomes unit-testable**
- `advanceFrames(n)` and assert the settle animation converged

That is real coverage of the exact code that is currently only smoke-tested through a screenshot. **If testability is the deciding criterion, R3F wins outright.**

### 5.3 Honest counterweight

The bugs this prototype actually shipped were: MSAA silently disabled by the composer's default render target; a per-frame instead of per-second lerp; a bilinear-downscale aliasing bug; a discard-block geometry overlap; texture memory blowing up. **`@react-three/test-renderer` would have caught exactly one of those** (the discard overlap — and a pure-function unit test catches that too, for free). The MSAA and resampling bugs are invisible to a mock GL context and only visible in a Playwright visual snapshot, which this repo already has.

---

## 6. Render-loop control — parity is not just achievable, R3F is better

The prototype measured **584 rAF ticks → 0 GPU renders over 5 idle seconds** (whole session since load: 12 renders, 5 relayouts).

Reading `ThreeTable.tsx:694-727`: `frame()` unconditionally re-arms `requestAnimationFrame(frame)` at the top, then guards only the `renderer.render()` / `composer.render()` call behind `animating || dirty > 0`. **So the 584 ticks are real work — the browser wakes the main thread 60–144×/s forever, even though the GPU does nothing.**

I read `@react-three/fiber@8.18.0`'s loop source directly. In `frameloop="demand"`:

```js
// createLoop, react-three-fiber 8.18.0
if (repeat === 0) {
  flushGlobalEffects('tail', timestamp)
  running = false
  return cancelAnimationFrame(frame)      // ← the rAF loop STOPS
}
```

and `invalidate()` restarts it:

```js
function invalidate(state, frames = 1) {
  ...
  state.internal.frames = useFrameInProgress ? 2 : 1
  if (!running) { running = true; requestAnimationFrame(loop) }
}
```

**R3F's demand mode gets to 0 rAF ticks AND 0 renders — strictly better than the prototype's 584 → 0.** Confirmed in the [scaling-performance docs](https://r3f.docs.pmnd.rs/advanced/scaling-performance) and in source.

Better still, R3F **auto-invalidates on every prop change**, structurally:

```js
function invalidateInstance(instance) {
  const state = instance.__r3f?.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}
```
called from `appendChild`, `removeChild`, `insertBefore`, `commitUpdate`, etc. **This is the direct replacement for the prototype's hand-rolled `sigRef` signature string** (`ThreeTable.tsx:766-792`) — the 25 lines that join wall length, per-player hand ids, meld counts, discard counts, palette id, selection and tutor colours into a change-detection key. Under R3F, that whole mechanism is React's own reconciliation and disappears.

Caveats that apply to R3F demand mode and are worth writing down:
- `useFrame` subscribers only run **on frames that are actually rendered** — so an ongoing animation must keep the loop alive by calling `invalidate()` from inside `useFrame` (which sets `frames = 2`, per the source above). The docs' phrasing "`useFrame` hooks won't execute in on-demand mode" is a simplification; the precise behaviour is the one in the source.
- **Async work must invalidate.** Identical to the prototype's own hard-won note ("`makeFaceTexture`'s `.then` has to request its own redraw"). R3F does not solve this; you still call `invalidate()` in the `.then`.
- Anything that *mutates* three objects outside React (camera controls, direct `mesh.position.x = …`) is invisible to the reconciler and needs manual `invalidate()`.
- Animations kicked off synchronously can jump; the documented fix is `invalidate(); requestAnimationFrame(() => start())`.

**Verdict: parity confirmed, with R3F slightly ahead** — and the automatic invalidation is the single strongest technical argument for R3F on this codebase.

---

## 7. Events, error boundaries, context loss, disposal

### 7.1 Pointer events / raycasting

- **Raw (current):** one `click` listener on the canvas, one `Raycaster`, a manually maintained `pickable[]` array, manual NDC conversion from `getBoundingClientRect()`. ~12 lines. Only click is supported; there is no hover, no `onPointerOver` highlight, no `stopPropagation`.
- **R3F:** declarative `onClick`, `onPointerOver/Out/Enter/Leave/Move`, `onDoubleClick`, `onContextMenu`, `onWheel`, `onPointerMissed` on any mesh. Events bubble like DOM events (nearest-to-camera first, then through ancestors, then to occluded objects); `stopPropagation()` blocks both. Per the [events docs](https://r3f.docs.pmnd.rs/api/events), **"by default Fiber will only raycast when the user is interacting with the canvas"** — so demand mode and events coexist without a per-frame raycast tax. Objects opt out via `raycast={null}`.

For a board that today needs only click-to-select but plausibly wants hover affordances, tooltips, and drag-to-discard later, R3F's event system is a meaningful ergonomics win. The prototype's approach does not scale past "one click handler".

### 7.2 Error boundaries

Neither option gives you one for free.
- R3F's [Canvas docs](https://r3f.docs.pmnd.rs/api/canvas) explicitly advise "safeguarding the canvas against WebGL context crashes, for instance if users have the GPU disabled or GPU drivers are faulty" — i.e. **wrap `<Canvas>` in your own React error boundary**. (R3F does export an internal `ErrorBoundary` class, but it is for suspense/loader errors, not a public API.)
- Raw three: a throw inside `useEffect` propagates to the nearest React error boundary the same way. Same amount of work.

**Either way this repo needs an explicit boundary around the 3D surface with a 2D-board fallback.** With Sentry already wired (`instrumentation-client.ts`), that boundary should report. This is a to-do regardless of the decision, and it is currently missing.

### 7.3 WebGL context loss

**Neither option handles it.** I grepped R3F v8's source: the only occurrence of anything context-loss-related is `state.gl?.forceContextLoss?.()` **on unmount** (deliberate teardown). There is **no `webglcontextlost` / `webglcontextrestored` listener anywhere in R3F v8.** (drei's `useEnvironment` registers a one-shot `webglcontextlost` listener purely to clear its gainmap loader cache — that is the only such listener in the whole family.)

So: `canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); … })` and a restore path are **DIY in both options**, and neither the prototype nor an R3F port has one today. On a mobile-targeted game board where the OS reclaims GPU contexts on backgrounding, this is a real gap. **Flag it as its own ticket, independent of #103.**

### 7.4 Disposal and resource lifecycle

This is a genuine R3F win.

- **R3F:** on unmount the reconciler walks the tree and disposes recursively — `shouldDispose = !isPrimitive && (dispose === undefined ? child.dispose !== null : dispose)`, skipping `Scene` and `<primitive>` objects (whose lifetime is outside React), plus `dispose(obj)` also disposing the object's `material`/`geometry`/`texture` properties. Root teardown additionally calls `gl.renderLists.dispose()`, `gl.forceContextLoss()`, and disposes the state. **You write nothing.** Opt out per-object with `dispose={null}`.
- **Raw:** the prototype's `dispose()` is ~20 hand-written lines covering `geometry`, `barGeometry`, `portraitGeometry`, every portrait material + its map, every bar material, `sideMaterial`, `backMaterial`, all cached materials, all `createdTextures`, `composer`, `composerTarget`, `envRT`, `pmrem`, `renderer`, plus the click listener, the `ResizeObserver`, and the DOM child. **It is correct today.** It is also exactly the kind of code that silently rots: add a new mesh type, forget one `.dispose()`, and you leak GPU memory in dev-mode StrictMode double-mounts and on every route change.

Given the README's own top-risk note ("Texture memory is now the top risk … ~94 MB … dangerous on a phone"), automatic disposal is not a cosmetic benefit here.

**StrictMode:** `reactStrictMode` is unset in `next.config.js`, so Next's default (on in dev) applies and effects double-invoke. The prototype's cleanup is correct so this is handled; R3F's `<Canvas>` handles it internally. No differentiator, but worth knowing that a broken raw dispose shows up as *two* WebGL contexts in dev.

---

## 8. drei, specifically

### 8.1 What would actually be used here

| Helper | Verdict for this app |
|---|---|
| `<Bounds>` / `useBounds` | **Genuinely useful.** Directly replaces `fitCamera()` — but the prototype's version is *biased* (pitch 39°, look target pushed to z 2.4 so the hand dominates and the far rim crops). `<Bounds>` fits the bounding sphere neutrally. You would end up fighting it to get the framing the README says the game needs. Marginal. |
| `<Instances>` / `<Instance>` | **Does not solve this repo's problem.** See §8.3. |
| `<ContactShadows>` | Cheap blurred ground shadow. The prototype uses real shadow-mapped contact shadows at 4096 with a tuned radius, which look better. Would be a *downgrade*. |
| `<Html>` | **The most useful helper here.** It anchors DOM to a 3D position and would replace `emitSeatAnchors()` + the projection + the clamping (`ThreeTable.tsx:644-667`) — the code the README calls "the DOM-overlay tax". But `<Html>` mounts a nested `react-dom/client` root per instance and does its own per-frame projection, which interacts awkwardly with demand mode. And the clamping logic (the actual hard part on a phone) is still yours to write. |
| `<AdaptiveDpr>`, `<PerformanceMonitor>`, `<BakeShadows>` | Small and real. `BakeShadows` (set `shadowMap.autoUpdate = false`) is a one-liner you can do yourself; `PerformanceMonitor` is a decent answer to the README's open "real GPU performance unmeasured". |
| `<Preload all />` | Forces shader compilation up front, avoiding first-interaction hitches. Nice-to-have. |
| `<Environment>` | **Blocked by the CSP.** See §8.2. |
| `<Text>` | Not wanted — the prototype deliberately keeps text in DOM for sharpness and screen-reader access. Would also add ~60 KB gz of troika. |
| `<OrbitControls>` / `<CameraControls>` | Not wanted — the camera is fixed by design ("an idle drift reads as drunk rather than cinematic"). |
| `<AccumulativeShadows>`, `<Lightformer>`, `<Float>`, `<Sparkles>`, `<Detailed>` | Not applicable. |

### 8.2 `<Environment>` vs this app's CSP — confirmed blocker

I read `drei@9.122.0/core/useEnvironment.js`. The preset path is hard-coded:

```js
const CUBEMAP_ROOT = 'https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/'
...
if (preset) { validatePreset(preset); files = presetsObj[preset]; path = CUBEMAP_ROOT }
```
with `presetsObj = { apartment: 'lebombo_1k.hdr', city: 'potsdamer_platz_1k.hdr', … }`.

The repo's CSP is `connect-src 'self' https://o123.ingest.us.sentry.io https://vitals.vercel-insights.com`. **`raw.githack.com` is not in it, so `<Environment preset="city" />` fails outright.** Three ways out, all worse than what exists:
1. Add `raw.githack.com` to `connect-src` — a third-party CDN on the critical render path of a game board, weakening a CSP the repo clearly maintains on purpose (see `SECURITY_REMEDIATION.md` in the tree).
2. Self-host the `.hdr` under `public/` and use `<Environment files="/hdri/x.hdr" />` — works with `'self'`, but you now ship a 1–3 MB HDR **and** ~15 KB gz of RGBE/EXR/gainmap loader code.
3. `@pmndrs/assets` (base64 CC0 assets, v1.7.0, last published 2024-09-25) — the loaders `fetch()` the `data:` URI, and **`connect-src 'self'` blocks `data:` too**; you would need `connect-src 'self' data:`.

**Meanwhile the prototype already solved this correctly and cheaply** — `THREE.PMREMGenerator` + `RoomEnvironment`, generated in-engine, zero bytes over the network, zero CSP surface. Its own comment says so:

> `RoomEnvironment is generated in-engine, so there is no external HDR to fetch — it gives the clearcoat faces something real to reflect without adding a network asset or tripping the site's CSP.`

**drei's flagship environment helper is strictly worse here than 4 lines of raw three that already exist.** That is the sharpest single data point against drei on this repo.

### 8.3 Instancing — drei does not solve the real problem

~170 tile meshes sounds like the textbook case for `<Instances>`. It is not, because **instancing requires one shared material, and every distinct tile type has a different face texture.** The prototype's `matCache` keys on `` `${tileKey(tile)}|${palette.id}` `` — up to 34 distinct materials for a typical hand.

So `<Instances>` would give you either:
- 34 separate `<Instances>` groups (≈34 draw calls — barely better than the current 170, which three already batches reasonably given a shared `ExtrudeGeometry`), or
- one instanced group + a **texture atlas with per-instance UV offsets**, which needs `onBeforeCompile` shader surgery — and drei's `<Instances>` does not help you write it.

And the atlas is the thing the README already identifies as the real fix, for a different reason:

> Texture memory is now the top risk. 640×854 RGBA is 2.08 MB per face, 2.77 with mipmaps — about 94 MB for the ~34 distinct tile types … The real fix is one KTX2/BasisU compressed atlas instead of 34 separate canvas textures, which is an asset pipeline, not a tweak.

**A KTX2/Basis atlas is required work under every option and is untouched by the R3F/drei decision.** Once you have the atlas, one `InstancedMesh` with per-instance UV attributes becomes viable — and at that point drei's `<Instances>` is still not what you want, because it manages per-instance *transforms*, not per-instance UVs. (Note also that drei's `<Instances>` writes its matrices inside `useFrame`, which under `frameloop="demand"` means instance updates need a frame scheduled — one more demand-mode interaction to reason about.)

### 8.4 Where drei hides too much

drei's abstractions are tuned for showcase scenes, not for a game board where every visual decision has already been argued out. Concretely, the README documents four fights that drei would have hidden and therefore made harder:
- IBL intensity had to drop ambient 0.85 → 0.18 and key 2.7 → 1.35. `<Environment>` gives you `environmentIntensity` but the interaction with your direct lights is still yours to tune — through one more layer.
- MSAA had to be forced via an explicitly multisampled `WebGLRenderTarget({ samples: 4 })` because `EffectComposer`'s default target has `samples: 0`. **Credit where due: `@react-three/postprocessing`'s `<EffectComposer>` exposes `multisampling` and defaults it non-zero, so this specific bug would not have happened under R3F.** But it uses the pmndrs `postprocessing` library, not three's `EffectComposer`, so the prototype's bloom tuning (strength 0.12 / radius 0.55 / threshold 1.0) would need re-deriving against a different implementation.
- Camera framing had to be deliberately biased toward the foreground. `<Bounds>` fits neutrally.
- Tutor advice lozenges had to be **unlit** so the Okabe-Ito colour tokens survive exactly. Any drei helper that applies a lit material silently breaks a colour-coded accessibility affordance.

**Rule of thumb for this repo: drei is worth it where it replaces plumbing you don't care about (`<Html>`, `<Preload>`, `<PerformanceMonitor>`), and harmful where it replaces a look you have already tuned (`<Environment>`, `<ContactShadows>`, `<Bounds>`).**

---

## 9. Developer ergonomics and long-term maintenance for a solo maintainer

### For R3F
- **Less code to own.** Disposal (~20 lines), change detection (~25 lines of `sigRef`), event plumbing (~12 lines), and the render-loop gate (~15 lines) are all replaced by library behaviour. That is ~70 lines of the prototype's 805 that stop being yours.
- **Fits the existing architecture.** `useGameController` → props → React re-render is exactly R3F's model. The prototype currently *fights* it: it has a `propsRef`, an empty-dep `useEffect`, an eslint-disable for `exhaustive-deps`, and a manual signature diff — all mechanisms for keeping React out of the scene. Under R3F the game state maps to JSX and the reconciler handles the rest.
- **Testable in the existing Vitest run** (§5.2).
- **Ecosystem answers.** Hover, drag, LOD, perf monitoring, DOM anchoring all have known solutions.
- **Hireable/AI-legible.** Far more written material and training data exists for R3F than for hand-rolled three in React.

### Against R3F, on this repo, today
- **The version you'd install is dead.** `8.18.0`, 2025-02-19, no successor. Any bug is unfixable except by a React 19 migration.
- **A rewrite of working code.** 805 lines of debugged scene code, with four documented non-obvious fixes, would be re-expressed. The prototype's hardest bugs (MSAA-through-composer, per-second lerp, high-quality resample, discard half-width invariant) are three.js-domain bugs — **R3F would not have prevented three of the four, and re-implementation risks reintroducing them.**
- **+44 KB gz** on the route that most needs to be light.
- **A new abstraction layer to debug through.** When a tile renders wrong, you now ask "is this three, or is this how R3F committed the prop?" For a solo maintainer with no one to ask, one less layer is worth real money.
- **The three.js knowledge is the asset, and it transfers.** Everything in the README's findings section is renderer-level, not React-level. It is equally valid under R3F later.

### The framing that decides it
The open work in the README is: KTX2/Basis texture atlas, an accessible DOM mirror, compact mobile plaques, discard attribution, real-GPU measurement, production bundle measurement. **Not one of those is easier under R3F.** The atlas is an asset pipeline. The accessible mirror is DOM. The measurements are Playwright and `next build`.

Spending the next increment porting 805 working lines to a frozen library buys testability and ~70 fewer lines, and costs the entire increment plus 44 KB. **That is the wrong trade right now.**

---

## 10. Recommendation

### Do this
1. **Keep raw imperative three.js.** Promote the prototype out of `prototype/` as a real component, deleting the variant-switcher scaffolding.
2. **Extract the pure geometry/layout maths into a plain TS module** (`seatToWorld`, discard block solver + the `start > half-width` invariant, `fitCamera` distance solve, the seat-anchor projection + clamp, the change signature) and unit-test it in the existing Vitest run. **This recovers most of R3F's testability advantage at a fraction of the cost**, and covers precisely the class of bug the README already shipped.
3. **Add the two things neither option gives you free**, both currently missing: a React error boundary around the 3D surface reporting to the already-wired Sentry, with a 2D-board fallback; and a `webglcontextlost` / `webglcontextrestored` handler.
4. **Keep the Playwright render-count assertions** (`__protoTicks` / `__protoRenders` / `__protoLayouts`) as a regression guard on render-on-demand — that instrumentation is already there and is genuinely good.
5. **Optional, cheap:** stop the rAF loop when idle instead of just skipping the render, mirroring R3F's `cancelAnimationFrame` behaviour. Turns 584 idle ticks into 0. ~5 lines.
6. **Do not remove `three` / `@types/three` from `package.json`** — they are the decision now, not prototype residue.

### Revisit R3F when — and only when — you upgrade to React 19
At that point pin `react@19.2.8`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.7`, `@react-three/test-renderer@9.1.1`. R3F v9 is actively maintained (9.7.0 shipped 2026-07-31, the day before this research), drei v10 is current, and the migration becomes one deliberate project instead of two coupled ones.

### If you disagree and adopt R3F now
That is a defensible call — the automatic invalidation (§6) and jsdom testability (§5.2) are real. In that case:
- pin `@react-three/fiber@8.18.0`, `@react-three/test-renderer@8.2.4` exactly;
- add `"three-stdlib": "^2.36.1"` to `overrides` (§2.4);
- **skip drei entirely at first.** Add helpers one at a time, by name, never the barrel — and never `<Environment>` (§8.2);
- set `experimental.optimizePackageImports: ['@react-three/drei']` if drei ever lands;
- use `frameloop="demand"` from day one, and keep the `invalidate()` in every async texture `.then()`;
- accept that the fix path for any R3F bug is a React 19 upgrade.

### What would change this recommendation
- The repo moving to React 19 for unrelated reasons → **switch to R3F v9 immediately**; the argument against is entirely about v8 being frozen.
- The 3D board expanding to several distinct interactive 3D surfaces rather than one → R3F's composition and event model start paying for themselves.
- A decision that the scene must be unit-tested rather than snapshot-tested → R3F + `@react-three/test-renderer` is the only option that delivers that properly.

---

## 11. Method / evidence

Everything asserted above was verified against a primary source. Nothing was quoted from memory.

**Local checkout:** read `web/package.json`, `web/next.config.js`, `web/vitest.config.ts`, `web/vitest.setup.ts`, `web/components/game/prototype/{ThreeTable.tsx,README.md}`, `web/e2e/` listing; resolved installed versions from `node_modules/*/package.json`; confirmed `THREE.REVISION === 185`; confirmed the five three-addon paths exist; confirmed `gh issue view 103`.

**Registry facts:** pulled full version histories and peer-dependency maps from `registry.npmjs.org` for `@react-three/{fiber,drei,test-renderer,postprocessing}`, `three`, `three-stdlib`, `postprocessing`, `react`, `@types/three`, `@monogrid/gainmap-js`, `troika-three-text`, `three-mesh-bvh`, `@pmndrs/assets`.

**Source inspection:** downloaded and extracted tarballs into the scratchpad (not the repo, no install) for `@react-three/fiber@{8.18.0, 9.7.0}`, `@react-three/drei@9.122.0`, `@react-three/test-renderer@8.2.4`, `three-stdlib@{2.35.6, 2.36.1}`, `react-reconciler@0.27.0`, `scheduler@0.21.0`, `zustand@3.7.2`, `@monogrid/gainmap-js@3.4.0`. Read R3F v8's loop, `invalidate`, `applyProps` encoding aliasing, disposal, and error-boundary code directly. Read drei's `useEnvironment.js` and `environment-assets.js` for the CDN constant. Read test-renderer's mock WebGL2 context.

**Symbol-level compat check:** extracted every named `import { … } from 'three'` across drei v9.122.0 (56 symbols) and three-stdlib 2.35.6 (187 symbols across 281 files) and tested each against the installed three r185 — one miss (`LuminanceFormat`, three-stdlib, fixed in 2.36.1).

**Bundle measurement:** the repo's own `esbuild@0.28.1`, `--bundle --minify --format=esm --alias:three=<repo>/node_modules/three`, gzipped with `gzip -9`. Bundlephobia's API was unreachable; all figures are first-hand.

**Docs consulted:**
- [R3F — Installation](https://r3f.docs.pmnd.rs/getting-started/installation)
- [R3F — Canvas props](https://r3f.docs.pmnd.rs/api/canvas)
- [R3F — Events](https://r3f.docs.pmnd.rs/api/events)
- [R3F — Scaling performance / on-demand rendering](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [R3F — Testing](https://r3f.docs.pmnd.rs/api/testing) and [RTTR readme](https://github.com/pmndrs/react-three-fiber/blob/master/packages/test-renderer/markdown/rttr.md)
- [R3F — v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
- [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- [Next.js — How to lazy load Client Components and libraries](https://nextjs.org/docs/app/guides/lazy-loading)
- [three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [pmndrs/react-three-next starter](https://github.com/pmndrs/react-three-next)
- [Three.js with Next.js Integration Guide (2026)](https://threejsresources.com/frameworks/three-js-nextjs)
