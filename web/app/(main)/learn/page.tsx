'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Level1 } from '@/content/level1';

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

export default function LearnPage() {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const level = Level1;

  useEffect(() => {
    const stored = localStorage.getItem(COMPLETED_LESSONS_KEY);
    if (stored) setCompletedLessons(JSON.parse(stored));
  }, []);

  const progress = (completedLessons.length / level.lessons.length) * 100;

  const isLessonUnlocked = (index: number) => {
    if (index === 0) return true;
    return completedLessons.includes(level.lessons[index - 1].id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-mahjong-green px-6 pt-8 pb-6 rounded-b-2xl">
        <p className="text-xs font-bold text-mahjong-gold tracking-[1.5px] mb-1">
          LEVEL {level.id}
        </p>
        <h1 className="text-[28px] font-bold text-white mb-2">{level.title}</h1>
        <p className="text-base text-white/85 mb-4">{level.description}</p>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-mahjong-gold rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-white/90 font-semibold">
            {completedLessons.length}/{level.lessons.length} lessons
          </p>
        </div>
      </div>

      {/* Lessons List */}
      <div className="p-4">
        {level.lessons.map((lesson, index) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const isUnlocked = isLessonUnlocked(index);

          return isUnlocked ? (
            <Link
              key={lesson.id}
              href={`/learn/${lesson.id}`}
              className={`flex items-center rounded-xl p-4 mb-2 shadow-md ${
                isCompleted
                  ? 'bg-green-50 border border-mahjong-green'
                  : 'bg-white'
              }`}
            >
              <LessonCard
                index={index}
                lesson={lesson}
                isCompleted={isCompleted}
                isUnlocked={isUnlocked}
              />
            </Link>
          ) : (
            <div
              key={lesson.id}
              className="flex items-center bg-gray-100 rounded-xl p-4 mb-2 opacity-70"
            >
              <LessonCard
                index={index}
                lesson={lesson}
                isCompleted={false}
                isUnlocked={false}
              />
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {completedLessons.length === level.lessons.length && (
        <div className="mx-4 p-8 bg-amber-50 rounded-xl text-center mb-8">
          <p className="text-5xl mb-2">🎉</p>
          <p className="text-xl font-bold text-gray-900 mb-1">Level Complete!</p>
          <p className="text-base text-gray-500">
            You&apos;ve mastered all the tiles. Ready for Level 2?
          </p>
        </div>
      )}
    </div>
  );
}

function LessonCard({
  index,
  lesson,
  isCompleted,
  isUnlocked,
}: {
  index: number;
  lesson: { title: string; subtitle: string; tiles?: string[]; quiz?: any[] };
  isCompleted: boolean;
  isUnlocked: boolean;
}) {
  return (
    <>
      {/* Number circle */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center mr-4 shrink-0 ${
          isCompleted
            ? 'bg-mahjong-green'
            : !isUnlocked
              ? 'bg-gray-300'
              : 'bg-mahjong-green'
        }`}
      >
        {isCompleted ? (
          <span className="text-xl font-bold text-white">✓</span>
        ) : (
          <span className={`text-lg font-bold ${!isUnlocked ? 'text-gray-400' : 'text-white'}`}>
            {index + 1}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[17px] font-semibold mb-0.5 ${!isUnlocked ? 'text-gray-400' : 'text-gray-900'}`}>
          {lesson.title}
        </p>
        <p className={`text-sm mb-1.5 ${!isUnlocked ? 'text-gray-300' : 'text-gray-500'}`}>
          {lesson.subtitle}
        </p>
        <div className="flex gap-2">
          {lesson.tiles && lesson.tiles.length > 0 && (
            <span className="text-xs text-gray-500 bg-black/5 px-2 py-0.5 rounded">
              🀄 {lesson.tiles.length} tiles
            </span>
          )}
          {lesson.quiz && lesson.quiz.length > 0 && (
            <span className="text-xs text-gray-500 bg-black/5 px-2 py-0.5 rounded">
              ❓ {lesson.quiz.length} quiz
            </span>
          )}
        </div>
      </div>

      {/* Arrow / Lock */}
      <div className="ml-2">
        {isUnlocked ? (
          <span className="text-3xl text-mahjong-green font-light">›</span>
        ) : (
          <span className="text-lg">🔒</span>
        )}
      </div>
    </>
  );
}
