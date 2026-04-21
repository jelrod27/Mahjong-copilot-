'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { GameState } from '@/models/GameState';
import { Tile, TileSuit, TileType, tileKey } from '@/models/Tile';
import RetroTile from './RetroTile';

interface DiscardReadingPanelProps {
  game: GameState;
  humanPlayerId: string;
  /** Compact single-bar mode (mobile) */
  compact?: boolean;
}

interface OpponentReading {
  playerId: string;
  name: string;
  /** Tiles they've discarded, grouped and sorted by suit then number */
  bySuit: Record<string, Tile[]>;
  /** Total discards */
  total: number;
  /** Suits they have never discarded — learner signal that they may be collecting those */
  quietSuits: TileSuit[];
  /** True if they've shed most honors (not collecting winds/dragons) */
  shedsHonors: boolean;
}

const SUIT_LABEL: Record<string, string> = {
  [TileSuit.BAMBOO]: 'Bamboo',
  [TileSuit.CHARACTER]: 'Character',
  [TileSuit.DOT]: 'Dot',
  honor: 'Honors',
};

const MAIN_SUITS: TileSuit[] = [TileSuit.BAMBOO, TileSuit.CHARACTER, TileSuit.DOT];

export default function DiscardReadingPanel({ game, humanPlayerId, compact = false }: DiscardReadingPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const readings = buildReadings(game, humanPlayerId);
  const insight = summariseInsight(readings);

  const header = (
    <button
      type="button"
      onClick={() => setExpanded(v => !v)}
      className="w-full flex items-center justify-between gap-2 px-2 py-1 hover:bg-retro-bg/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-retro-cyan/50 rounded-sm"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse discard reading' : 'Expand discard reading'}
    >
      <span className="flex items-center gap-1 font-pixel text-[8px] md:text-[10px] text-retro-cyan tracking-widest uppercase">
        <Eye size={12} className="text-retro-cyan" aria-hidden />
        Reading
      </span>
      <span className="flex items-center gap-2 font-retro text-[11px] text-retro-textDim">
        <span className="truncate max-w-[140px]">{insight.summary}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </span>
    </button>
  );

  if (compact && !expanded) {
    return <div className="retro-panel" data-testid="discard-reading-panel">{header}</div>;
  }

  return (
    <div className="retro-panel" data-testid="discard-reading-panel">
      {header}

      {expanded && (
        <div className="px-2 pb-2 border-t border-retro-border/20 pt-2 space-y-2">
          {/* Global insights */}
          {insight.notes.length > 0 && (
            <ul className="space-y-0.5 text-[10px] text-retro-gold font-retro italic">
              {insight.notes.map((note, i) => (
                <li key={`note-${i}`} className="leading-snug">• {note}</li>
              ))}
            </ul>
          )}

          {/* Per-opponent breakdown */}
          <div className="space-y-2">
            {readings.length === 0 && (
              <p className="text-[10px] text-retro-textDim font-retro italic">
                No discards yet — the table hasn&apos;t revealed itself.
              </p>
            )}
            {readings.map(r => (
              <section key={r.playerId}>
                <header className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="font-retro text-retro-text">{r.name}</span>
                  <span className="text-retro-textDim">{r.total} discards</span>
                </header>
                <div className="space-y-1">
                  {[...MAIN_SUITS, 'honor' as const].map(group => {
                    const key = group === 'honor' ? 'honor' : (group as TileSuit);
                    const tiles = r.bySuit[key] ?? [];
                    if (tiles.length === 0) return null;
                    return (
                      <div key={key} className="flex items-start gap-1">
                        <span className="font-pixel text-[7px] text-retro-textDim uppercase tracking-widest w-10 shrink-0 pt-0.5">
                          {SUIT_LABEL[key]}
                        </span>
                        <div className="flex flex-wrap gap-px">
                          {tiles.map(t => (
                            <RetroTile key={t.id} tile={t} size="sm" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {r.quietSuits.length > 0 && (
                    <p className="text-[10px] text-retro-accent font-retro italic">
                      Has not discarded {r.quietSuits.map(s => SUIT_LABEL[s].toLowerCase()).join(' or ')} —
                      watch for a flush.
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildReadings(game: GameState, humanPlayerId: string): OpponentReading[] {
  const readings: OpponentReading[] = [];

  for (const player of game.players) {
    if (player.id === humanPlayerId) continue;
    const discards = game.playerDiscards[player.id] ?? [];
    if (discards.length === 0) continue;

    const bySuit: Record<string, Tile[]> = {};
    for (const tile of discards) {
      const key = tile.type === TileType.HONOR ? 'honor' : tile.suit;
      const arr = bySuit[key] ?? [];
      arr.push(tile);
      bySuit[key] = arr;
    }

    // Sort each group for readable presentation (number-suits by number, honors by canonical key)
    for (const key of Object.keys(bySuit)) {
      bySuit[key].sort((a, b) => {
        if (a.number !== undefined && b.number !== undefined) return a.number - b.number;
        return tileKey(a).localeCompare(tileKey(b));
      });
    }

    // A "quiet suit" = a suit they've never discarded, given they've discarded enough
    // total tiles for the signal to be meaningful (>= 6 total).
    const quietSuits: TileSuit[] = [];
    if (discards.length >= 6) {
      for (const suit of MAIN_SUITS) {
        if ((bySuit[suit]?.length ?? 0) === 0) quietSuits.push(suit);
      }
    }

    const honorCount = bySuit.honor?.length ?? 0;
    const shedsHonors = discards.length >= 6 && honorCount / discards.length >= 0.4;

    readings.push({
      playerId: player.id,
      name: player.name,
      bySuit,
      total: discards.length,
      quietSuits,
      shedsHonors,
    });
  }

  return readings;
}

function summariseInsight(readings: OpponentReading[]): { summary: string; notes: string[] } {
  if (readings.length === 0) {
    return { summary: 'Nothing yet', notes: [] };
  }

  const notes: string[] = [];
  for (const r of readings) {
    if (r.quietSuits.length >= 2) {
      notes.push(`${r.name} may be collecting ${r.quietSuits.map(s => SUIT_LABEL[s].toLowerCase()).join(' & ')} (flush risk).`);
    }
  }

  const totalAll = readings.reduce((s, r) => s + r.total, 0);
  const summary = `${readings.length} read, ${totalAll} tiles`;

  return { summary, notes };
}
