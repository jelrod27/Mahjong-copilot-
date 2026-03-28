'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getLevelById } from '@/content';

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = Number(params.levelId);
  const level = getLevelById(levelId);

  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(COMPLETED_LESSONS_KEY);
    if (stored) setCompletedLessons(JSON.parse(stored));
  }, []);

  if (!level) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-retro-textDim font-retro">Level not found</p>
      </div>
    );
  }

  const completedInLevel = completedLessons.filter(id => id.startsWith(`${levelId}-`)).length;
  const progress = (completedInLevel / level.lessons.length) * 100;

  const isLessonUnlocked = (index: number) => {
    if (index === 0) return true;
    return completedLessons.includes(level.lessons[index - 1].id);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-retro-panel to-retro-bg px-6 pt-8 pb-6 rounded-b-2xl">
        <button
          onClick={() => router.push('/learn')}
          className="text-sm text-retro-cyan font-retro mb-3 hover:retro-glow transition-all"
        >
          ‹ All Levels
        </button>
        <p className="font-pixel text-[10px] text-retro-gold tracking-[1.5px] mb-1">
          LEVEL {level.id}
        </p>
        <h1 className="font-pixel text-lg text-retro-white mb-2">{level.title}</h1>
        <p className="text-base text-retro-text/80 font-retro mb-4">{level.description}</p>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-2 bg-retro-bgLight rounded-full overflow-hidden">
            <div
              className="h-full bg-retro-gold rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-retro-text/80 font-retro">
            {completedInLevel}/{level.lessons.length} lessons
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
              href={`/learn/${levelId}/${lesson.id}`}
              className={`flex items-center retro-card p-4 mb-3 transition-colors ${
                isCompleted ? 'border-retro-green/50' : 'hover:border-retro-cyan/50'
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
              className="flex items-center retro-card p-4 mb-3 opacity-50"
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
      {completedInLevel === level.lessons.length && (
        <div className="mx-4 retro-card p-8 text-center mb-8 border-retro-gold">
          <p className="text-5xl mb-2">🎉</p>
          <p className="font-pixel text-sm text-retro-gold retro-glow mb-1">Level Complete!</p>
          <p className="text-base text-retro-textDim font-retro">
            Ready for the next challenge?
          </p>
          <Link
            href="/learn"
            className="inline-block mt-4 retro-btn-green px-6 py-3"
          >
            Back to Levels
          </Link>
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
  lesson: { title: string; subtitle: string; tiles?: string[]; quiz?: unknown[] };
  isCompleted: boolean;
  isUnlocked: boolean;
}) {
  return (
    <>
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center mr-4 shrink-0 ${
          isCompleted
            ? 'bg-retro-green'
            : !isUnlocked
              ? 'bg-retro-textDim/30'
              : 'bg-retro-cyan'
        }`}
      >
        {isCompleted ? (
          <span className="text-xl font-bold text-black">✓</span>
        ) : (
          <span className={`text-lg font-bold font-retro ${!isUnlocked ? 'text-retro-textDim' : 'text-black'}`}>
            {index + 1}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[17px] font-retro mb-0.5 ${!isUnlocked ? 'text-retro-textDim' : 'text-retro-text'}`}>
          {lesson.title}
        </p>
        <p className={`text-sm font-retro mb-1.5 ${!isUnlocked ? 'text-retro-textDim/50' : 'text-retro-textDim'}`}>
          {lesson.subtitle}
        </p>
        <div className="flex gap-2">
          {lesson.tiles && lesson.tiles.length > 0 && (
            <span className="text-xs text-retro-textDim bg-retro-bgLight px-2 py-0.5 rounded font-retro">
              🀄 {lesson.tiles.length} tiles
            </span>
          )}
          {lesson.quiz && lesson.quiz.length > 0 && (
            <span className="text-xs text-retro-textDim bg-retro-bgLight px-2 py-0.5 rounded font-retro">
              ❓ {lesson.quiz.length} quiz
            </span>
          )}
        </div>
      </div>

      <div className="ml-2">
        {isUnlocked ? (
          <span className="text-3xl text-retro-cyan font-light">›</span>
        ) : (
          <span className="text-lg">🔒</span>
        )}
      </div>
    </>
  );
}
