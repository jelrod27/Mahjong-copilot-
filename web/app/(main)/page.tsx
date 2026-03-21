'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Level1 } from '@/content/level1';
import { MahjongTile } from '@/components/MahjongTile';
import { getAllTiles } from '@/models/Tile';

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
    if (level1Progress === 100) return "Level 1 complete! You know all the tiles now.";
    if (level1Progress >= 50) return "You're halfway through! Keep going.";
    return "You're making progress. Keep it up!";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-10">
        <p className="text-sm text-retro-textDim mb-1 font-retro">{getGreeting()}</p>
        <h1 className="font-pixel text-lg text-retro-gold retro-glow-strong mb-2">
          16 BIT MAHJONG
        </h1>
        <p className="text-base text-retro-text/80 font-retro leading-relaxed">
          {getMotivationalText()}
        </p>
      </div>

      {/* Progress Card */}
      <div className="px-4 -mt-5">
        <div className="retro-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-xs text-retro-cyan uppercase">Your Progress</span>
            <span className="text-2xl font-bold text-retro-green retro-glow font-retro">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div className="h-2.5 bg-retro-bgLight rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-retro-green rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex text-center">
            <div className="flex-1">
              <p className="text-xl font-bold text-retro-text font-retro">{completedLessons.length}</p>
              <p className="text-xs text-retro-textDim mt-0.5 font-retro">Lessons Done</p>
            </div>
            <div className="w-px bg-retro-border/20" />
            <div className="flex-1">
              <p className="text-xl font-bold text-retro-text font-retro">{totalLessons - completedLessons.length}</p>
              <p className="text-xs text-retro-textDim mt-0.5 font-retro">Remaining</p>
            </div>
            <div className="w-px bg-retro-border/20" />
            <div className="flex-1">
              <p className="text-xl font-bold text-retro-text font-retro">144</p>
              <p className="text-xs text-retro-textDim mt-0.5 font-retro">Total Tiles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      <div className="px-4 mt-6">
        <h2 className="font-pixel text-xs text-retro-cyan uppercase tracking-wide mb-3">Continue Learning</h2>

        <Link href="/learn" className="block retro-card p-6 border-l-4 border-retro-cyan mb-3">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="font-pixel text-[10px] text-retro-gold tracking-wider mb-1">LEVEL 1</p>
              <p className="text-lg font-retro text-retro-text mb-1">{Level1.title}</p>
              <p className="text-sm text-retro-textDim font-retro">
                {completedLessons.length === 0
                  ? 'Start here'
                  : `${completedLessons.length}/${totalLessons} complete`}
              </p>
            </div>
            <div className="ml-4 w-14 h-14 rounded-full bg-retro-cyan/20 border-2 border-retro-cyan flex items-center justify-center">
              <span className="text-sm font-bold text-retro-cyan font-retro">{Math.round(level1Progress)}%</span>
            </div>
          </div>
        </Link>

        <div className="retro-card p-6 opacity-50">
          <p className="font-pixel text-[10px] text-retro-textDim tracking-wider mb-1">LEVEL 2</p>
          <p className="text-lg font-retro text-retro-textDim mb-1">Sets and Combinations</p>
          <p className="text-sm text-retro-textDim/70 font-retro">Complete Level 1 to unlock</p>
          <span className="absolute top-4 right-4 font-pixel text-[8px] text-retro-textDim bg-retro-bgLight px-2 py-1 rounded">
            LOCKED
          </span>
        </div>
      </div>

      {/* Random Tile */}
      <div className="px-4 mt-6">
        <h2 className="font-pixel text-xs text-retro-cyan uppercase tracking-wide mb-3">Random Tile</h2>
        <div className="retro-card p-6 flex items-center">
          <div className="mr-6">
            <MahjongTile tile={randomTile} width={70} height={100} />
          </div>
          <div>
            <p className="text-xl font-retro text-retro-text mb-1">{randomTile.nameEnglish}</p>
            <p className="text-2xl text-retro-gold font-retro mb-2">{randomTile.nameChinese}</p>
            <p className="text-sm text-retro-textDim font-retro capitalize">
              {randomTile.number
                ? `${randomTile.suit} suit, number ${randomTile.number}`
                : randomTile.wind
                  ? `${randomTile.wind} wind tile`
                  : randomTile.dragon
                    ? `${randomTile.dragon} dragon`
                    : 'Bonus tile'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="px-4 mt-6 pb-8">
        <h2 className="font-pixel text-xs text-retro-cyan uppercase tracking-wide mb-3">Quick Tips</h2>
        <div className="retro-card p-4 mb-3 border-l-2 border-retro-gold">
          <p className="text-sm text-retro-text/80 font-retro leading-relaxed">
            The 1 Bamboo tile shows a bird, not a bamboo stick. This catches most beginners off guard.
          </p>
        </div>
        <div className="retro-card p-4 border-l-2 border-retro-gold">
          <p className="text-sm text-retro-text/80 font-retro leading-relaxed">
            White Dragon is often blank or shows just a frame. Don&apos;t mistake it for a missing tile.
          </p>
        </div>
      </div>
    </div>
  );
}
