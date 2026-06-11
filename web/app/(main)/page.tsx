'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AllLevels } from '@/content';
import { MahjongTile } from '@/components/MahjongTile';
import { getAllTiles } from '@/models/Tile';
import useCompletedLessons from '@/hooks/useCompletedLessons';
import CharacterPortrait from '@/components/npc/CharacterPortrait';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getParlourProgress, PARLOUR_FLOORS, getFloor } from '@/lib/parlour';
import { getDailyState, gamStreakLine, DailyState } from '@/lib/dailyHand';
import { getCurrentRank, consumeRankUp, PlayerRank } from '@/lib/ranks';
import soundManager from '@/lib/soundManager';
import {
  Lightbulb,
  Sparkles,
  GraduationCap,
  Gamepad2,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  const { completedLessons } = useCompletedLessons();
  const [randomTile, setRandomTile] = useState<ReturnType<typeof getAllTiles>[0] | null>(null);
  const [rank, setRank] = useState<PlayerRank | null>(null);
  const [rankUp, setRankUp] = useState<PlayerRank | null>(null);
  const [floorsLit, setFloorsLit] = useState(0);
  const [daily, setDaily] = useState<DailyState | null>(null);

  useEffect(() => {
    const tiles = getAllTiles();
    setRandomTile(tiles[Math.floor(Math.random() * tiles.length)]);
    setRank(getCurrentRank());
    setFloorsLit(getParlourProgress().highestCleared);
    setDaily(getDailyState());
    const up = consumeRankUp();
    if (up) {
      setRankUp(up);
      soundManager.play('win');
    }
  }, []);

  const totalLessons = AllLevels.reduce((sum, level) => sum + level.lessons.length, 0);
  const lessonsDone = completedLessons.length;
  const learnProgress = totalLessons > 0 ? (lessonsDone / totalLessons) * 100 : 0;

  const [greeting, setGreeting] = useState('Welcome');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const nextFloor = getFloor(Math.min(floorsLit + 1, PARLOUR_FLOORS.length));
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

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Rank-up ceremony */}
      {rankUp && (
        <div className="ds-card-elevated border-highlight/50 p-4 text-center" role="status">
          <p className="font-display text-[10px] tracking-[0.3em] text-highlight">RANK UP</p>
          <p className="mt-1 font-display text-lg text-highlight ds-text-glow-strong animate-score-punch">
            {rankUp.name}
          </p>
          <p className="mt-1 font-sans text-xs text-muted-foreground">{rankUp.flavor}</p>
        </div>
      )}

      {/* Header: who you are */}
      <div className="relative overflow-hidden p-6 rounded-lg bg-elevated/30 border border-border/10 backdrop-blur-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em] mb-1">{greeting}</p>
            <h1 className="font-display text-xl md:text-2xl text-highlight text-glow-highlight">
              16 BIT MAHJONG
            </h1>
          </div>
          <Link
            href="/progress"
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-highlight/30 bg-highlight/5 hover:bg-highlight/10 transition-all group"
          >
            <Sparkles size={14} className="text-highlight group-hover:scale-110 transition-transform" aria-hidden />
            <span className="font-display home-micro-track text-[9px] text-highlight">
              LOCAL PROGRESS
            </span>
          </Link>
        </div>

        {rank && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-3 py-1">
            <span className="font-display text-[10px] tracking-widest text-info">{rank.name.toUpperCase()}</span>
            <span className="hidden font-sans text-[11px] text-muted-foreground sm:inline">{rank.flavor}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/parlour"
            className="inline-flex items-center gap-2 rounded-sm border border-highlight/40 bg-highlight/10 px-4 py-2.5 font-display text-xs text-highlight transition-colors hover:bg-highlight/20"
          >
            <Building2 size={14} aria-hidden />
            {floorsLit === 0 ? 'Enter the Jade Parlour' : `Climb to ${nextFloor?.name ?? 'the top'}`}
          </Link>
          <Link
            href="/play"
            className="inline-flex items-center gap-2 rounded-sm border border-success/40 bg-success/10 px-4 py-2.5 font-display text-xs text-success transition-colors hover:bg-success/20"
          >
            <Gamepad2 size={14} aria-hidden />
            Free play
          </Link>
        </div>
      </div>

      {/* The Parlour: primary progress */}
      <Link href="/parlour" className="block group">
        <Card className="border-l-4 border-l-highlight p-5 transition-all hover:scale-[1.01]">
          <div className="flex items-center gap-4">
            <CharacterPortrait character="gam" emotion="idle" size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[10px] tracking-widest text-highlight">THE JADE PARLOUR</p>
                <span className="font-display text-xs text-muted-foreground">{floorsLit}/9 lit</span>
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
                  <p className="font-display text-[10px] tracking-widest text-info">DAILY HAND</p>
                  {daily.streak > 0 && (
                    <Badge variant="secondary" className="bg-highlight/10 border-highlight/30 text-highlight text-[9px] font-display h-5">
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
              <span className={`shrink-0 font-display text-[10px] ${daily.playedToday ? 'text-success' : 'text-info'}`}>
                {daily.playedToday ? 'DONE' : 'PLAY'}
              </span>
            </div>
          </Card>
        </Link>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-display text-[10px] text-info uppercase tracking-[0.3em] ml-1">
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
                    <span className="font-display text-[10px] text-highlight tracking-widest">
                      LESSONS
                    </span>
                    {lessonsDone === 0 && (
                      <Badge variant="cyan" className="text-[9px] font-display tracking-tighter h-5">
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
              <p className="font-display text-[10px] text-accent tracking-widest mb-1">PRACTICE</p>
              <p className="font-sans text-sm text-muted-foreground">
                Quizzes and guided play to sharpen what the floors teach.
              </p>
            </Card>
          </Link>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="font-display text-[10px] text-info uppercase tracking-[0.3em] ml-1">
            TILE OF THE DAY
          </h2>
          <Card className="flex flex-col items-center text-center p-6 bg-gradient-to-b from-elevated/40 to-transparent border-border/10">
            <div className="mb-4 hover:rotate-3 transition-transform cursor-help">
              {randomTile && <MahjongTile tile={randomTile} width={80} height={112} />}
            </div>
            <p className="text-xl font-medium text-foreground mb-1 font-sans">
              {randomTile?.nameEnglish ?? ''}
            </p>
            <p className="text-2xl text-highlight font-sans mb-3 text-glow-highlight">
              {randomTile?.nameChinese ?? ''}
            </p>
            <Badge variant="secondary" className="bg-surface/50 border-border/20 text-muted-foreground text-[10px] uppercase font-mono tracking-widest px-3 py-1">
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
    </div>
  );
}
