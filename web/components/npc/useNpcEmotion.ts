'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, GamePhase } from '@/models/GameState';
import { NpcEmotion, NpcId, pickVoiceLine } from '@/content/npcs';

interface UseNpcEmotionResult {
  emotion: NpcEmotion;
  /**
   * The voice line a reaction toast should show, or null if the character
   * isn't reacting to something fresh. Stays for ~3s after a transient
   * trigger (kong/claim, dealing in, win, hand loss) then clears.
   */
  voiceLine: string | null;
}

/** How long transient reactions linger before snapping back to base. */
const REACTION_MS = 2800;

/**
 * Derive the right emotion for an opponent seat based on current game state.
 *
 * Two layers compose into the final emotion:
 *
 * - **Base emotion** — derived purely from game state. The current
 *   discard-turn AI shows "thinking"; everyone else shows "idle". On
 *   game end the winner shows "triumphant", the discarder who fed the
 *   winning tile shows "surprised", everyone else shows "frustrated".
 * - **Transient reactions** — overlay on top of base for ~3s. Fires when
 *   the player's meld count grows (they just claimed something) and shows
 *   "smug". Fires when the player wins as a separate triumphant pop.
 *
 * Voice line is returned alongside emotion so the seat can pop a reaction
 * toast bubble. Same pickVoiceLine helper used in tests, deterministic via
 * a custom rng prop if needed.
 */
export function useNpcEmotion(
  gameState: GameState,
  playerIndex: number,
  npcId: NpcId,
): UseNpcEmotionResult {
  const player = gameState.players[playerIndex];

  const baseEmotion: NpcEmotion = useMemo(() => {
    if (gameState.phase === GamePhase.FINISHED) {
      if (gameState.winnerId === player.id) return 'triumphant';
      if (
        gameState.winnerId &&
        gameState.lastDiscardedBy === player.id
      ) {
        return 'surprised';
      }
      if (gameState.winnerId) return 'frustrated';
      return 'idle'; // draw
    }
    if (
      gameState.currentPlayerIndex === playerIndex &&
      (gameState.turnPhase === 'discard' || gameState.turnPhase === 'draw')
    ) {
      return 'thinking';
    }
    return 'idle';
  }, [
    gameState.phase,
    gameState.winnerId,
    gameState.lastDiscardedBy,
    gameState.currentPlayerIndex,
    gameState.turnPhase,
    player.id,
    playerIndex,
  ]);

  // Transient reaction state — set when something pop-worthy happens, then
  // cleared by a timer.
  const [transient, setTransient] = useState<{
    emotion: NpcEmotion;
    line: string;
    until: number;
  } | null>(null);

  // Track meld count to detect new claims.
  const prevMeldCount = useRef(player.melds.length);
  // Track winner / loser to fire a reaction once on game end.
  const prevPhase = useRef(gameState.phase);

  useEffect(() => {
    const meldCount = player.melds.length;
    if (meldCount > prevMeldCount.current) {
      setTransient({
        emotion: 'smug',
        line: pickVoiceLine(npcId, 'smug'),
        until: Date.now() + REACTION_MS,
      });
    }
    prevMeldCount.current = meldCount;
  }, [player.melds.length, npcId]);

  useEffect(() => {
    if (gameState.phase === prevPhase.current) return;
    prevPhase.current = gameState.phase;

    if (gameState.phase === GamePhase.FINISHED) {
      let emotion: NpcEmotion = 'idle';
      if (gameState.winnerId === player.id) emotion = 'triumphant';
      else if (
        gameState.winnerId &&
        gameState.lastDiscardedBy === player.id
      ) emotion = 'surprised';
      else if (gameState.winnerId) emotion = 'frustrated';

      if (emotion !== 'idle') {
        setTransient({
          emotion,
          line: pickVoiceLine(npcId, emotion),
          until: Date.now() + REACTION_MS * 2, // win/loss reactions linger longer
        });
      }
    }
  }, [gameState.phase, gameState.winnerId, gameState.lastDiscardedBy, npcId, player.id]);

  // Clear expired transients.
  useEffect(() => {
    if (!transient) return;
    const remaining = transient.until - Date.now();
    if (remaining <= 0) {
      setTransient(null);
      return;
    }
    const t = setTimeout(() => setTransient(null), remaining);
    return () => clearTimeout(t);
  }, [transient]);

  const effectiveEmotion: NpcEmotion =
    transient && transient.until > Date.now() ? transient.emotion : baseEmotion;
  const voiceLine = transient && transient.until > Date.now() ? transient.line : null;

  return { emotion: effectiveEmotion, voiceLine };
}
