'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Level1 } from '@/content/level1';
import { MahjongTile } from '@/components/MahjongTile';
import { getAllTiles } from '@/models/Tile';
import useCompletedLessons from '@/hooks/useCompletedLessons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Lock,
  Lightbulb,
  Sparkles,
  GraduationCap,
  Layers,
  Gamepad2,
} from 'lucide-react';

export default function HomePage() {
  const { completedLessons } = useCompletedLessons();
  const [randomTile, setRandomTile] = useState<ReturnType<typeof getAllTiles>[0] | null>(null);

  useEffect(() => {
    const tiles = getAllTiles();
    setRandomTile(tiles[Math.floor(Math.random() * tiles.length)]);
  }, []);

  const totalLessons = Level1.lessons.length;
  const level1Progress = (completedLessons.length / totalLessons) * 100;
  const overallProgress = level1Progress;

  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const getMotivationalText = () => {
    if (completedLessons.length === 0) return "Ready to learn mahjong? Let's start with the basics.";
    if (level1Progress === 100) return 'Level 1 complete! You know all the tiles now.';
    if (level1Progress >= 50) return "You're halfway through! Keep going.";
    return "You're making progress. Keep it up!";
  };

  const tileDescription = randomTile?.number
    ? `${randomTile.suit} suit, number ${randomTile.number}`
    : randomTile?.wind
      ? `${randomTile.wind} wind tile`
      : randomTile?.dragon
        ? `${randomTile.dragon} dragon`
        : 'Bonus tile';

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="relative overflow-hidden p-6 rounded-lg bg-elevated/30 border border-border/10 backdrop-blur-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em] mb-1">{greeting}</p>
            <h1 className="font-display text-xl md:text-2xl text-highlight text-glow-highlight mb-2">
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
        <p className="text-foreground/80 leading-relaxed font-sans max-w-2xl">
          {getMotivationalText()}
        </p>
        <Link
          href="/play"
          className="mt-4 inline-flex items-center gap-2 rounded-sm border border-success/40 bg-success/10 px-4 py-2.5 font-display text-xs text-success transition-colors hover:bg-success/20"
        >
          <Gamepad2 size={14} aria-hidden />
          Play solo — HK table mahjong vs AI
        </Link>
      </div>

      {/* Stats Row */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex flex-col items-center justify-center p-6 bg-info/5 border-info/20">
            <p className="text-3xl font-bold text-info font-display text-glow-info">
              {completedLessons.length}
            </p>
            <p className="text-[10px] font-display text-muted-foreground uppercase mt-2 tracking-widest">Lessons Done</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 bg-accent/5 border-accent/20">
            <p className="text-3xl font-bold text-accent font-display text-glow-accent">
              {totalLessons - completedLessons.length}
            </p>
            <p className="text-[10px] font-display text-muted-foreground uppercase mt-2 tracking-widest">Remaining</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 bg-highlight/5 border-highlight/20">
            <p className="text-3xl font-bold text-highlight font-display text-glow-highlight">
              144
            </p>
            <p className="text-[10px] font-display text-muted-foreground uppercase mt-2 tracking-widest">Total Tiles</p>
          </Card>
        </div>

        <div className="ds-card-elevated p-5 flex items-center gap-6 bg-elevated/20">
          <span className="text-[10px] font-display text-muted-foreground uppercase tracking-widest shrink-0">Progress</span>
          <div className="flex-1 h-3 bg-elevated/50 rounded-full overflow-hidden border border-border/10">
            <div 
              className="h-full bg-gradient-to-r from-accent to-highlight transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(232,56,79,0.3)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-success font-display shrink-0">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column — Continue Learning */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="font-display text-[10px] text-info uppercase tracking-[0.3em] ml-1">
            CONTINUE LEARNING
          </h2>

          <div className="space-y-4">
            {/* Level 1 — Active */}
            <Link href="/learn" className="block group">
              <Card className="border-l-4 border-l-info hover:border-info/60 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-sm bg-info/10 border-2 border-info/40 flex items-center justify-center shrink-0 group-hover:bg-info/20 group-hover:border-info transition-colors">
                    <GraduationCap size={28} className="text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display text-[10px] text-highlight tracking-widest">
                        LEVEL 1
                      </span>
                      {completedLessons.length === 0 && (
                        <Badge variant="cyan" className="text-[9px] font-display tracking-tighter h-5">
                          START HERE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl font-medium text-foreground mb-1 font-sans">
                      {Level1.title}
                    </p>
                    <p className="text-sm text-muted-foreground font-sans">
                      {completedLessons.length === 0
                        ? 'Master the fundamentals of the 144-tile set.'
                        : `${completedLessons.length}/${totalLessons} lessons complete. Keep up the momentum.`}
                    </p>
                  </div>
                  <div className="hidden sm:flex w-16 h-16 rounded-sm bg-background/40 border border-border/10 items-center justify-center shrink-0 shadow-inner">
                    <span className="text-sm font-bold text-info font-display">
                      {Math.round(level1Progress)}%
                    </span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Level 2 — Locked */}
            <Card className="opacity-40 grayscale-[0.5] relative overflow-hidden group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-sm bg-muted-foreground/10 border-2 border-muted-foreground/30 flex items-center justify-center shrink-0">
                  <Layers size={28} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display text-[10px] text-muted-foreground tracking-widest uppercase">
                      LEVEL 2
                    </span>
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40 text-[9px] font-display gap-1 h-5">
                      <Lock size={10} />
                      LOCKED
                    </Badge>
                  </div>
                  <p className="text-xl font-medium text-muted-foreground mb-1 font-sans">
                    Sets and Combinations
                  </p>
                  <p className="text-sm text-muted-foreground/70 font-sans italic">
                    Unlock this module by completing Level 1.
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all" />
            </Card>
          </div>
        </div>

        {/* Sidebar Column — Widgets */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="font-display text-[10px] text-info uppercase tracking-[0.3em] ml-1">
            TILE OF THE DAY
          </h2>
          <Card className="flex flex-col items-center text-center p-8 bg-gradient-to-b from-elevated/40 to-transparent border-border/10">
            <div className="mb-6 hover:rotate-3 transition-transform cursor-help">
              {randomTile && <MahjongTile tile={randomTile} width={90} height={126} />}
            </div>
            <p className="text-2xl font-medium text-foreground mb-1 font-sans">
              {randomTile?.nameEnglish ?? ''}
            </p>
            <p className="text-3xl text-highlight font-sans mb-4 text-glow-highlight">
              {randomTile?.nameChinese ?? ''}
            </p>
            <Badge variant="secondary" className="bg-surface/50 border-border/20 text-muted-foreground text-[10px] uppercase font-mono tracking-widest px-3 py-1">
              {tileDescription}
            </Badge>
          </Card>

          <h2 className="font-display text-[10px] text-info uppercase tracking-[0.3em] ml-1">
            QUICK TIPS
          </h2>
          <Card className="bg-highlight/5 border-highlight/20 p-6">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Lightbulb size={20} className="text-highlight shrink-0 mt-1" />
                <p className="text-sm text-foreground/80 leading-relaxed font-sans">
                  The <span className="text-highlight font-medium">1 Bamboo</span> tile often features a bird (often a sparrow or peacock). Don&apos;t look for sticks!
                </p>
              </div>
              <div className="flex gap-4">
                <Sparkles size={20} className="text-highlight shrink-0 mt-1" />
                <p className="text-sm text-foreground/80 leading-relaxed font-sans">
                  The <span className="text-highlight font-medium">White Dragon</span> is the only tile that can be completely blank. In modern sets, it has a blue or black frame.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
