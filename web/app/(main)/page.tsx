'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
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
} from 'lucide-react';

export default function HomePage() {
  const user = useAppSelector((state) => state.auth.user);
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
      <div className="relative overflow-hidden p-6 rounded-lg bg-retro-bgLight/30 border border-retro-border/10 backdrop-blur-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-retro-textDim font-mono uppercase tracking-[0.2em] mb-1">{greeting}</p>
            <h1 className="font-pixel text-xl md:text-2xl text-retro-gold text-glow-gold mb-2">
              16 BIT MAHJONG
            </h1>
          </div>
          <Link
            href={user ? '/profile' : '/login'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-retro-gold/30 bg-retro-gold/5 hover:bg-retro-gold/10 transition-all group"
          >
            <Sparkles size={14} className="text-retro-gold group-hover:scale-110 transition-transform" aria-hidden />
            <span className="font-pixel home-micro-track text-[9px] text-retro-gold">
              {user ? 'PROFILE' : 'SYNC PROGRESS'}
            </span>
          </Link>
        </div>
        <p className="text-retro-text/80 leading-relaxed font-sans max-w-2xl">
          {getMotivationalText()}
        </p>
      </div>

      {/* Stats Row */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex flex-col items-center justify-center p-6 bg-retro-cyan/5 border-retro-cyan/20">
            <p className="text-3xl font-bold text-retro-cyan font-pixel text-glow-cyan">
              {completedLessons.length}
            </p>
            <p className="text-[10px] font-pixel text-retro-textDim uppercase mt-2 tracking-widest">Lessons Done</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 bg-retro-accent/5 border-retro-accent/20">
            <p className="text-3xl font-bold text-retro-accent font-pixel text-glow-retro">
              {totalLessons - completedLessons.length}
            </p>
            <p className="text-[10px] font-pixel text-retro-textDim uppercase mt-2 tracking-widest">Remaining</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-6 bg-retro-gold/5 border-retro-gold/20">
            <p className="text-3xl font-bold text-retro-gold font-pixel text-glow-gold">
              144
            </p>
            <p className="text-[10px] font-pixel text-retro-textDim uppercase mt-2 tracking-widest">Total Tiles</p>
          </Card>
        </div>

        <div className="neo-retro-card p-5 flex items-center gap-6 bg-retro-bgLight/20">
          <span className="text-[10px] font-pixel text-retro-textDim uppercase tracking-widest shrink-0">Progress</span>
          <div className="flex-1 h-3 bg-retro-bgLight/50 rounded-full overflow-hidden border border-retro-border/10">
            <div 
              className="h-full bg-gradient-to-r from-retro-accent to-retro-gold transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(232,56,79,0.3)]"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-retro-green font-pixel shrink-0">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Column — Continue Learning */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="font-pixel text-[10px] text-retro-cyan uppercase tracking-[0.3em] ml-1">
            CONTINUE LEARNING
          </h2>

          <div className="space-y-4">
            {/* Level 1 — Active */}
            <Link href="/learn" className="block group">
              <Card className="border-l-4 border-l-retro-cyan hover:border-retro-cyan/60 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-sm bg-retro-cyan/10 border-2 border-retro-cyan/40 flex items-center justify-center shrink-0 group-hover:bg-retro-cyan/20 group-hover:border-retro-cyan transition-colors">
                    <GraduationCap size={28} className="text-retro-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-pixel text-[10px] text-retro-gold tracking-widest">
                        LEVEL 1
                      </span>
                      {completedLessons.length === 0 && (
                        <Badge variant="cyan" className="text-[9px] font-pixel tracking-tighter h-5">
                          START HERE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl font-medium text-retro-text mb-1 font-sans">
                      {Level1.title}
                    </p>
                    <p className="text-sm text-retro-textDim font-sans">
                      {completedLessons.length === 0
                        ? 'Master the fundamentals of the 144-tile set.'
                        : `${completedLessons.length}/${totalLessons} lessons complete. Keep up the momentum.`}
                    </p>
                  </div>
                  <div className="hidden sm:flex w-16 h-16 rounded-sm bg-retro-bg/40 border border-retro-border/10 items-center justify-center shrink-0 shadow-inner">
                    <span className="text-sm font-bold text-retro-cyan font-pixel">
                      {Math.round(level1Progress)}%
                    </span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Level 2 — Locked */}
            <Card className="opacity-40 grayscale-[0.5] relative overflow-hidden group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-sm bg-retro-textDim/10 border-2 border-retro-textDim/30 flex items-center justify-center shrink-0">
                  <Layers size={28} className="text-retro-textDim" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-pixel text-[10px] text-retro-textDim tracking-widest uppercase">
                      LEVEL 2
                    </span>
                    <Badge variant="outline" className="text-retro-textDim border-retro-textDim/40 text-[9px] font-pixel gap-1 h-5">
                      <Lock size={10} />
                      LOCKED
                    </Badge>
                  </div>
                  <p className="text-xl font-medium text-retro-textDim mb-1 font-sans">
                    Sets and Combinations
                  </p>
                  <p className="text-sm text-retro-textDim/70 font-sans italic">
                    Unlock this module by completing Level 1.
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-retro-bg/20 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all" />
            </Card>
          </div>
        </div>

        {/* Sidebar Column — Widgets */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="font-pixel text-[10px] text-retro-cyan uppercase tracking-[0.3em] ml-1">
            TILE OF THE DAY
          </h2>
          <Card className="flex flex-col items-center text-center p-8 bg-gradient-to-b from-retro-bgLight/40 to-transparent border-retro-border/10">
            <div className="mb-6 hover:rotate-3 transition-transform cursor-help">
              {randomTile && <MahjongTile tile={randomTile} width={90} height={126} />}
            </div>
            <p className="text-2xl font-medium text-retro-text mb-1 font-sans">
              {randomTile?.nameEnglish ?? ''}
            </p>
            <p className="text-3xl text-retro-gold font-retro mb-4 text-glow-gold">
              {randomTile?.nameChinese ?? ''}
            </p>
            <Badge variant="secondary" className="bg-retro-panel/50 border-retro-border/20 text-retro-textDim text-[10px] uppercase font-mono tracking-widest px-3 py-1">
              {tileDescription}
            </Badge>
          </Card>

          <h2 className="font-pixel text-[10px] text-retro-cyan uppercase tracking-[0.3em] ml-1">
            QUICK TIPS
          </h2>
          <Card className="bg-retro-gold/5 border-retro-gold/20 p-6">
            <div className="space-y-6">
              <div className="flex gap-4">
                <Lightbulb size={20} className="text-retro-gold shrink-0 mt-1" />
                <p className="text-sm text-retro-text/80 leading-relaxed font-sans">
                  The <span className="text-retro-gold font-medium">1 Bamboo</span> tile often features a bird (often a sparrow or peacock). Don&apos;t look for sticks!
                </p>
              </div>
              <div className="flex gap-4">
                <Sparkles size={20} className="text-retro-gold shrink-0 mt-1" />
                <p className="text-sm text-retro-text/80 leading-relaxed font-sans">
                  The <span className="text-retro-gold font-medium">White Dragon</span> is the only tile that can be completely blank. In modern sets, it has a blue or black frame.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
