'use client';

import { useId } from 'react';
import { NpcId, NpcEmotion, NPCS } from '@/content/npcs';

interface CharacterPortraitProps {
  character: NpcId;
  emotion: NpcEmotion;
  size?: 'sm' | 'md' | 'lg';
  /** Show the aura halo behind the portrait. Defaults to true. */
  showAura?: boolean;
  /**
   * 'bust' renders the full 200x240 rig; 'face' crops to the head so the
   * character stays legible at plaque scale (56px and below).
   */
  framing?: 'bust' | 'face';
}

const SIZE_PX: Record<NonNullable<CharacterPortraitProps['size']>, number> = {
  sm: 56,
  md: 96,
  lg: 160,
};

/**
 * Stylized SVG character portrait. Composed of swappable face / hair /
 * expression rig so a single component renders all 3 NPCs × 6 emotions.
 *
 * Style is deliberately stylized cartoon — clean fills, two-tone shading,
 * limited palette. The point is that each character is recognisably distinct
 * (face shape + hair style/color + accessory) and emotion is legible at a
 * glance from eye and mouth shape alone.
 */
export default function CharacterPortrait({
  character,
  emotion,
  size = 'md',
  showAura = true,
  framing = 'bust',
}: CharacterPortraitProps) {
  const npc = NPCS[character];
  const traits = npc.visualTraits;
  const px = SIZE_PX[size];
  // SVG gradient ids must be unique PER INSTANCE: the same character renders
  // in multiple responsive branches, and url(#...) resolves to the first id
  // in the document — if that lives in a display:none subtree, Chrome paints
  // the fill black. (This was the "portraits look different on desktop" bug.)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  // Round 2 art-swap path: when an image override exists for this emotion,
  // render it directly. Falls back to the SVG rig for emotions without art
  // so partial art sets are valid.
  const imageOverride = npc.portraitImageSet?.[emotion];
  if (imageOverride) {
    // Plain <img> rather than next/image: portraitImageSet entries may be
    // arbitrary data/blob/remote URLs that the consumer supplies at runtime,
    // and we don't want to force every drop-in art set through a domain
    // allowlist. Lazy + async hints offset most of the LCP cost.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageOverride}
        alt={`${npc.name}, ${emotion}`}
        width={px}
        height={px * 1.2}
        data-testid={`portrait-${character}-${emotion}`}
        className="select-none object-contain"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  const isFace = framing === 'face';
  return (
    <svg
      viewBox={isFace ? '32 36 136 136' : '0 0 200 240'}
      width={px}
      height={isFace ? px : px * 1.2}
      role="img"
      aria-label={`${npc.name}, ${emotion}`}
      data-testid={`portrait-${character}-${emotion}`}
      className="select-none"
    >
      <defs>
        <radialGradient id={`aura-${character}-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={traits.auraStops[0]} stopOpacity="0.55" />
          <stop offset="100%" stopColor={traits.auraStops[1]} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`hair-shade-${character}-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={traits.hairColor} />
          <stop offset="100%" stopColor={shade(traits.hairColor, -0.18)} />
        </linearGradient>
        <linearGradient id={`skin-shade-${character}-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={traits.skinColor} />
          <stop offset="100%" stopColor={shade(traits.skinColor, -0.1)} />
        </linearGradient>
      </defs>

      {showAura && (
        <circle cx="100" cy="100" r="105" fill={`url(#aura-${character}-${uid})`} />
      )}

      {/* Hair back layer — sits behind face/neck. */}
      <HairBack style={traits.hairStyle} character={character} uid={uid} />

      {/* Neck */}
      <path
        d="M 84 178 Q 84 200 100 208 Q 116 200 116 178 Z"
        fill={`url(#skin-shade-${character}-${uid})`}
      />
      <path
        d="M 70 220 Q 100 200 130 220 L 130 240 L 70 240 Z"
        fill={shade(traits.auraStops[1], -0.2)}
      />

      {/* Face */}
      <Face shape={traits.faceShape} character={character} uid={uid} />

      {/* Blush */}
      <BlushMarks shape={traits.faceShape} color={traits.blushColor} emotion={emotion} />

      {/* Expression rig: brows + eyes + mouth */}
      <Brows emotion={emotion} hairColor={traits.hairColor} />
      <Eyes emotion={emotion} eyeColor={traits.eyeColor} character={character} />
      <Mouth emotion={emotion} skinColor={traits.skinColor} character={character} />

      {/* Hair front layer — bangs sit over forehead. */}
      <HairFront style={traits.hairStyle} character={character} uid={uid} />

      {/* Hair shine */}
      <HairShine style={traits.hairStyle} character={character} />

      {/* Accessory overlay */}
      <Accessory kind={traits.accessory} character={character} />
    </svg>
  );
}

/* ─────────────────────────────────────────
   Face / hair primitives
   ───────────────────────────────────────── */

function Face({ shape, character, uid }: { shape: NpcVisualTraits['faceShape']; character: NpcId; uid: string }) {
  const fill = `url(#skin-shade-${character}-${uid})`;
  switch (shape) {
    case 'round':
      return <ellipse cx="100" cy="116" rx="48" ry="52" fill={fill} />;
    case 'oval':
      return <ellipse cx="100" cy="118" rx="42" ry="56" fill={fill} />;
    case 'angular':
      return (
        <path
          d="M 60 100 Q 60 70 100 66 Q 140 70 140 100 L 138 144 Q 130 172 100 178 Q 70 172 62 144 Z"
          fill={fill}
        />
      );
  }
}

function HairBack({
  style,
  character,
  uid,
}: {
  style: NpcVisualTraits['hairStyle'];
  character: NpcId;
  uid: string;
}) {
  const fill = `url(#hair-shade-${character}-${uid})`;
  switch (style) {
    case 'short-bob':
      return (
        <path
          d="M 50 110 Q 50 56 100 50 Q 150 56 150 110 L 150 142 Q 144 138 144 130 L 144 102 Q 100 92 56 102 L 56 130 Q 56 138 50 142 Z"
          fill={fill}
        />
      );
    case 'long-straight':
      return (
        <>
          <path
            d="M 48 80 Q 50 40 100 40 Q 150 40 152 80 L 156 220 L 132 226 Q 132 180 132 130 Q 100 100 68 130 Q 68 180 68 226 L 44 220 Z"
            fill={fill}
          />
        </>
      );
    case 'long-sleek':
      return (
        <>
          <path
            d="M 48 84 Q 50 36 100 32 Q 150 36 152 84 L 162 230 L 134 232 Q 134 184 134 132 Q 100 96 66 132 Q 66 184 66 232 L 38 230 Z"
            fill={fill}
          />
        </>
      );
  }
}

function HairFront({
  style,
  character,
  uid,
}: {
  style: NpcVisualTraits['hairStyle'];
  character: NpcId;
  uid: string;
}) {
  const fill = `url(#hair-shade-${character}-${uid})`;
  switch (style) {
    case 'short-bob':
      // Short messy bangs sweeping right.
      return (
        <path
          d="M 56 96 Q 70 64 110 70 Q 140 74 144 96 Q 130 78 110 80 Q 90 82 80 92 Q 70 100 60 100 Z"
          fill={fill}
        />
      );
    case 'long-straight':
      // Center-parted bangs, slight side sweep.
      return (
        <path
          d="M 58 92 Q 78 60 100 58 Q 122 60 142 92 Q 130 80 110 86 Q 100 88 90 86 Q 70 80 58 92 Z"
          fill={fill}
        />
      );
    case 'long-sleek':
      // Long swept bangs covering one brow.
      return (
        <path
          d="M 56 96 Q 80 56 142 60 Q 158 84 152 100 Q 140 84 116 86 Q 96 90 80 102 Q 64 110 56 96 Z"
          fill={fill}
        />
      );
  }
}

/* ─────────────────────────────────────────
   Expression rig
   ───────────────────────────────────────── */

function Eyes({
  emotion,
  eyeColor,
  character,
}: {
  emotion: NpcEmotion;
  eyeColor: string;
  character: NpcId;
}) {
  const sclera = '#ffffff';
  const lash = character === 'aki' ? '#2a1830' : '#1a1320';
  const showLashes = emotion !== 'triumphant' && emotion !== 'frustrated';

  const renderEyes = () => {
  switch (emotion) {
    case 'idle':
      return (
        <>
          <ellipse cx="80" cy="120" rx="8" ry="9" fill={sclera} stroke={lash} strokeWidth="1.5" />
          <ellipse cx="120" cy="120" rx="8" ry="9" fill={sclera} stroke={lash} strokeWidth="1.5" />
          <circle cx="80" cy="121" r="4.5" fill={eyeColor} />
          <circle cx="120" cy="121" r="4.5" fill={eyeColor} />
          <circle cx="78" cy="118" r="1.8" fill="#ffffff" />
          <circle cx="118" cy="118" r="1.8" fill="#ffffff" />
        </>
      );
    case 'thinking':
      // Eyes drift slightly upward and to one side.
      return (
        <>
          <ellipse cx="80" cy="120" rx="7" ry="7" fill={sclera} stroke={lash} strokeWidth="1.5" />
          <ellipse cx="120" cy="120" rx="7" ry="7" fill={sclera} stroke={lash} strokeWidth="1.5" />
          <circle cx="83" cy="118" r="3.5" fill={eyeColor} />
          <circle cx="123" cy="118" r="3.5" fill={eyeColor} />
        </>
      );
    case 'smug':
      // Half-lidded, downward-curved.
      return (
        <>
          <path d="M 73 120 Q 80 116 87 120" stroke={lash} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 113 120 Q 120 116 127 120" stroke={lash} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="80" cy="120" r="2" fill={eyeColor} />
          <circle cx="120" cy="120" r="2" fill={eyeColor} />
        </>
      );
    case 'surprised':
      // Wide circular eyes.
      return (
        <>
          <circle cx="80" cy="120" r="9" fill={sclera} stroke={lash} strokeWidth="1.5" />
          <circle cx="120" cy="120" r="9" fill={sclera} stroke={lash} strokeWidth="1.5" />
          <circle cx="80" cy="120" r="3" fill={eyeColor} />
          <circle cx="120" cy="120" r="3" fill={eyeColor} />
        </>
      );
    case 'frustrated':
      // Narrowed slits angled inward.
      return (
        <>
          <path d="M 72 120 L 88 118" stroke={lash} strokeWidth="3" strokeLinecap="round" />
          <path d="M 112 118 L 128 120" stroke={lash} strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="119" r="1.5" fill={eyeColor} />
          <circle cx="120" cy="119" r="1.5" fill={eyeColor} />
        </>
      );
    case 'triumphant':
      // Closed happy upturned crescents.
      return (
        <>
          <path d="M 72 122 Q 80 112 88 122" stroke={lash} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 112 122 Q 120 112 128 122" stroke={lash} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
  }
  };

  return (
    <>
      {renderEyes()}
      {showLashes && <Eyelashes emotion={emotion} character={character} />}
    </>
  );
}

function Eyelashes({ emotion, character }: { emotion: NpcEmotion; character: NpcId }) {
  const stroke = character === 'aki' ? '#2a1830' : '#1a1320';
  const bold = character === 'sora' || character === 'riko';
  const w = bold ? 2.2 : 1.8;
  if (emotion === 'smug') {
    return (
      <>
        <path d="M 72 118 Q 80 114 88 118" stroke={stroke} strokeWidth={w} fill="none" strokeLinecap="round" />
        <path d="M 112 118 Q 120 114 128 118" stroke={stroke} strokeWidth={w} fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <path d="M 70 108 Q 80 102 90 108" stroke={stroke} strokeWidth={w} fill="none" strokeLinecap="round" />
      <path d="M 110 108 Q 120 102 130 108" stroke={stroke} strokeWidth={w} fill="none" strokeLinecap="round" />
    </>
  );
}

function HairShine({
  style,
  character,
}: {
  style: NpcVisualTraits['hairStyle'];
  character: NpcId;
}) {
  const opacity = character === 'sora' ? 0.45 : 0.28;
  if (style === 'short-bob') {
    return (
      <path
        d="M 72 78 Q 98 62 128 82"
        stroke="#ffffff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity={opacity}
      />
    );
  }
  return (
    <path
      d="M 68 72 Q 100 48 138 76"
      stroke="#ffffff"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}

function Brows({ emotion, hairColor }: { emotion: NpcEmotion; hairColor: string }) {
  const stroke = shade(hairColor, -0.25);
  switch (emotion) {
    case 'idle':
      return (
        <>
          <path d="M 70 106 L 88 104" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M 112 104 L 130 106" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'thinking':
      return (
        <>
          <path d="M 70 106 L 88 100" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M 112 100 L 130 106" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'smug':
      return (
        <>
          <path d="M 70 102 L 88 106" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M 112 106 L 130 102" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'surprised':
      // Raised, arched.
      return (
        <>
          <path d="M 68 96 Q 78 92 90 98" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 110 98 Q 122 92 132 96" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case 'frustrated':
      // Furrowed inward.
      return (
        <>
          <path d="M 70 110 L 88 102" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 112 102 L 130 110" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 'triumphant':
      return (
        <>
          <path d="M 68 100 Q 78 96 90 102" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 110 102 Q 122 96 132 100" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

function Mouth({
  emotion,
  skinColor,
  character,
}: {
  emotion: NpcEmotion;
  skinColor: string;
  character: NpcId;
}) {
  const lip = character === 'aki' ? '#b84a62' : character === 'sora' ? '#d46a7a' : '#c45a6a';
  const inner = shade(skinColor, -0.4);
  const gloss = (
    <ellipse cx="97" cy="157" rx="3" ry="1.2" fill="#ffffff" opacity="0.35" />
  );

  switch (emotion) {
    case 'idle':
      return (
        <>
          <path d="M 90 158 Q 100 163 110 158" stroke={lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {gloss}
        </>
      );
    case 'thinking':
      return <path d="M 94 158 L 106 158" stroke={lip} strokeWidth="2" strokeLinecap="round" />;
    case 'smug':
      return (
        <>
          <path d="M 88 158 Q 100 151 112 162" stroke={lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle cx="113" cy="160" r="1.5" fill={lip} />
          {gloss}
        </>
      );
    case 'surprised':
      return (
        <>
          <ellipse cx="100" cy="160" rx="6" ry="8" fill={inner} stroke={lip} strokeWidth="1.5" />
        </>
      );
    case 'frustrated':
      return <path d="M 90 162 Q 100 156 110 162" stroke={lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
    case 'triumphant':
      return (
        <>
          <path d="M 86 156 Q 100 174 114 156" fill={inner} stroke={lip} strokeWidth="2" strokeLinejoin="round" />
          {gloss}
        </>
      );
  }
}

function BlushMarks({
  shape,
  color,
  emotion,
}: {
  shape: NpcVisualTraits['faceShape'];
  color: string;
  emotion: NpcEmotion;
}) {
  // Skip blush on neutral expressions; pop for emotional ones.
  const intensity = emotion === 'triumphant' || emotion === 'surprised'
    ? 0.55
    : emotion === 'smug' || emotion === 'frustrated'
      ? 0.3
      : 0.18;
  const offsetY = shape === 'angular' ? 142 : 138;
  return (
    <>
      <ellipse cx="74" cy={offsetY} rx="9" ry="4" fill={color} opacity={intensity} />
      <ellipse cx="126" cy={offsetY} rx="9" ry="4" fill={color} opacity={intensity} />
    </>
  );
}

function Accessory({ kind, character }: { kind: NpcVisualTraits['accessory']; character: NpcId }) {
  switch (kind) {
    case 'earrings':
      return (
        <>
          <circle cx="56" cy="138" r="3.5" fill="#f5b731" />
          <circle cx="144" cy="138" r="3.5" fill="#f5b731" />
          {character === 'riko' && (
            <>
              <circle cx="56" cy="142" r="1.5" fill="#ff8db1" />
              <circle cx="144" cy="142" r="1.5" fill="#ff8db1" />
            </>
          )}
        </>
      );
    case 'glasses':
      // Round-frame glasses sitting on the bridge.
      return (
        <g stroke="#1a1320" strokeWidth="2" fill="none">
          <circle cx="80" cy="120" r="14" />
          <circle cx="120" cy="120" r="14" />
          <line x1="94" y1="120" x2="106" y2="120" />
          <path d="M 66 118 L 60 116" />
          <path d="M 134 118 L 140 116" />
          {character === 'hana' && (
            <path d="M 72 112 Q 80 108 88 112" stroke="#45b7d1" strokeWidth="1.5" fill="none" />
          )}
        </g>
      );
    case 'choker':
      return (
        <>
          <path
            d="M 76 198 Q 100 206 124 198 L 124 204 Q 100 212 76 204 Z"
            fill="#1a1320"
            stroke={character === 'sora' ? '#e8384f' : '#f5b731'}
            strokeWidth="0.8"
          />
          {character === 'aki' && (
            <path d="M 88 200 Q 100 204 112 200" stroke="#8b2040" strokeWidth="1.2" fill="none" />
          )}
        </>
      );
  }
}

/* ─────────────────────────────────────────
   Color helper
   ───────────────────────────────────────── */

/** Lighten (positive) or darken (negative) a hex color by `amount` in [-1, 1]. */
function shade(hex: string, amount: number): string {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map(h => parseInt(h, 16));
  const adjust = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? 255 - c : c) * amount)));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

type NpcVisualTraits = import('@/content/npcs').NpcVisualTraits;
