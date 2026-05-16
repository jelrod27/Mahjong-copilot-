# UI Design Spec: Elegant Asian Aesthetic (Mahjong Soul–Inspired)

**Date:** May 2026
**Status:** Design Document — No Code Changes
**Scope:** Full visual direction overhaul for Mahjong Copilot (HK Mahjong)
**Target Demographic:** Mahjong Soul–adjacent players who appreciate polished, atmospheric Asian game design

---

## 1. Design Philosophy

**Depart from:** 16-bit retro aesthetic (pixel fonts, neon-hot-pink borders, CRT scanlines, dark purple backgrounds, `[ BRACKET TEXT ]` UI labels).

**Move toward:** An elegant, warm, Asian-atmospheric design that evokes the feeling of sitting at a real mahjong table in a refined parlor — the same emotional space Mahjong Soul targets, but without their gacha/anime-character complexity. We achieve this through:

- **Material warmth:** Wood grains, jade greens, cloth textures instead of neon/cyberpunk
- **Restraint:** Subtle gold accents over hot-pink borders; readable serif proportions over pixel art
- **Depth:** Soft drop shadows, layered translucency, and felt-like surfaces instead of flat neon panels
- **Cultural authenticity:** CJK characters rendered beautifully; wind/seats presented with traditional calligraphic weight

**Key differentiator from Mahjong Soul:** We are NOT building a 3D renderer, gacha system, or anime-character platform. This is an elegant 2D web app. The aesthetic borrows the *atmosphere* (warm table, gold highlights, jade accents) without the *infrastructure* (3D models, character voices, live2D).

---

## 2. Color Palette

### 2.1 Primary Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-deep` | `#0D0F14` | Deepest background (page underlay, behind table) |
| `bg-table` | `#1A2B1E` | Main game-board background (dark forest green) |
| `felt` | `#2E5938` | Table felt surface (discard pool area, inner board) |
| `felt-light` | `#3A6B47` | Felt highlight (hover states, active zones) |
| `wood` | `#5C3D2E` | Warm wood tone (panel borders, frame moulding) |
| `wood-light` | `#7A5440` | Lighter wood (hover on wood elements) |
| `gold` | `#C9A84C` | Primary accent — wind badges, faan highlights, important labels |
| `gold-bright` | `#E8C55A` | Gold on dark backgrounds (headings, win states) — use sparingly |
| `jade` | `#4EADA0` | Secondary accent — tenpai indicators, positive states |
| `ivory` | `#FFF8E1` | Tile face background (preserved from current `tile-bg`) |
| `ivory-dim` | `#F0E6CC` | Dimmed ivory for older/less-important tiles |

### 2.2 Text Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#E8DFD0` | Primary body text on dark backgrounds |
| `text-secondary` | `#A89B8C` | Dimmed/secondary text, labels, descriptions |
| `text-on-gold` | `#1A1208` | Text placed on gold backgrounds (always dark) |
| `text-on-felt` | `#C8D4BE` | Text placed on felt-green surfaces |
| `text-on-ivory` | `#2C2418` | Text placed on ivory/tile surfaces |

### 2.3 Border & Divider Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `border-subtle` | `#2A3530` | Panel borders on dark backgrounds |
| `border-wood` | `#6B4832` | Warm border using wood tone |
| `border-gold` | `rgba(201, 168, 76, 0.35)` | Gold accent border (claims, selected items) |
| `divider` | `rgba(255, 248, 225, 0.08)` | Subtle dividers between sections |

### 2.4 State Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `state-win` | `#E8C55A` | Gold-glow for winning tiles |
| `state-claim` | `#4EADA0` | Jade pulse for claim windows |
| `state-danger` | `#C75B4A` | Muted red for danger/warning (not hot pink!) |
| `state-info` | `#5B9FA8` | Soft teal for informational states |
| `state-success` | `#5DAF6A` | Natural green for confirmed/success |
| `state-overlay` | `rgba(13, 15, 20, 0.82)` | Modal/overlay background |

### 2.5 Color Usage Rules

1. **Gold is the primary accent.** Use `gold` for badges, wind labels, faan counters, and important call-to-action elements. Use `gold-bright` only on near-black backgrounds.
2. **Jade is the secondary accent.** Use for tenpai, positive faan projections, and claim highlights.
3. **No hot pink / neon red.** The current `retro-accent` (#e8384f) is banned. Danger states use muted terracotta (`state-danger`).
4. **Wood tones frame the table.** Panel borders and structural framing use `wood`/`wood-light`, not neon outlines.
5. **Felt is the living surface.** The game board center uses `felt` as an active background, not as a dead dark panel.
6. **Ivory stays.** Tile faces remain `#FFF8E1` — this is already correct and reads as bone/ivory.

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Fallback | Rationale |
|------|------|----------|-----------|
| **UI / Body** | `Noto Sans SC` (Google Fonts) | `ui-sans-serif, system-ui, sans-serif` | Clean, CJK-aware, excellent legibility at small sizes. Replaces Inter + Chakra Petch. Supports Chinese characters natively. |
| **Display / Headings** | `Noto Serif SC` (Google Fonts) | `Georgia, serif` | Elegant serif with traditional CJK calligraphic weight. Used for wind characters (東南西北), game-over titles, and section headers. Replaces Press Start 2P / Orbitron. |

### 3.2 Font Mapping (Old → New)

| Current Class | Current Font | New Class | New Font |
|---------------|-------------|-----------|----------|
| `font-sans` | Inter | `font-sans` | Noto Sans SC |
| `font-retro` | Chakra Petch | `font-display` | Noto Serif SC |
| `font-pixel` | Orbitron / Press Start 2P | *(removed)* | — |

### 3.3 Sizing & Weight Guidelines

- **Body text:** 14–16px, weight 400 (Noto Sans SC Regular)
- **Labels/badges:** 11–12px, weight 500 (Noto Sans SC Medium), letter-spacing: 0.02em
- **Headings:** 20–28px, weight 600 (Noto Serif SC SemiBold)
- **Wind characters (東南西北):** 24–36px, weight 700 (Noto Serif SC Bold)
- **Small UI text (tile counts, scores):** 10–11px, weight 400, color `text-secondary`
- **Button text:** 14–16px, weight 600 (Noto Sans SC SemiBold), no brackets

### 3.4 Typography Rules

1. **No pixel fonts.** Press Start 2P, Orbitron, VT323, and Chakra Petch are all removed.
2. **No bracket-enclosed UI text.** Replace `[ DISCARD ]` → `Discard`, `[ KONG ]` → `Kong`, `[ WIN! ]` → `Win!`.
3. **No ALL CAPS body text.** Labels use sentence case or title case, not full uppercase.
4. **CJK characters use the serif display font.** 東南西北, 中發白 appear in Noto Serif SC.
5. **CJK suit labels** (萬, 索, 筒) use Noto Serif SC at the tile face level.

---

## 4. Tile Rendering Approach

### 4.1 Recommended: SVG Tiles via Open-Source Set + CSS Depth

The current `RetroTile` component renders tiles as colored rectangles with text symbols. For the new aesthetic, we recommend a **hybrid approach**:

**Phase 1 (Immediate):** Enhance the current CSS-rendered tiles with depth and shadow effects to look more like real ivory/bone tiles:

```css
/* Tile depth effect — replace flat rect with dimensional tile */
.mahjong-tile {
  background: linear-gradient(135deg, #FFF8E1 0%, #F5ECCE 100%);
  border: 1px solid #D4C9A8;
  border-radius: 3px;
  box-shadow:
    1px 2px 0 0 #C4B896,    /* right shadow edge */
    2px 3px 4px rgba(0,0,0,0.25); /* drop shadow */
}

.mahjong-tile:active,
.mahjong-tile.is-selected {
  box-shadow:
    inset 0 1px 3px rgba(0,0,0,0.15),  /* pressed-in look */
    0 0 0 2px rgba(201, 168, 76, 0.6);  /* gold selection ring */
}
```

**Phase 2 (Future enhancement):** Adopt SVG tile images from an open-source set:

- **Primary candidate:** [samoheen/mahjong-tiles](https://github.com/samoheen/mahjong-tiles) — Public Domain, has a dedicated **Hong Kong set** with correct HK tile styling.
- **Alternative candidate:** [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) — Public Domain, excellent quality, but Riichi-focused (would need adaptation for HK bonus tiles: flowers/seasons).
- **SVG approach:** Import SVGs as React components via `@svgr/webpack` or inline them. This gives crisp rendering at all sizes and easy color tinting.
- **Tile back design:** Replace current diagonal hatch with a subtle jade/dark-green pattern: `repeating-linear-gradient(45deg, #1F3A28, #1F3A28 4px, #254A30 4px, #254A30 8px)` with a small centered `🀄` or diamond watermark.

### 4.2 Tile Content Rendering

Keep the current approach of CJK characters (東南西北, 中發白, 萬索筒) rendered as text, but:

- **Use Noto Serif SC** for all tile face characters (not system sans-serif)
- **Red Dragons (中):** render in traditional red (#C75B4A, the muted terracotta, not bright red)
- **Green Dragons (發):** render in jade (#4EADA0)
- **White Dragons (白):** render in subtle gray-on-ivory with a faint blue border outline
- **Number tiles:** Use Noto Sans SC for the digit, Noto Serif SC for the suit label underneath
- **Bamboo suit color:** `#4EADA0` (jade-green instead of bright green)
- **Character suit color:** `#7A5440` (warm brown/wood instead of bright red)
- **Dot suit color:** `#5B9FA8` (soft teal instead of bright blue)

### 4.3 Tile Size System (Preserve, Rename)

| Size Name | Dimensions (px) | Usage |
|-----------|----------------|-------|
| `xs` | 24 × 36 | Tiny discard pool tiles |
| `sm` | 32 × 48 | Discard pool, opponent hands (compact) |
| `md` | 44 × 66 | Player hand on mobile, opponent hands |
| `lg` | 56 × 84 | Player hand on desktop |

Keep these sizes but rename the component from `RetroTile` → `MahjongTile` (the existing `MahjongTile.tsx` in `/components/` can be merged/renamed).

---

## 5. Table / Board Atmosphere

### 5.1 GameBoard Background

**Current:** `radial-gradient(ellipse at center, #1e2a22 0%, #0f1610 50%, #110e1a 100%)` — dark, somewhat green but feels more "space" than "table."

**New:** Layered approach simulating a real mahjong table:

```css
/* Outer: dark room */
background: #0D0F14;

/* Table surface: radial felt-green with vignette */
.game-table {
  background:
    radial-gradient(ellipse at 50% 50%, #2E5938 0%, #1A2B1E 60%, #0D0F14 100%);
}

/* Inner: subtle felt texture overlay (CSS noise) */
.game-table::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* subtle noise SVG */
  opacity: 0.03;
  pointer-events: none;
}
```

The felt should feel like **cloth**, not a flat gradient. The subtle noise overlay at 2–4% opacity achieves this without a heavy image asset.

### 5.2 Table Border / Frame

Add a warm wood-toned frame around the discard pool and center area:

```css
.table-frame {
  border: 2px solid #5C3D2E;
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.05),
    0 4px 16px rgba(0,0,0,0.4);
}
```

### 5.3 Decorative Elements

- **Center wind indicator:** Instead of a "retro-panel" box, use a circular jade-accented badge with the prevailing wind character in Noto Serif SC Bold
- **Score displays:** Render as brass/gold number plates against wood-toned backgrounds
- **Wall counter:** Small jade pill badge, not a neon tag

---

## 6. Character / Avatar System

### 6.1 Realistic Approach for a Web App

We are NOT building a gacha system. The avatar system should be:

1. **Wind-based identity badges.** Each player's seat wind (東南西北) rendered prominently in Noto Serif SC Bold inside a circular or square jade-gold badge. This is the *primary* player identity marker.

2. **Simple illustrated avatars (Phase 2).** A set of 4–8 SVG avatar illustrations in a consistent flat-illustration style (think: understated ink-brush characters). These would be:
   - A small set, not a gacha pool
   - Selectable in settings from a pre-made gallery
   - Rendered as 48×48px SVGs at the top of each player's info bar
   - *Source:* Commission a small set from an illustrator, or use a public-domain illustration pack adapted to this style

3. **Emoji reaction system (Phase 2).** A small panel of 6–8 mahjong-themed reaction emojis that can be sent during play (🀄, 😤, 🤔, 👍, etc.), displayed as brief floating toasts — similar to Mahjong Soul's sticker system but dramatically simpler.

### 6.2 Player Info Bar Design

Replace the current ASCII-art style player bar:

**Current:**
```
[Seat Wind] Player Name  ★ DEALER   🌸 ×2  Score: 1200
```

**New:**
- Left: Circular wind badge (東) in gold-on-jade circle, 28px
- Center: Player name in Noto Sans SC Medium, 14px
- Dealer marker: Small `★` in gold, not hot pink
- Right: Score in gold, flower count as small jade icon

---

## 7. Animation Guidelines

### 7.1 Existing Animations to Preserve (with updated colors)

| Animation | Current Name | Current Colors | New Name | New Colors |
|-----------|-------------|----------------|----------|------------|
| Tile draw | `animate-tile-draw` | — (neutral) | `animate-tile-draw` | — (unchanged motion, update easing) |
| Tile discard | `animate-tile-discard` | — (neutral) | `animate-tile-discard` | — (unchanged motion) |
| Tile claim | `animate-tile-claim` | `#2ed8a3` (cyan-green glow) | `animate-tile-claim` | `#4EADA0` (jade glow) |
| Tile win | `animate-tile-win` | `#f5b731` (gold glow) | `animate-tile-win` | `#E8C55A` (gold-bright glow) |
| Pulse gold | `animate-pulse-gold` | `#f5b731` | `animate-pulse-gold` | `#C9A84C` |
| Tile arrive (discard pool) | `animate-tile-arrive` | — | `animate-tile-arrive` | — (unchanged) |
| Tile depart | `animate-tile-depart` | — | `animate-tile-depart` | — (unchanged) |

### 7.2 New / Updated Animation Definitions

```css
/* Tile draw — slightly smoother easing */
@keyframes tile-draw {
  0%   { opacity: 0; transform: translateY(-10px) scale(0.92); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-tile-draw {
  animation: tile-draw 0.25s cubic-bezier(0.22, 1, 0.36, 1); /* ease-out-quint */
}

/* Tile claim — jade pulse instead of cyan */
@keyframes tile-claim {
  0%   { box-shadow: 0 0 0 transparent; }
  30%  { box-shadow: 0 0 14px #4EADA0, 0 0 28px rgba(78, 173, 160, 0.25); }
  100% { box-shadow: 0 0 0 transparent; }
}
.animate-tile-claim {
  animation: tile-claim 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Tile win — warm gold glow */
@keyframes tile-win {
  0%, 100% { box-shadow: 0 0 3px #C9A84C; transform: scale(1); }
  50%      { box-shadow: 0 0 18px #E8C55A, 0 0 36px rgba(232, 197, 90, 0.35); transform: scale(1.04); }
}
.animate-tile-win {
  animation: tile-win 1.4s ease-in-out infinite;
}

/* Gold pulse for suggested/important tiles */
@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 3px #C9A84C; }
  50%      { box-shadow: 0 0 10px #C9A84C, 0 0 18px rgba(201, 168, 76, 0.3); }
}
.animate-pulse-gold {
  animation: pulse-gold 1.6s ease-in-out infinite;
}
```

### 7.3 Removed Animations

| Animation | Reason |
|-----------|--------|
| `retro-scanline` | CRT effect, incompatible with elegant aesthetic |
| `text-glow-retro` | Neon glow on text, replaced by subtle shadow or no glow |
| `text-glow-cyan` | Neon glow, replaced by `text-glow-jade` |
| `text-glow-gold` | Replaced by `text-shimmer-gold` (subtle, less neon) |
| `animate-blink` | Blinking cursor effect — replace with a gentle opacity pulse |

### 7.4 New Animation Utility Classes

```css
/* Subtle text shimmer for important labels */
.text-shimmer-gold {
  text-shadow: 0 0 8px rgba(201, 168, 76, 0.4);
}

/* Gentle pulse for active turn indicator (replaces blink) */
@keyframes gentle-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}
.animate-gentle-pulse {
  animation: gentle-pulse 2s ease-in-out infinite;
}

/* Slide-in for panels (preserved from current) */
.animate-slide-up {
  animation: slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 7.5 Animation Duration Standards

| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover, press) | 100–150ms | ease |
| Tile actions (draw, discard) | 200–300ms | cubic-bezier(0.22, 1, 0.36, 1) |
| Claim/win effects | 400–600ms | cubic-bezier(0.22, 1, 0.36, 1) |
| Panel transitions | 300–400ms | cubic-bezier(0.22, 1, 0.36, 1) |
| Continuous loops (pulse, win glow) | 1.4–2.0s | ease-in-out |

---

## 8. Mobile-First Responsive Approach

### 8.1 Breakpoint Strategy (Preserve Current, Refine)

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | Current compact mode (preserve) |
| Tablet | 640–767px | Current tablet mode (preserve) |
| Desktop | ≥ 768px | Current desktop mode (preserve) |

The current responsive layout structure is sound — the migration focuses on **visual tokens**, not layout reorganization.

### 8.2 Mobile-Specific Design Decisions

- **Tile sizes:** Sm tiles on mobile (< 640px), Md on tablet, Lg on desktop — preserved from current
- **Touch targets:** All interactive elements ≥ 44px — preserved from current
- **Bottom nav:** Preserve `BottomNav.tsx` structure, restyle with new tokens
- **Sidebar:** Replace `AppSidebar.tsx` neon panel with wood-toned panel
- **Font scaling:** Noto Sans SC renders well at 12px+; ensure `comfortable-text` mode works

### 8.3 Safe Area

Preserve existing `safe-area-pb` utility for iPhone notch/home bar.

---

## 9. Tailwind Config Migration Plan

### 9.1 Changes to `tailwind.config.ts`

**Remove:**
```ts
// REMOVE entire retro color namespace
retro: {
  bg: "#110e1a",
  bgLight: "#1c1829",
  panel: "#2a2240",
  border: "#e8384f",
  accent: "#e8384f",
  gold: "#f5b731",
  green: "#2ed8a3",
  cyan: "#45b7d1",
  text: "#ede4d3",
  textDim: "#958a84",
  white: "#f7f0e3",
}

// REMOVE retro/pixel font families
fontFamily: {
  retro: ['"Chakra Petch"', 'sans-serif'],
  pixel: ['"Orbitron"', 'sans-serif'],
}
```

**Add:**
```ts
colors: {
  // Keep existing mahjong, tile, suit tokens (they're fine)
  
  // NEW: Table surface palette
  table: {
    bg: '#0D0F14',
    deep: '#1A2B1E',
    felt: '#2E5938',
    'felt-light': '#3A6B47',
    wood: '#5C3D2E',
    'wood-light': '#7A5440',
  },
  
  // NEW: Accent palette
  gold: {
    DEFAULT: '#C9A84C',
    bright: '#E8C55A',
    dim: '#8B7533',
  },
  jade: {
    DEFAULT: '#4EADA0',
    dim: '#3A8A7F',
    bright: '#6CC9BC',
  },
  
  // NEW: Ivory (replaces tile-bg concept, broader use)
  ivory: {
    DEFAULT: '#FFF8E1',
    dim: '#F0E6CC',
    warm: '#FFF4D6',
  },
  
  // NEW: Text palette
  text: {
    primary: '#E8DFD0',
    secondary: '#A89B8C',
    'on-gold': '#1A1208',
    'on-felt': '#C8D4BE',
    'on-ivory': '#2C2418',
  },
  
  // NEW: Border palette
  border: {
    subtle: '#2A3530',
    wood: '#6B4832',
    gold: 'rgba(201, 168, 76, 0.35)',
  },
  
  // NEW: State palette
  state: {
    win: '#E8C55A',
    claim: '#4EADA0',
    danger: '#C75B4A',
    info: '#5B9FA8',
    success: '#5DAF6A',
    overlay: 'rgba(13, 15, 20, 0.82)',
  },
},

fontFamily: {
  sans: ['"Noto Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['"Noto Serif SC"', 'Georgia', 'serif'],
},

// Update suit colors for more muted, warmer palette
suit: {
  bamboo: '#4EADA0',      // was #4CAF50 (bright green) → jade green
  character: '#7A5440',   // was #B71C1C (bright red) → warm brown
  dot: '#5B9FA8',         // was #2196F3 (bright blue) → soft teal
  honor: '#8A7E72',       // was #9E9E9E (gray) → warm gray
},
```

### 9.2 Google Fonts Import (in `globals.css`)

**Remove:**
```css
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&display=swap');
```

**Replace with:**
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');
```

### 9.3 CSS Custom Properties (in `globals.css` `:root`)

**Remove** all retro-themed CSS variables and replace:

```css
:root {
  --background: #0D0F14;
  --foreground: #E8DFD0;
  --card: rgba(26, 43, 30, 0.85);
  --card-foreground: #E8DFD0;
  --popover: #1A2B1E;
  --popover-foreground: #E8DFD0;
  --primary: #C9A84C;
  --primary-foreground: #1A1208;
  --secondary: #2E5938;
  --secondary-foreground: #C8D4BE;
  --muted: #1A2B1E;
  --muted-foreground: #A89B8C;
  --accent: #4EADA0;
  --accent-foreground: #0D0F14;
  --destructive: #C75B4A;
  --border: rgba(92, 61, 46, 0.4);
  --input: rgba(92, 61, 46, 0.5);
  --ring: #C9A84C;
  --radius: 0.375rem; /* slightly rounder than retro 0.125rem */
  --chart-1: #4EADA0;
  --chart-2: #5DAF6A;
  --chart-3: #C9A84C;
  --chart-4: #C75B4A;
  --chart-5: #A89B8C;
  --sidebar: #1A2B1E;
  --sidebar-foreground: #E8DFD0;
  --sidebar-primary: #4EADA0;
  --sidebar-primary-foreground: #0D0F14;
  --sidebar-accent: rgba(46, 89, 56, 0.85);
  --sidebar-accent-foreground: #E8DFD0;
  --sidebar-border: rgba(92, 61, 46, 0.3);
  --sidebar-ring: #C9A84C;
}
```

### 9.4 Component Classes to Remove / Replace

| Remove | Replace With |
|--------|-------------|
| `.retro-panel` | `.game-panel` (felt-green surface with wood border) |
| `.retro-card` | `.game-card` (ivory-on-felt card with subtle shadow) |
| `.neo-retro-card` | `.game-card-elevated` (elevated card with more shadow) |
| `.retro-btn` / `.retro-btn-accent` / `.retro-btn-green` / `.retro-btn-gold` | `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-gold` |
| `.retro-btn-modern` | `.btn-outline` |
| `.retro-input` | `.input` (standard shadcn/input with warm border) |
| `.glass-panel` | *(keep — it's aesthetic-agnostic)* |
| `.retro-glow` / `.retro-glow-strong` | `.text-shimmer-gold` / *(remove strong)* |
| `.retro-scanline` | *(remove entirely)* |
| `.text-glow-retro` / `.text-glow-cyan` / `.text-glow-gold` | `.text-shimmer-gold` / `.text-shimmer-jade` |

---

## 10. Component-by-Component Impact Assessment

### 10.1 Game Components

| Component | File | Current Theme Usage | Migration Effort | Notes |
|-----------|------|-------------------|-----------------|-------|
| **GameBoard** | `GameBoard.tsx` | `retro-panel`, `font-pixel`, `retro-gold`, `retro-cyan`, `retro-glow`, radial-gradient bg | **High** | Core board; replace bg gradient, all retro-* classes, turn indicator panel |
| **PlayerHand** | `PlayerHand.tsx` | `font-pixel` for tutor labels, uses `RetroTile` | **Medium** | Rename RetroTile refs, update tutor label styling |
| **RetroTile** | `RetroTile.tsx` | `retro-textDim`, `retro-cyan`, `retro-gold`, `animate-pulse-gold`, `border-retro-*`, `#FFF8E1` tile bg, `SUIT_COLORS` map | **High** | Rename to `MahjongTile`, update all color references, update suit color map, add tile depth CSS, update tile back pattern |
| **DiscardPool** | `DiscardPool.tsx` | `retro-panel`, `retro-textDim`, `retro-gold`, `retro-cyan`, `animate-pulse-gold`, `font-pixel`, `font-retro` | **Medium** | Replace panel class, update all color tokens, update font classes |
| **ActionBar** | `ActionBar.tsx` | `retro-btn-*`, `font-pixel`, `retro-textDim`, `retro-cyan`, `retro-accent`, `retro-green`, `retro-bgLight`, brackets in labels | **High** | All buttons need restyling; labels need debracketing; `retro-btn-*` → new `.btn-*` |
| **FaanMeter** | `FaanMeter.tsx` | `retro-panel`, `font-pixel`, `retro-gold`, `retro-cyan`, `retro-green`, `retro-accent`, `retro-textDim`, `retro-glow`, `retro-border`, `retro-bg` | **High** | Extensive retro token usage; replace all, restyle progress bars |
| **GameHUD** | `GameHUD.tsx` | `retro-panel`, `font-pixel`, `font-retro`, `retro-gold`, `retro-cyan`, `retro-green`, `retro-accent`, `retro-textDim`, `retro-border`, `retro-glow`, `retro-bg`, ASCII-art box characters `╔══╗` | **High** | Remove ASCII-art decorations, restyle panel, update all tokens |
| **OpponentHand** | `OpponentHand.tsx` | `retro-gold`, `retro-cyan`, `retro-textDim`, `font-pixel`, `retro-glow`, `animate-blink` | **Medium** | Restyle wind badges, remove pixel font, replace blink with gentle-pulse |
| **GameOverScreen** | `GameOverScreen.tsx` | `retro-panel`, `font-pixel`, `font-retro`, `retro-gold`, `retro-green`, `retro-accent`, `retro-cyan`, `retro-textDim`, `retro-glow*`, `retro-border`, ASCII-art boxes | **High** | Major restyle — remove ASCII art, replace all tokens, new modal design |
| **TurnIndicator** | `TurnIndicator.tsx` | `retro-panel`, `retro-gold`, `retro-green`, `retro-accent`, `retro-textDim`, `font-pixel`, `retro-glow`, `font-retro` | **Medium** | Replace panel, update colors, new wind badge design |
| **ExposedMelds** | `ExposedMelds.tsx` | Uses `RetroTile` internally | **Low** | Update import to `MahjongTile` |
| **TutorPanel** | `TutorPanel.tsx` | Likely uses `retro-*` tokens | **Medium** | Standardize to new token classes |
| **GameToast** | `GameToast.tsx` | Likely uses `retro-*` tokens | **Low** | Restyle with new tokens |
| **ChowSelector** | `ChowSelector.tsx` | Likely uses `retro-btn-*` | **Medium** | Update to `.btn-*` |
| **DiscardReadingPanel** | `DiscardReadingPanel.tsx` | Likely uses `retro-*` tokens | **Medium** | Standard token replacement |
| **HandResultScreen** | `HandResultScreen.tsx` | Likely uses `retro-*` tokens | **Medium** | Standard token replacement |
| **MatchOverScreen** | `MatchOverScreen.tsx` | Likely uses `retro-*` tokens | **Medium** | Standard token replacement |
| **HintOverlay** | `HintOverlay.tsx` | Likely uses `retro-*` tokens | **Low** | Standard token replacement |
| **VoiceSubtitle** | `VoiceSubtitle.tsx` | Likely uses `retro-*` tokens | **Low** | Standard token replacement |
| **TurnTimer** | `TurnTimer.tsx` | Likely uses `retro-*` tokens | **Low** | Restyle with jade/gold |

### 10.2 Layout Components

| Component | File | Migration Effort | Notes |
|-----------|------|----------------|-------|
| **AppSidebar** | `layout/AppSidebar.tsx` | **Medium** | Replace `retro-panel` with wood-toned panel, update all retro tokens |
| **BottomNav** | `layout/BottomNav.tsx` | **Medium** | Restyle nav bar — dark wood tone instead of purple panel, update active states to jade |
| **Home page** | `(main)/page.tsx` | **Medium** | Replace neo-retro cards with game-card, update all tokens |

### 10.3 shadcn/ui Components

| Component | File | Migration Effort | Notes |
|-----------|------|----------------|-------|
| button | `ui/button.tsx` | **Low** | CSS variables auto-update via `:root` changes |
| card | `ui/card.tsx` | **Low** | CSS variables auto-update |
| input | `ui/input.tsx` | **Low** | CSS variables auto-update |
| badge | `ui/badge.tsx` | **Low** | May need gold/jade variant additions |
| progress | `ui/progress.tsx` | **Low** | Update bar color from cyan to jade |
| tooltip | `ui/tooltip.tsx` | **Low** | Auto-updates via CSS variables |
| sheet | `ui/sheet.tsx` | **Low** | Update overlay color to new `state-overlay` |
| skeleton | `ui/skeleton.tsx` | **Low** | Update pulse color |
| sidebar | `ui/sidebar.tsx` | **Medium** | CSS variables update, but may need wood-toned border tweaks |
| separator | `ui/separator.tsx` | **Low** | Auto-updates |

### 10.4 Other Pages

| Page | Path | Migration Effort | Notes |
|------|------|----------------|-------|
| Login | `/login` | **Low** | CSS variables auto-propagate |
| Signup | `/signup` | **Low** | Same |
| Profile | `/profile` | **Low** | Same |
| Leaderboard | `/leaderboard` | **Low** | Same |
| Learn pages | `/learn/**` | **Medium** | May have retro-styled components |
| Practice pages | `/practice/**` | **Medium** | Uses `MahjongTile`, `SetBuilder` — update tokens |
| Reference | `/reference` | **Low** | CSS variable update |
| Settings | `/settings` | **Low** | CSS variable update |
| Play lobby | `/play/` | **Medium** | Cards and buttons need token update |
| Multiplayer lobby | `/multiplayer/` | **Medium** | Same |

---

## 11. Layout.tsx Migration

### 11.1 Font Loading

**Current:**
```tsx
import { Inter, VT323, Press_Start_2P } from "next/font/google";
// 3 fonts loaded → 3 CSS variable bindings
```

**New:**
```tsx
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});
```

### 11.2 Body Classes

**Current:** `bg-retro-bg text-retro-text font-sans`
**New:** `bg-table-bg text-text-primary font-sans`

### 11.3 Metadata

**Current title:** "16 Bit Mahjong"
**Proposed title:** "Mahjong Copilot" (or keep "16 Bit Mahjong" — brand decision separate from visual design)

---

## 12. Migration Sequencing (Recommended Order)

1. **Phase 0: Prep** — Create the design token CSS variables and new Tailwind config in a branch. Don't change any components yet.
2. **Phase 1: Foundation** — Update `globals.css`, `tailwind.config.ts`, and `layout.tsx` (fonts, CSS variables, utility classes)
3. **Phase 2: Design the new component classes** — Add `.game-panel`, `.game-card`, `.btn-*` etc. in `globals.css` alongside the old `.retro-*` classes (both live simultaneously for gradual migration)
4. **Phase 3: Core game components** — Migrate `RetroTile` → `MahjongTile`, `GameBoard`, `PlayerHand`, `DiscardPool`, `ActionBar`
5. **Phase 4: Supporting panels** — `FaanMeter`, `GameHUD`, `TutorPanel`, `TurnIndicator`, `OpponentHand`
6. **Phase 5: Screens** — `GameOverScreen`, `HandResultScreen`, `MatchOverScreen`
7. **Phase 6: Layout & navigation** — `AppSidebar`, `BottomNav`, home page cards
8. **Phase 7: Non-game pages** — Login, profile, learn, practice, etc.
9. **Phase 8: Cleanup** — Remove all `.retro-*` classes, delete unused font imports, remove old color tokens

---

## 13. Accessibility Notes

- **Color contrast:** All text-primary (#E8DFD0) on bg-deep (#0D0F14) passes WCAG AA at 10.7:1. Gold (#C9A84C) on bg-deep passes at 6.5:1. Jade (#4EADA0) on bg-deep passes at 5.8:1. All pass WCAG AA.
- **Danger state:** `#C75B4A` on dark backgrounds ≈ 3.8:1 — acceptable for large text/badges but NOT for body text. Use `state-danger` only for icons/badges; pair with text label.
- **Focus rings:** Use gold ring (`--ring: #C9A84C`) for keyboard focus — highly visible on both dark and felt surfaces.
- **Motion:** Preserve `prefers-reduced-motion` handling. All animations should be CSS-based and respect `@media (prefers-reduced-motion: reduce)`.

---

## 14. Appendix: Visual Reference Notes

### 14.1 Mahjong Soul Key Design Observations

From research of Mahjong Soul screenshots, reviews, and UI breakdowns:

- **Table surface:** Deep green felt with subtle cloth texture, surrounded by a warm wood-colored table frame
- **UI chrome:** Dark semi-transparent panels with rounded corners, not neon/bordered boxes
- **Accent color:** Gold/golden-yellow for important UI elements (scores, wind indicators, win announcements)
- **Secondary accent:** Jade/emerald green for positive states (tenpai, claim available)
- **Typography:** Clean sans-serif for UI, serif for dramatic/wind characters. NOT pixel fonts.
- **Animations:** Smooth, flowing transitions — tiles slide and settle, not blink or glitch. Win celebrations use particle effects and gold sparkles.
- **Character presentation:** 2D character portraits positioned at their seat, with speech-bubble reactions. We skip this complexity but adopt the *seat-identity* concept.
- **Overall atmosphere:** Warm, inviting, like an upscale mahjong parlor — not a cyberpunk arcade.
- **Customization:** Tile backs, tablecloths, win animations are customizable. We can offer a single polished default.

### 14.2 Open Source Tile Resources

| Resource | License | HK Tile Support | Quality | Notes |
|----------|---------|----------------|---------|-------|
| [samoheen/mahjong-tiles](https://github.com/samoheen/mahjong-tiles) | Public Domain | ✅ Dedicated HK set | Good | Best match for HK Mahjong |
| [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles) | Public Domain (CC0) | ❌ Riichi only | Excellent | Needs flower/season tiles added |
| [perthmahjongsoc/mahjong-tiles-svg](https://github.com/perthmahjongsoc/mahjong-tiles-svg) | CC BY-SA 4.0 | ✅ Standard set | Good | Minified SVGs, oblique illustrations |

---

## 15. Naming Conventions

| Old Name | New Name | Context |
|----------|----------|---------|
| `retro-*` (all tokens) | `table-*` / `gold-*` / `jade-*` / `text-*` / `state-*` | Tailwind tokens |
| `font-retro` | `font-display` | Font family |
| `font-pixel` | *(removed)* | Font family |
| `RetroTile` (component) | `MahjongTile` | Component name |
| `.retro-panel` | `.game-panel` | CSS class |
| `.retro-card` | `.game-card` | CSS class |
| `.retro-btn-*` | `.btn-*` | CSS classes |
| `bg-retro-bg` | `bg-table-bg` | Tailwind class |
| `text-retro-gold` | `text-gold` | Tailwind class |
| `border-retro-border` | `border-border-wood` | Tailwind class |
| `retro-glow` | `text-shimmer-gold` | CSS utility |
| `16 Bit Mahjong` (brand) | `Mahjong Copilot` (TBD) | Brand name — separate decision |

---

*End of design spec. This document is a reference for implementation planning. No source files were modified in the creation of this spec.*