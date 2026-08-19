'use client';

import { useCallback, useMemo, useState } from 'react';
import { useBrowserValue } from '@/hooks/useBrowserValue';

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

// Stable identity: useBrowserValue compares snapshots by reference.
const NONE: string[] = [];

function readCompletedLessons(): string[] {
  try {
    const stored = localStorage.getItem(COMPLETED_LESSONS_KEY);
    return stored ? JSON.parse(stored) : NONE;
  } catch {
    return NONE;
  }
}

/**
 * Shared hook for reading and writing completed lesson state from localStorage.
 */
export default function useCompletedLessons() {
  // localStorage stays the source of truth; `added` only exists to re-render
  // the caller after a write it made itself.
  const stored = useBrowserValue(readCompletedLessons, NONE);
  const [added, setAdded] = useState<string[]>(NONE);

  const completedLessons = useMemo(
    () => (added.length === 0 ? stored : [...stored, ...added]),
    [stored, added],
  );

  const markComplete = useCallback((lessonId: string) => {
    const current = readCompletedLessons();
    if (current.includes(lessonId)) return;
    localStorage.setItem(
      COMPLETED_LESSONS_KEY,
      JSON.stringify([...current, lessonId]),
    );
    setAdded(prev => (prev.includes(lessonId) ? prev : [...prev, lessonId]));
  }, []);

  return { completedLessons, markComplete };
}
