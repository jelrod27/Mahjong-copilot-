'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, GamePhase } from '@/models/GameState';
import { TileType } from '@/models/Tile';
import { NpcEmotion, NpcId, NPCS, pickVoiceLine } from '@/content/npcs';
import { isTenpai } from '@/engine/winDetection';

/** Pick a bark line for an event; falls back to null when undefined. */
function pickBark(
  npcId: NpcId,
  event: 'claimedAgainst' | 'tenpai' | 'youDealIn',
): string | null {
  const lines = NPCS[npcId].barks?.[event];
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

interface UseNpcEmotionResult {
  emotion: NpcEmotion;
  /**
   * The voice line a reaction toast should show, or null if the character
   * isn't reacting to something fresh. Stays for ~3s after a transient
   * trigger (kong/claim, dealing in, win, hand loss) then clears.
   */
  voiceLine: string | null;
  /**
   * Increments every time a notable event fires (claim, win/loss). Use
   * this to drive animations that need to replay even when the emotion
   * string doesn't change.
   */
  eventNonce: number;
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

  // Monotonically-incrementing nonce so consumers can distinguish repeated
  // identical emotions (e.g. smug on back-to-back claims) and replay animations.
  const [eventNonce, setEventNonce] = useState(0);

  // Track meld count to detect new claims.
  const prevMeldCount = useRef(player.melds.length);
  // Track winner / loser to fire a reaction once on game end.
  const prevPhase = useRef(gameState.phase);
  // Track other players' EXPOSED melds to detect claims AGAINST this npc.
  // Concealed kongs add a meld without claiming anything — exclude them.
  const countOthersExposedMelds = (gs: GameState) => gs.players.reduce(
    (s, p, i) => (i === playerIndex ? s : s + p.melds.filter(m => !m.isConcealed).length), 0,
  );
  const prevOthersMelds = useRef(countOthersExposedMelds(gameState));
  // Track tenpai so the bark fires once on entry, not every render.
  const wasTenpai = useRef(false);

  useEffect(() => {
    const meldCount = player.melds.length;
    if (meldCount > prevMeldCount.current) {
      setEventNonce(n => n + 1);
      setTransient({
        emotion: 'smug',
        line: pickVoiceLine(npcId, 'smug'),
        until: Date.now() + REACTION_MS,
      });
    }
    prevMeldCount.current = meldCount;
  }, [player.melds.length, npcId]);

  // Bark: someone claimed THIS character's discard.
  const othersMelds = countOthersExposedMelds(gameState);
  useEffect(() => {
    if (
      othersMelds > prevOthersMelds.current &&
      gameState.lastDiscardedBy === player.id &&
      gameState.phase === GamePhase.PLAYING
    ) {
      const line = pickBark(npcId, 'claimedAgainst');
      if (line) {
        setEventNonce(n => n + 1);
        setTransient({ emotion: 'frustrated', line, until: Date.now() + REACTION_MS });
      }
    }
    prevOthersMelds.current = othersMelds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [othersMelds]);

  // Bark: this character just reached tenpai (their own hand is public TO
  // THEM — the bark is the tell, which is the fun).
  const handSig = player.hand.map(t => t.id).join(',');
  useEffect(() => {
    if (gameState.phase !== GamePhase.PLAYING) { wasTenpai.current = false; return; }
    // Only check on this npc's 13-tile (post-discard) hands to keep it cheap
    const nonBonus = player.hand.filter(t => t.type !== TileType.BONUS);
    const meldTileCount = player.melds.reduce((s, m) => s + Math.min(m.tiles.length, 3), 0);
    if (nonBonus.length + meldTileCount !== 13) return;
    const tenpaiNow = isTenpai(player.hand, player.melds);
    if (tenpaiNow && !wasTenpai.current) {
      const line = pickBark(npcId, 'tenpai');
      if (line) {
        setEventNonce(n => n + 1);
        setTransient({ emotion: 'smug', line, until: Date.now() + REACTION_MS });
      }
    }
    wasTenpai.current = tenpaiNow;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handSig]);

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
        // Dealing into this npc's win earns a pointed bark instead of the
        // generic triumph line.
        const humanDealtIn =
          emotion === 'triumphant' &&
          gameState.isSelfDrawn === false &&
          gameState.players.find(p => p.id === gameState.lastDiscardedBy && !p.isAI);
        const line = (humanDealtIn && pickBark(npcId, 'youDealIn')) || pickVoiceLine(npcId, emotion);
        setEventNonce(n => n + 1);
        setTransient({
          emotion,
          line,
          until: Date.now() + REACTION_MS * 2, // win/loss reactions linger longer
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSelfDrawn/players are stable once FINISHED; the phase transition is the trigger
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

  return { emotion: effectiveEmotion, voiceLine, eventNonce };
}
