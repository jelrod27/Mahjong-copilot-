'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AllLevels } from '@/content';
import { MahjongTile } from '@/components/MahjongTile';
import RetroTile from '@/components/game/RetroTile';
import { getAllTiles, TileFactory, TileSuit, WindTile, type Tile } from '@/models/Tile';
import useCompletedLessons from '@/hooks/useCompletedLessons';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getParlourProgress } from '@/lib/parlour';
import { getDailyState, gamStreakLine, DailyState } from '@/lib/dailyHand';
import { getCurrentRank, consumeRankUp, PlayerRank } from '@/lib/ranks';
import { hasSavedGame } from '@/lib/matchStorage';
import { loadStats } from '@/lib/gameStats';
import soundManager from '@/lib/soundManager';
import { Lightbulb, GraduationCap } from 'lucide-react';

/**
 * A real 8-tile hand for the hero, sourced from TileFactory so these are
 * genuine Tile objects rather than a hand-authored fixture. Deterministic
 * (no randomness, no localStorage), so it's safe to build once at module
 * scope without the post-mount hydration guard the rest of this file needs.
 */
const HERO_HAND: Tile[] = (() => {
  const all = TileFactory.getAllTiles();
  const suitTile = (suit: TileSuit, number: number, skip = 0): Tile => {
    let seen = 0;
    for (const t of all) {
      if (t.suit === suit && t.number === number) {
        if (seen === skip) return t;
        seen++;
      }
    }
    throw new Error(`hero hand tile not found: ${suit} ${number}`);
  };
  const east = all.find(t => t.wind === WindTile.EAST)!;
  return [
    suitTile(TileSuit.DOT, 4),
    suitTile(TileSuit.DOT, 5),
    suitTile(TileSuit.DOT, 6),
    suitTile(TileSuit.BAMBOO, 7),
    suitTile(TileSuit.BAMBOO, 8),
    suitTile(TileSuit.CHARACTER, 3, 0),
    suitTile(TileSuit.CHARACTER, 3, 1),
    east,
  ];
})();

export default function HomePage() {
  const { completedLessons } = useCompletedLessons();
  const [randomTile, setRandomTile] = useState<ReturnType<typeof getAllTiles>[0] | null>(null);
  const [rank, setRank] = useState<PlayerRank | null>(null);
  const [rankUp, setRankUp] = useState<PlayerRank | null>(null);
  const [floorsLit, setFloorsLit] = useState(0);
  const [daily, setDaily] = useState<DailyState | null>(null);
  // Post-mount hydration guard: these read localStorage, so they must start
  // at a value that matches the server render (no saved game, no games
  // played yet) and only update once mounted on the client.
  const [hasSaved, setHasSaved] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  useEffect(() => {
    const tiles = getAllTiles();
    setRandomTile(tiles[Math.floor(Math.random() * tiles.length)]);
    setRank(getCurrentRank());
    setFloorsLit(getParlourProgress().highestCleared);
    setDaily(getDailyState());
    setHasSaved(hasSavedGame());
    setGamesPlayed(loadStats().gamesPlayed);
    const up = consumeRankUp();
    if (up) {
      setRankUp(up);
      soundManager.play('win');
    }
  }, []);

  const totalLessons = AllLevels.reduce((sum, level) => sum + level.lessons.length, 0);
  const lessonsDone = completedLessons.length;
  const learnProgress = totalLessons > 0 ? (lessonsDone / totalLessons) * 100 : 0;

  const gamLine = floorsLit === 0
    ? 'The Parlour only sleeps. Wake it up.'
    : floorsLit >= 9
      ? 'Told you. It only sleeps.'
      : `Floor ${floorsLit} is lit. Keep climbing, kid.`;

  const tileDescription = randomTile?.number
    ? `${randomTile.suit} suit, number ${randomTile.number}`
    : randomTile?.wind
      ? `${randomTile.wind} wind tile`
      : randomTile?.dragon
        ? `${randomTile.dragon} dragon`
        : 'Bonus tile';

  const primaryCtaLabel = hasSaved
    ? 'Resume your match'
    : gamesPlayed === 0 && lessonsDone === 0
      ? 'Play your first hand'
      : 'Play a hand';
  const primaryCtaHref = hasSaved ? '/play/game' : '/play';

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Rank-up ceremony — a transient celebration, so it sits above even the hero */}
      {rankUp && (
        <div className="ds-card-elevated border-highlight/50 p-4 text-center" role="status">
          <p className="font-display text-2xs tracking-[0.3em] text-highlight">RANK UP</p>
          <p className="mt-1 font-display text-lg text-highlight ds-text-glow-strong animate-score-punch">
            {rankUp.name}
          </p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">{rankUp.flavor}</p>
        </div>
      )}

      {/* Hero: the felt. Reuses the board's own texture, vignette and wood
          rail (.game-table-felt + .felt-bamboo-mat) so the landing page and
          the game itself read as one product. Text sits on the same
          translucent-black scrim the board uses for its own HUD surfaces
          (see .game-hud-surface) so cream text clears WCAG contrast against
          the warm felt underneath it. */}
      <section className="game-table-felt felt-bamboo-mat relative overflow-hidden rounded-lg p-3 sm:p-6 md:p-10">
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="w-full rounded-lg bg-black/40 px-5 py-6 text-center backdrop-blur-sm sm:px-8 sm:py-8">
            <p className="font-display text-caption uppercase tracking-[0.25em] text-highlight">
              Hong Kong rules · 4 players
            </p>
            <h1 className="mt-3 font-display text-title-lg text-foreground md:text-display">
              Real table mahjong. Not the tile-matching one.
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-sans text-body-lg text-foreground">
              Learn Hong Kong mahjong properly, then play a full hand against three AI
              opponents — with <span className="font-semibold text-highlight">coach hints while you play</span> and
              a review of every decision after.
            </p>
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            style={{ '--tile-base-w': 'clamp(30px, 8vw, 44px)' } as React.CSSProperties}
          >
            {HERO_HAND.map(tile => (
              <RetroTile key={tile.id} tile={tile} size="md" />
            ))}
          </div>

          <div className="flex w-full flex-col items-center gap-3 rounded-lg bg-black/40 px-5 py-5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={primaryCtaHref}
                data-testid="home-primary-cta"
                className="ds-btn-accent min-h-[48px] px-8 py-3 font-display text-sm font-bold tracking-wide md:text-base"
              >
                {primaryCtaLabel}
              </Link>
              <Link
                href="/learn"
                className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-foreground/60 px-6 py-3 font-display text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
              >
                Start from the basics
              </Link>
            </div>
            <p className="text-center font-sans text-caption text-foreground">
              No account. Nothing to install. Your progress stays on this device.
            </p>
          </div>
        </div>
      </section>

      {/* Three pillars — what the product actually does */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="font-display text-2xs tracking-widest text-info">WHILE YOU PLAY</p>
          <p className="mt-1 font-sans text-sm font-medium text-foreground">Coach hints</p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            Every tile marked keep, neutral or safe to discard — with the reason.
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-display text-2xs tracking-widest text-info">AFTER THE HAND</p>
          <p className="mt-1 font-sans text-sm font-medium text-foreground">Hand review</p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            What you played well, and the discard that cost you.
          </p>
        </Card>
        <Link href="/parlour" className="block">
          <Card className="h-full p-5 transition-all hover:scale-[1.01]">
            <p className="font-display text-2xs tracking-widest text-info">WHEN YOU&apos;RE READY</p>
            <p className="mt-1 font-sans text-sm font-medium text-foreground">The Jade Parlour</p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Nine floors, nine rivals, each one teaching a different skill.
            </p>
          </Card>
        </Link>
      </div>

      {/* The Parlour: ongoing progress. Also carries the rank pill — demoted
          out of the hero, but kept visible here rather than dropped. */}
      <Link href="/parlour" className="block group">
        <Card className="border-l-4 border-l-highlight p-5 transition-all hover:scale-[1.01]">
          <div className="flex items-center gap-4">
            <CharacterPortrait character="gam" emotion="idle" size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-sans text-sm font-medium text-highlight">The Jade Parlour</p>
                <div className="flex shrink-0 items-center gap-2">
                  {rank && (
                    <span className="font-display text-2xs tracking-widest text-info">{rank.name.toUpperCase()}</span>
                  )}
                  <span className="font-display text-xs text-muted-foreground">{floorsLit}/9 lit</span>
                </div>
              </div>
              <p className="mt-1 truncate font-sans text-sm text-foreground">{gamLine}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-highlight transition-all duration-slow ease-ds-out"
                  style={{ width: `${(floorsLit / 9) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </Link>

      {/* Daily Hand: the appointment */}
      {daily && (
        <Link href={daily.playedToday ? '/progress' : '/play/game?daily=1'} className="block group">
          <Card className={`border-l-4 p-5 transition-all hover:scale-[1.01] ${
            daily.playedToday ? 'border-l-success' : 'border-l-info'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-sans text-sm font-medium text-info">Daily Hand</p>
                  {daily.streak > 0 && (
                    <Badge variant="secondary" className="bg-highlight/10 border-highlight/30 text-highlight text-2xs font-display h-5">
                      {daily.streak} DAY STREAK
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate font-sans text-sm text-foreground">
                  {daily.playedToday && daily.todayResult
                    ? daily.todayResult.outcome === 'win'
                      ? `Today: won with ${daily.todayResult.fan} faan`
                      : daily.todayResult.outcome === 'draw'
                        ? 'Today: a draw — the wall ran dry'
                        : 'Today: the table took this one'
                    : 'One seeded hand. Same deal as every player in the world.'}
                </p>
                <p className="mt-0.5 truncate font-sans text-xs text-muted-foreground">
                  {gamStreakLine(daily)}
                </p>
              </div>
              <span className={`shrink-0 font-display text-2xs ${daily.playedToday ? 'text-success' : 'text-info'}`}>
                {daily.playedToday ? 'DONE' : 'PLAY'}
              </span>
            </div>
          </Card>
        </Link>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-display text-2xs text-info uppercase tracking-[0.3em] ml-1">
            KEEP LEARNING
          </h2>

          <Link href="/learn" className="block group">
            <Card className="border-l-4 border-l-info hover:border-info/60 transition-all hover:scale-[1.01] p-5">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-sm bg-info/10 border-2 border-info/40 flex items-center justify-center shrink-0 group-hover:bg-info/20 transition-colors">
                  <GraduationCap size={24} className="text-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-sans text-sm font-medium text-highlight">
                      Lessons
                    </span>
                    {lessonsDone === 0 && (
                      <Badge variant="cyan" className="text-2xs font-display tracking-tighter h-5">
                        START HERE
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-medium text-foreground font-sans">
                    {lessonsDone}/{totalLessons} lessons across {AllLevels.length} levels
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-info transition-all duration-slow ease-ds-out"
                      style={{ width: `${learnProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/practice" className="block group">
            <Card className="border-l-4 border-l-accent hover:border-accent/60 transition-all hover:scale-[1.01] p-5">
              <p className="font-sans text-sm font-medium text-accent mb-1">Practice</p>
              <p className="font-sans text-sm text-muted-foreground">
                Quizzes and guided play to sharpen what the floors teach.
              </p>
            </Card>
          </Link>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="font-display text-2xs text-info uppercase tracking-[0.3em] ml-1">
            TILE OF THE DAY
          </h2>
          <Card className="flex flex-col items-center text-center p-6 bg-gradient-to-b from-elevated/40 to-transparent border-border/10">
            <div className="mb-4 hover:rotate-3 transition-transform cursor-help">
              {randomTile && <MahjongTile tile={randomTile} width={80} height={112} />}
            </div>
            <p className="text-xl font-medium text-foreground mb-1 font-sans">
              {randomTile?.nameEnglish ?? ''}
            </p>
            <p className="text-2xl text-highlight font-sans mb-3 ds-text-glow">
              {randomTile?.nameChinese ?? ''}
            </p>
            <Badge variant="secondary" className="bg-surface/50 border-border/20 text-muted-foreground text-2xs uppercase tracking-widest px-3 py-1">
              {tileDescription}
            </Badge>
          </Card>

          <Card className="bg-highlight/5 border-highlight/20 p-5">
            <div className="flex gap-3">
              <Lightbulb size={18} className="text-highlight shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 leading-relaxed font-sans">
                The <span className="text-highlight font-medium">1 Bamboo</span> tile often features a
                bird. Don&apos;t look for sticks!
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Local-mode note — demoted from the old header's "LOCAL PROGRESS" badge */}
      <p className="text-center">
        <Link
          href="/progress"
          className="font-display text-2xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-highlight"
        >
          LOCAL PROGRESS
        </Link>
      </p>
    </div>
  );
}
