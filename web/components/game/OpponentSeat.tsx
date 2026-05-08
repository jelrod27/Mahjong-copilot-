'use client';

import { Player } from '@/models/GameState';
import { WindTile } from '@/models/Tile';
import { GameState } from '@/models/GameState';
import RetroTile from './RetroTile';
import ExposedMelds from './ExposedMelds';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { useNpcEmotion } from '@/components/npc/useNpcEmotion';
import { NPCS, NpcId } from '@/content/npcs';

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
  const { emotion, voiceLine } = useNpcEmotion(gameState, playerIndex, npcId);
  const isVertical = position === 'left' || position === 'right';
  const tileCount = player.hand.length;

  // Compact mobile layout: tiny portrait + single-line stats.
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-300 ${
          isCurrentTurn ? 'ring-1 ring-retro-gold/60 bg-retro-gold/5' : ''
        }`}
        data-testid={`opponent-seat-${npcId}`}
      >
        <div className="shrink-0 relative">
          <CharacterPortrait character={npcId} emotion={emotion} size="sm" />
          {voiceLine && <CompactBubble line={voiceLine} />}
        </div>
        <div className="flex flex-col min-w-0">
          <div
            className={`flex items-center gap-1 font-pixel text-[8px] ${
              isCurrentTurn ? 'text-retro-cyan retro-glow' : 'text-retro-textDim'
            }`}
          >
            <span className="text-retro-gold">{WIND_LABELS[player.seatWind]}</span>
            <span className="truncate max-w-[64px]">{npc.name}</span>
            {isCurrentTurn && <span className="animate-blink">▸</span>}
          </div>
          <div className="font-retro text-[10px] text-retro-textDim">
            {tileCount} tiles
            {player.melds.length > 0 && ` · ${player.melds.length}m`}
            {player.flowers.length > 0 && ` · 🌸${player.flowers.length}`}
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
          ? 'ring-2 ring-retro-gold/60 shadow-[0_0_18px_rgba(245,183,49,0.35)]'
          : ''
      }`}
      data-testid={`opponent-seat-${npcId}`}
    >
      {/* Portrait + voice bubble */}
      <div className="relative">
        <CharacterPortrait character={npcId} emotion={emotion} size="md" />
        {voiceLine && (
          <SpeechBubble line={voiceLine} side={position === 'right' ? 'left' : 'right'} />
        )}
      </div>

      {/* Name + wind */}
      <div
        className={`flex items-center gap-1 text-xs font-pixel ${
          isCurrentTurn ? 'text-retro-cyan retro-glow' : 'text-retro-textDim'
        }`}
      >
        <span className="text-retro-gold">{WIND_LABELS[player.seatWind]}</span>
        <span>{npc.name}</span>
        {isCurrentTurn && <span className="animate-blink">▸</span>}
      </div>

      {/* Face-down tiles */}
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-px`}>
        {placeholders}
      </div>

      {/* Exposed melds */}
      {player.melds.length > 0 && <ExposedMelds melds={player.melds} size="sm" />}

      {/* Flowers */}
      {player.flowers.length > 0 && (
        <div className="text-xs text-retro-gold font-retro">🌸 ×{player.flowers.length}</div>
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
      <div className="relative bg-retro-bg border-2 border-retro-cyan/60 rounded-lg px-3 py-1.5 shadow-[0_0_12px_rgba(69,183,209,0.3)]">
        <span className="font-retro text-xs text-retro-text leading-snug">{line}</span>
        <div
          className={`absolute top-3 ${
            side === 'right' ? '-left-1.5' : '-right-1.5'
          } w-3 h-3 bg-retro-bg border-l-2 border-b-2 border-retro-cyan/60 ${
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
      <div className="bg-retro-bg border border-retro-cyan/60 rounded px-1.5 py-0.5 shadow-[0_0_8px_rgba(69,183,209,0.3)]">
        <span className="font-retro text-[9px] text-retro-text leading-tight">{line}</span>
      </div>
    </div>
  );
}
