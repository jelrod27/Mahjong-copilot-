'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Rewind, Play, FastForward } from 'lucide-react';
import { GameState, GameTurn, PlayerAction } from '@/models/GameState';
import RetroTile from './RetroTile';

interface HandReplayScrubberProps {
  gameState: GameState;
}

/**
 * Post-hand timeline scrubber: walk through every turn of a completed hand
 * in order. This is a reviewer's view — it doesn't re-run the engine to
 * reconstruct intermediate tile layouts (which would require snapshotting
 * the initial wall), but it surfaces the *decision* at every turn so a
 * learner can replay their own reasoning. Pairs with the review insights
 * below it for "this is where you should have done X" context.
 */
export default function HandReplayScrubber({ gameState }: HandReplayScrubberProps) {
  const turns = useMemo(() => filterMeaningfulTurns(gameState.turnHistory), [gameState.turnHistory]);
  const [expanded, setExpanded] = useState(false);
  const [cursor, setCursor] = useState(turns.length > 0 ? turns.length - 1 : 0);

  if (turns.length === 0) return null;

  const cursorSafe = Math.min(cursor, turns.length - 1);
  const activeTurn = turns[cursorSafe];

  const step = (delta: number) => {
    setCursor(c => Math.max(0, Math.min(turns.length - 1, c + delta)));
  };

  const playerName = (playerId: string) =>
    gameState.players.find(p => p.id === playerId)?.name ?? playerId;

  return (
    <div className="mb-4" data-testid="hand-replay-scrubber">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-1 py-0.5 mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/50 rounded-sm"
        aria-expanded={expanded}
        aria-controls="hand-replay-body"
      >
        <span className="font-pixel text-xs text-retro-cyan tracking-widest">REPLAY</span>
        <span className="flex items-center gap-2 text-[11px] font-retro text-retro-textDim">
          <span>{turns.length} turns</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div id="hand-replay-body" className="space-y-2">
          {/* Active turn callout */}
          <div className="retro-panel p-2 flex items-center gap-3">
            <div className="w-10 shrink-0 text-center">
              <div className="font-pixel text-[8px] text-retro-gold tracking-widest uppercase">Turn</div>
              <div className="font-retro text-sm text-retro-text">{activeTurn.turnNumber}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-retro text-xs text-retro-cyan truncate">
                {playerName(activeTurn.playerId)}
              </div>
              <div className="font-retro text-[11px] text-retro-textDim leading-snug">
                {describeAction(activeTurn)}
              </div>
            </div>
            {activeTurn.tile && (
              <div className="shrink-0">
                <RetroTile tile={activeTurn.tile} size="sm" />
              </div>
            )}
          </div>

          {/* Scrubber controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursor(0)}
              disabled={cursorSafe === 0}
              aria-label="Jump to first turn"
              className="retro-btn font-pixel text-[8px] px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Rewind size={12} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={cursorSafe === 0}
              aria-label="Previous turn"
              className="retro-btn font-pixel text-[8px] px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ◀
            </button>
            <input
              type="range"
              min={0}
              max={turns.length - 1}
              value={cursorSafe}
              onChange={e => setCursor(Number(e.target.value))}
              aria-label="Replay turn scrubber"
              className="flex-1 accent-retro-cyan"
            />
            <button
              type="button"
              onClick={() => step(1)}
              disabled={cursorSafe >= turns.length - 1}
              aria-label="Next turn"
              className="retro-btn font-pixel text-[8px] px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setCursor(turns.length - 1)}
              disabled={cursorSafe >= turns.length - 1}
              aria-label="Jump to final turn"
              className="retro-btn font-pixel text-[8px] px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FastForward size={12} aria-hidden />
            </button>
          </div>

          {/* Compact full timeline — click any row to jump */}
          <ol className="max-h-36 overflow-y-auto border border-retro-border/20 rounded-sm divide-y divide-retro-border/20">
            {turns.map((turn, i) => (
              <li key={`${turn.turnNumber}-${i}`}>
                <button
                  type="button"
                  onClick={() => setCursor(i)}
                  aria-current={i === cursorSafe ? 'true' : undefined}
                  className={`w-full flex items-center gap-2 px-2 py-1 text-left text-[11px] font-retro hover:bg-retro-bg/60 ${
                    i === cursorSafe ? 'bg-retro-cyan/10 text-retro-cyan' : 'text-retro-text'
                  }`}
                >
                  <span className="w-6 text-right text-retro-textDim tabular-nums">{turn.turnNumber}</span>
                  <span className="w-16 truncate text-retro-textDim">{playerName(turn.playerId)}</span>
                  <span className="flex-1 truncate">{describeAction(turn)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * Drop the initial deal-draws that clutter the timeline. Every player draws
 * 13 tiles at hand start, which adds 50+ noise turns. Keep only player-
 * intentional actions after deal.
 */
function filterMeaningfulTurns(history: GameTurn[]): GameTurn[] {
  const firstDiscardIdx = history.findIndex(t => t.action === PlayerAction.DISCARD);
  if (firstDiscardIdx < 0) return history;
  // Retain the dealer's first draw so the sequence reads naturally, but skip
  // the 52 pre-deal draws.
  return history.slice(Math.max(0, firstDiscardIdx - 1));
}

function describeAction(turn: GameTurn): string {
  const tileName = turn.tile?.nameEnglish ?? '';
  switch (turn.action) {
    case PlayerAction.DRAW:
      return `drew${tileName ? ` ${tileName}` : ''}`;
    case PlayerAction.DISCARD:
      return `discarded ${tileName}`;
    case PlayerAction.CHOW:
      return `claimed chow with ${tileName}`;
    case PlayerAction.PUNG:
      return `claimed pung with ${tileName}`;
    case PlayerAction.KONG:
      return `declared kong with ${tileName}`;
    case PlayerAction.WIN:
      return `won with ${tileName}`;
    case PlayerAction.PASS:
      return 'passed';
    default:
      return (turn.action as string) ?? 'unknown action';
  }
}
