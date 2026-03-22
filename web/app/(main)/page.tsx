'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Level1 } from '@/content/level1';
import { MahjongTile } from '@/components/MahjongTile';
import { getAllTiles } from '@/models/Tile';
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

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

export default function HomePage() {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [randomTile, setRandomTile] = useState(() => {
    const tiles = getAllTiles();
    return tiles[Math.floor(Math.random() * tiles.length)];
  });

  useEffect(() => {
    const stored = localStorage.getItem(COMPLETED_LESSONS_KEY);
    if (stored) setCompletedLessons(JSON.parse(stored));

    const tiles = getAllTiles();
    setRandomTile(tiles[Math.floor(Math.random() * tiles.length)]);
  }, []);

  const totalLessons = Level1.lessons.length;
  const level1Progress = (completedLessons.length / totalLessons) * 100;
  const overallProgress = level1Progress;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalText = () => {
    if (completedLessons.length === 0) return "Ready to learn mahjong? Let's start with the basics.";
    if (level1Progress === 100) return 'Level 1 complete! You know all the tiles now.';
    if (level1Progress >= 50) return "You're halfway through! Keep going.";
    return "You're making progress. Keep it up!";
  };

  const tileDescription = randomTile.number
    ? `${randomTile.suit} suit, number ${randomTile.number}`
    : randomTile.wind
      ? `${randomTile.wind} wind tile`
      : randomTile.dragon
        ? `${randomTile.dragon} dragon`
        : 'Bonus tile';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-retro-textDim mb-1">{getGreeting()}</p>
        <h1 className="font-pixel text-lg md:text-xl text-retro-gold retro-glow-strong mb-2">
          16 BIT MAHJONG
        </h1>
        <p className="text-retro-text/80 leading-relaxed">
          {getMotivationalText()}
        </p>
      </div>

      {/* Stats Row */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Card className="neo-retro-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-retro-cyan font-pixel">
                {completedLessons.length}
              </p>
              <p className="text-xs text-retro-textDim mt-1">Lessons Done</p>
            </CardContent>
          </Card>
          <Card className="neo-retro-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-retro-accent font-pixel">
                {totalLessons - completedLessons.length}
              </p>
              <p className="text-xs text-retro-textDim mt-1">Remaining</p>
            </CardContent>
          </Card>
          <Card className="neo-retro-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl md:text-3xl font-bold text-retro-gold font-pixel">
                144
              </p>
              <p className="text-xs text-retro-textDim mt-1">Total Tiles</p>
            </CardContent>
          </Card>
        </div>

        <div className="neo-retro-card p-4 flex items-center gap-4">
          <span className="text-xs text-retro-textDim shrink-0">Progress</span>
          <Progress value={overallProgress} className="flex-1 h-3 bg-retro-bgLight" />
          <span className="text-sm font-bold text-retro-green font-pixel shrink-0">
            {Math.round(overallProgress)}%
          </span>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column — Continue Learning */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-pixel text-xs text-retro-cyan uppercase tracking-wide">
            Continue Learning
          </h2>

          {/* Level 1 — Active */}
          <Link href="/learn" className="block group">
            <Card className="neo-retro-card border-l-4 border-l-retro-cyan transition-transform group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-sm bg-retro-cyan/20 border-2 border-retro-cyan flex items-center justify-center shrink-0">
                    <GraduationCap size={24} className="text-retro-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-pixel text-[10px] text-retro-gold tracking-wider">
                        LEVEL 1
                      </span>
                      {completedLessons.length === 0 && (
                        <Badge variant="secondary" className="bg-retro-cyan/20 text-retro-cyan border-retro-cyan/40 text-[10px] font-pixel">
                          Start here
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-medium text-retro-text mb-1">
                      {Level1.title}
                    </p>
                    <p className="text-sm text-retro-textDim">
                      {completedLessons.length === 0
                        ? 'Learn to identify all 144 tiles'
                        : `${completedLessons.length}/${totalLessons} lessons complete`}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-sm bg-retro-cyan/10 border-2 border-retro-cyan/40 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-retro-cyan font-pixel">
                      {Math.round(level1Progress)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Level 2 — Locked */}
          <Card className="neo-retro-card opacity-50 cursor-not-allowed relative">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-retro-textDim/10 border-2 border-retro-textDim/30 flex items-center justify-center shrink-0">
                  <Layers size={24} className="text-retro-textDim" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-pixel text-[10px] text-retro-textDim tracking-wider">
                      LEVEL 2
                    </span>
                    <Badge variant="outline" className="text-retro-textDim border-retro-textDim/40 text-[10px] font-pixel gap-1">
                      <Lock size={10} />
                      LOCKED
                    </Badge>
                  </div>
                  <p className="text-lg font-medium text-retro-textDim mb-1">
                    Sets and Combinations
                  </p>
                  <p className="text-sm text-retro-textDim/70">
                    Complete Level 1 to unlock
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column — Widgets */}
        <div className="lg:col-span-4 space-y-4">
          {/* Random Tile Widget */}
          <h2 className="font-pixel text-xs text-retro-cyan uppercase tracking-wide">
            Random Tile
          </h2>
          <Card className="neo-retro-card">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="mb-4">
                <MahjongTile tile={randomTile} width={80} height={112} />
              </div>
              <p className="text-xl font-medium text-retro-text mb-1">
                {randomTile.nameEnglish}
              </p>
              <p className="text-2xl text-retro-gold font-retro mb-2">
                {randomTile.nameChinese}
              </p>
              <Badge className="bg-retro-panel border-retro-border/30 text-retro-textDim text-xs capitalize">
                {tileDescription}
              </Badge>
            </CardContent>
          </Card>

          {/* Quick Tips Widget */}
          <h2 className="font-pixel text-xs text-retro-cyan uppercase tracking-wide">
            Quick Tips
          </h2>
          <Card className="neo-retro-card bg-retro-gold/5 border-retro-gold/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex gap-3">
                <Lightbulb size={18} className="text-retro-gold shrink-0 mt-0.5" />
                <p className="text-sm text-retro-text/80 leading-relaxed">
                  The 1 Bamboo tile shows a bird, not a bamboo stick. This catches most beginners off guard.
                </p>
              </div>
              <div className="flex gap-3">
                <Sparkles size={18} className="text-retro-gold shrink-0 mt-0.5" />
                <p className="text-sm text-retro-text/80 leading-relaxed">
                  White Dragon is often blank or shows just a frame. Don&apos;t mistake it for a missing tile.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
