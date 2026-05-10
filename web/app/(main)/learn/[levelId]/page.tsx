'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getLevelById } from '@/content';
import useCompletedLessons from '@/hooks/useCompletedLessons';


export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = Number(params.levelId);
  const level = getLevelById(levelId);

  const { completedLessons } = useCompletedLessons();


  if (!level) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground font-sans">Level not found</p>
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
      <div className="bg-gradient-to-b from-surface to-background px-6 pt-8 pb-6 rounded-b-2xl">
        <button
          onClick={() => router.push('/learn')}
          className="text-sm text-info font-sans mb-3 hover:ds-text-glow transition-all"
        >
          ‹ All Levels
        </button>
        <p className="font-display text-[10px] text-highlight tracking-[1.5px] mb-1">
          LEVEL {level.id}
        </p>
        <h1 className="font-display text-lg text-foreground mb-2">{level.title}</h1>
        <p className="text-base text-foreground/80 font-sans mb-4">{level.description}</p>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-highlight rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-foreground/80 font-sans">
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
              className={`flex items-center ds-card p-4 mb-3 transition-colors ${
                isCompleted ? 'border-success/50' : 'hover:border-info/50'
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
              className="flex items-center ds-card p-4 mb-3 opacity-50"
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
        <div className="mx-4 ds-card p-8 text-center mb-8 border-highlight">
          <p className="text-5xl mb-2">🎉</p>
          <p className="font-display text-sm text-highlight ds-text-glow mb-1">Level Complete!</p>
          <p className="text-base text-muted-foreground font-sans">
            Ready for the next challenge?
          </p>
          <Link
            href="/learn"
            className="inline-block mt-4 ds-btn-success px-6 py-3"
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
            ? 'bg-success'
            : !isUnlocked
              ? 'bg-muted-foreground/30'
              : 'bg-info'
        }`}
      >
        {isCompleted ? (
          <span className="text-xl font-bold text-black">✓</span>
        ) : (
          <span className={`text-lg font-bold font-sans ${!isUnlocked ? 'text-muted-foreground' : 'text-black'}`}>
            {index + 1}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[17px] font-sans mb-0.5 ${!isUnlocked ? 'text-muted-foreground' : 'text-foreground'}`}>
          {lesson.title}
        </p>
        <p className={`text-sm font-sans mb-1.5 ${!isUnlocked ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          {lesson.subtitle}
        </p>
        <div className="flex gap-2">
          {lesson.tiles && lesson.tiles.length > 0 && (
            <span className="text-xs text-muted-foreground bg-elevated px-2 py-0.5 rounded font-sans">
              🀄 {lesson.tiles.length} tiles
            </span>
          )}
          {lesson.quiz && lesson.quiz.length > 0 && (
            <span className="text-xs text-muted-foreground bg-elevated px-2 py-0.5 rounded font-sans">
              ❓ {lesson.quiz.length} quiz
            </span>
          )}
        </div>
      </div>

      <div className="ml-2">
        {isUnlocked ? (
          <span className="text-3xl text-info font-light">›</span>
        ) : (
          <span className="text-lg">🔒</span>
        )}
      </div>
    </>
  );
}
