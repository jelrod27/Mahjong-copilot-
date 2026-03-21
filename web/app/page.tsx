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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-mahjong-green px-6 pt-8 pb-10">
        <p className="text-sm text-white/80 mb-1">{getGreeting()}</p>
        <h1 className="text-[28px] font-bold text-white mb-2">Mahjong for Dummies</h1>
        <p className="text-base text-white/90 leading-relaxed">{getMotivationalText()}</p>
      </div>

      {/* Progress Card */}
      <div className="px-4 -mt-5">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-semibold text-gray-900">Your Progress</span>
            <span className="text-2xl font-bold text-mahjong-green">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-mahjong-green rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex text-center">
            <div className="flex-1">
              <p className="text-xl font-bold text-gray-900">{completedLessons.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Lessons Done</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1">
              <p className="text-xl font-bold text-gray-900">{totalLessons - completedLessons.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1">
              <p className="text-xl font-bold text-gray-900">144</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Tiles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Continue Learning</h2>

        <Link href="/learn" className="block bg-white rounded-xl p-6 shadow-md border-l-4 border-mahjong-green mb-2">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-mahjong-green tracking-wider mb-1">LEVEL 1</p>
              <p className="text-lg font-semibold text-gray-900 mb-1">{Level1.title}</p>
              <p className="text-sm text-gray-500">
                {completedLessons.length === 0
                  ? 'Start here'
                  : `${completedLessons.length}/${totalLessons} complete`}
              </p>
            </div>
            <div className="ml-4 w-14 h-14 rounded-full bg-mahjong-green flex items-center justify-center">
              <span className="text-sm font-bold text-white">{Math.round(level1Progress)}%</span>
            </div>
          </div>
        </Link>

        <div className="bg-gray-100 rounded-xl p-6 opacity-70 relative">
          <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-1">LEVEL 2</p>
          <p className="text-lg font-semibold text-gray-500 mb-1">Sets and Combinations</p>
          <p className="text-sm text-gray-400">Complete Level 1 to unlock</p>
          <span className="absolute top-4 right-4 text-[10px] font-bold text-gray-500 bg-gray-300 px-2.5 py-1 rounded">LOCKED</span>
        </div>
      </div>

      {/* Random Tile */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Random Tile</h2>
        <div className="bg-white rounded-xl p-6 shadow-md flex items-center">
          <div className="mr-6">
            <MahjongTile tile={randomTile} width={70} height={100} />
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900 mb-1">{randomTile.nameEnglish}</p>
            <p className="text-2xl text-mahjong-green mb-2">{randomTile.nameChinese}</p>
            <p className="text-sm text-gray-500 capitalize">
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
        <h2 className="text-lg font-bold text-gray-900 mb-2">Quick Tips</h2>
        <div className="bg-amber-50 rounded-md p-4 mb-2">
          <p className="text-sm text-amber-800 leading-relaxed">
            The 1 Bamboo tile shows a bird, not a bamboo stick. This catches most beginners off guard.
          </p>
        </div>
        <div className="bg-amber-50 rounded-md p-4">
          <p className="text-sm text-amber-800 leading-relaxed">
            White Dragon is often blank or shows just a frame. Don&apos;t mistake it for a missing tile.
          </p>
        </div>
      </div>
    </div>
  );
}
