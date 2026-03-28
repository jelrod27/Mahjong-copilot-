'use client';

import { useState, useEffect, useCallback } from 'react';

const COMPLETED_LESSONS_KEY = '@mahjong_completed_lessons';

/**
 * Shared hook for reading and writing completed lesson state from localStorage.
 */
export default function useCompletedLessons() {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(COMPLETED_LESSONS_KEY);
    if (stored) setCompletedLessons(JSON.parse(stored));
  }, []);

  const markComplete = useCallback((lessonId: string) => {
    setCompletedLessons(prev => {
      if (prev.includes(lessonId)) return prev;
      const updated = [...prev, lessonId];
      localStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { completedLessons, markComplete };
}
