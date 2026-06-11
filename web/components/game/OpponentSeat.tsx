'use client';

import { useEffect, useRef, useState } from 'react';
import { Flower2, ChevronRight } from 'lucide-react';
import { Player } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import { GameState } from '@/models/GameState';
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
  /** Cumulative match score shown on the desktop plaque. */
  score?: number;
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
  score,
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

  // Desktop: a compact rim plaque — portrait, identity, concealed-tile pips,
  // melds, and score on one card. The old 13-tile face-down strips are gone:
  // they overflowed the table column and carried no information a count
  // doesn't. The plaque is the seat anchor for tile flights.
  const pipCount = Math.min(tileCount, 4);

  return (
    <div
      className={`seat-plaque flex items-center gap-2.5 transition-all duration-300 ${
        isCurrentTurn
          ? 'ring-2 ring-highlight/60 shadow-[0_0_18px_rgba(245,183,49,0.35)]'
          : dangerRing
      }`}
      data-testid={`opponent-seat-${npcId}`}
      data-seat-anchor={player.id}
    >
      {/* Portrait + voice bubble */}
      <div
        className={`seat-plaque-portrait relative shrink-0 ${haloClass}`}
        data-testid={`portrait-wrapper-${npcId}`}
      >
        <div key={reactKey} className="animate-portrait-react">
          <CharacterPortrait character={npcId} emotion={emotion} size="sm" framing="face" />
        </div>
        {voiceLine && (
          <SpeechBubble line={voiceLine} side={position === 'right' ? 'left' : 'right'} />
        )}
      </div>

      <div className="min-w-0">
        {/* Name + wind + turn cue */}
        <div
          className={`flex items-center gap-1 font-display text-xs ${
            isCurrentTurn ? 'text-info ds-text-glow' : 'text-foreground'
          }`}
        >
          <span className="text-highlight">{WIND_LABELS[player.seatWind]}</span>
          <span className="truncate">{npc.name}</span>
          {isCurrentTurn && <ChevronRight className="h-3 w-3 shrink-0 animate-blink text-info" aria-hidden />}
        </div>

        {/* Concealed count as pips + flowers + score */}
        <div className="mt-1 flex items-center gap-2 font-sans text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1" aria-label={`${tileCount} concealed tiles`}>
            <span className="flex gap-px" aria-hidden>
              {Array.from({ length: pipCount }, (_, i) => (
                <span key={i} className="seat-plaque-pip" />
              ))}
            </span>
            {tileCount}
          </span>
          {player.flowers.length > 0 && (
            <span className="flex items-center gap-0.5 text-highlight">
              <Flower2 className="h-3 w-3" aria-hidden />
              {player.flowers.length}
            </span>
          )}
          {typeof score === 'number' && (
            <span className="font-display tabular-nums text-info">{score}</span>
          )}
        </div>

        {/* Exposed melds stay visible — they are public information */}
        {player.melds.length > 0 && (
          <div className="mt-1">
            <ExposedMelds melds={player.melds} size="xs" anchorId={player.id} />
          </div>
        )}
      </div>
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
