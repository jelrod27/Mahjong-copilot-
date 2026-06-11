'use client';

import { useEffect, useRef, useState } from 'react';
import { Flower2, ChevronRight } from 'lucide-react';
import { Player } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { useNpcEmotion } from '@/components/npc/useNpcEmotion';
import { NPCS, NpcId, NpcEmotion } from '@/content/npcs';

/** Emotions that warrant a one-shot wiggle animation when entered. */
const REACTIVE_EMOTIONS: ReadonlySet<NpcEmotion> = new Set([
  'smug',
  'surprised',
  'triumphant',
  'frustrated',
]);

interface OpponentSeatProps {
  player: Player;
  position: 'left' | 'top' | 'right';
  isCurrentTurn: boolean;
  /** Which NPC character backs this seat. Determines portrait + voice. */
  npcId: NpcId;
  gameState: GameState;
  playerIndex: number;
  /** Mobile compact mode: smaller portrait + single-line layout. */
  compact?: boolean;
}

const WIND_LABELS: Record<WindTile, string> = {
  [WindTile.EAST]: 'E',
  [WindTile.SOUTH]: 'S',
  [WindTile.WEST]: 'W',
  [WindTile.NORTH]: 'N',
};

/**
 * Opponent seat with NPC personality. Renders the character portrait, name,
 * a transient voice bubble when the character reacts to a game event, and
 * the existing face-down tile bar from OpponentHand below.
 */
export default function OpponentSeat({
  player,
  position,
  isCurrentTurn,
  npcId,
  gameState,
  playerIndex,
  compact = false,
}: OpponentSeatProps) {
  const npc = NPCS[npcId];
  const { emotion, voiceLine, eventNonce } = useNpcEmotion(gameState, playerIndex, npcId);
  const isVertical = position === 'left' || position === 'right';
  const tileCount = player.hand.length;

  // Replay a one-shot wiggle animation on every reactive event — using an
  // incrementing key forces React to remount the wrapper so the CSS animation
  // restarts cleanly. We key on both emotion changes and the event nonce so
  // back-to-back same-emotion events (e.g. two claims in a row) still wiggle.
  const [reactKey, setReactKey] = useState(0);
  const prevEmotionRef = useRef<NpcEmotion>(emotion);
  const prevNonceRef = useRef(eventNonce);
  useEffect(() => {
    if (
      REACTIVE_EMOTIONS.has(emotion) &&
      (emotion !== prevEmotionRef.current || eventNonce !== prevNonceRef.current)
    ) {
      setReactKey(k => k + 1);
    }
    prevEmotionRef.current = emotion;
    prevNonceRef.current = eventNonce;
  }, [emotion, eventNonce]);

  const haloClass = isCurrentTurn ? 'animate-ai-thinking-halo' : '';
  // An opponent with 3+ exposed melds is one or two tiles from a win — make
  // the table feel it.
  const isDangerous = player.melds.length >= 3;
  const dangerRing = isDangerous ? 'ring-2 ring-destructive/50 shadow-[0_0_16px_rgba(199,91,74,0.4)]' : '';

  // Compact mobile layout: tiny portrait + single-line stats.
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-300 ${
          isCurrentTurn ? 'ring-1 ring-highlight/60 bg-highlight/5' : dangerRing
        }`}
        data-testid={`opponent-seat-${npcId}`}
        data-seat-anchor={player.id}
      >
        <div className={`shrink-0 relative ${haloClass}`} data-testid={`portrait-wrapper-${npcId}`}>
          <div key={reactKey} className="animate-portrait-react">
            <CharacterPortrait character={npcId} emotion={emotion} size="sm" />
          </div>
          {voiceLine && <CompactBubble line={voiceLine} />}
        </div>
        <div className="flex flex-col min-w-0">
          <div
            className={`flex items-center gap-1 font-display text-[8px] ${
              isCurrentTurn ? 'text-info ds-text-glow' : 'text-muted-foreground'
            }`}
          >
            <span className="text-highlight">{WIND_LABELS[player.seatWind]}</span>
            <span className="truncate max-w-[64px]">{npc.name}</span>
            {isCurrentTurn && <ChevronRight className="h-3 w-3 shrink-0 animate-blink text-info" aria-hidden />}
          </div>
          <div className="font-sans text-[10px] text-muted-foreground">
            {tileCount} tiles
            {player.melds.length > 0 && ` · ${player.melds.length}m`}
            {player.flowers.length > 0 && (
              <>
                {' · '}
                <Flower2 className="inline h-3 w-3 align-text-bottom text-highlight" aria-hidden />
                {player.flowers.length}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const placeholders = Array.from({ length: tileCount }, (_, i) => (
    <RetroTile
      key={`back-${i}`}
      tile={
        player.hand[i] ?? {
          id: `ph-${i}`,
          suit: 'dot' as Player['hand'][number]['suit'],
          type: 'suit' as Player['hand'][number]['type'],
          nameEnglish: '',
          nameChinese: '',
          nameJapanese: '',
          assetPath: '',
        }
      }
      size="sm"
      showBack
    />
  ));

  return (
    <div
      className={`flex flex-col items-center gap-1 ${
        isVertical ? 'justify-center' : ''
      } rounded-lg p-1 transition-all duration-300 ${
        isCurrentTurn
          ? 'ring-2 ring-highlight/60 shadow-[0_0_18px_rgba(245,183,49,0.35)]'
          : dangerRing
      }`}
      data-testid={`opponent-seat-${npcId}`}
      data-seat-anchor={player.id}
    >
      {/* Portrait + voice bubble */}
      <div
        className={`relative ${haloClass}`}
        data-testid={`portrait-wrapper-${npcId}`}
      >
        <div key={reactKey} className="animate-portrait-react">
          <CharacterPortrait character={npcId} emotion={emotion} size="md" />
        </div>
        {voiceLine && (
          <SpeechBubble line={voiceLine} side={position === 'right' ? 'left' : 'right'} />
        )}
      </div>

      {/* Name + wind */}
      <div
        className={`flex items-center gap-1 text-xs font-display ${
          isCurrentTurn ? 'text-info ds-text-glow' : 'text-muted-foreground'
        }`}
      >
        <span className="text-highlight">{WIND_LABELS[player.seatWind]}</span>
        <span>{npc.name}</span>
        {isCurrentTurn && <ChevronRight className="h-3 w-3 shrink-0 animate-blink text-info" aria-hidden />}
      </div>

      {/* Face-down tiles */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-px`}>
        {placeholders}
      </div>

      {/* Exposed melds */}
      {player.melds.length > 0 && <ExposedMelds melds={player.melds} size="sm" anchorId={player.id} />}

      {/* Flowers */}
      {player.flowers.length > 0 && (
        <div className="flex items-center justify-center gap-1 font-sans text-xs text-highlight">
          <Flower2 className="h-3.5 w-3.5" aria-hidden />
          <span>×{player.flowers.length}</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Speech bubbles
   ───────────────────────────────────────── */

function SpeechBubble({ line, side }: { line: string; side: 'left' | 'right' }) {
  return (
    <div
      className={`absolute top-2 ${
        side === 'right' ? 'left-full ml-2' : 'right-full mr-2'
      } z-20 max-w-[180px] animate-bubble-pop pointer-events-none`}
      role="status"
      aria-live="polite"
    >
      <div className="relative bg-background border-2 border-info/60 rounded-lg px-3 py-1.5 shadow-[0_0_12px_rgba(69,183,209,0.3)]">
        <span className="font-sans text-xs text-foreground leading-snug">{line}</span>
        <div
          className={`absolute top-3 ${
            side === 'right' ? '-left-1.5' : '-right-1.5'
          } w-3 h-3 bg-background border-l-2 border-b-2 border-info/60 ${
            side === 'right' ? 'rotate-45' : '-rotate-[135deg]'
          }`}
        />
      </div>
    </div>
  );
}

function CompactBubble({ line }: { line: string }) {
  return (
    <div
      className="absolute -top-1 left-full ml-1 z-20 max-w-[120px] animate-bubble-pop pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="bg-background border border-info/60 rounded px-1.5 py-0.5 shadow-[0_0_8px_rgba(69,183,209,0.3)]">
        <span className="font-sans text-[9px] text-foreground leading-tight">{line}</span>
      </div>
    </div>
  );
}
