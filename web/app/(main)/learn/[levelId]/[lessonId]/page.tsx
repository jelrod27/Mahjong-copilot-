import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AllLevels, getLevelById } from '@/content';
import { pageMetadata } from '@/lib/siteMetadata';
import { lessonMetaDescription } from '@/lib/lessonSeo';
import LessonClient from './LessonClient';

type Params = { levelId: string; lessonId: string };

/**
 * Prerender all 56 lessons. These are the pages with genuinely searchable
 * content — "can you chow from any player", "what is a kong" — and until now
 * they were server-rendered on demand behind a single shared title.
 */
export function generateStaticParams(): Params[] {
  return AllLevels.flatMap(level =>
    level.lessons.map(lesson => ({
      levelId: String(level.id),
      lessonId: lesson.id,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { levelId, lessonId } = await params;
  const level = getLevelById(Number(levelId));
  const lesson = level?.lessons.find(l => l.id === lessonId);

  if (!level || !lesson) {
    return pageMetadata({
      title: 'Lesson not found',
      description: 'That lesson does not exist.',
      path: `/learn/${levelId}/${lessonId}`,
      noindex: true,
    });
  }

  return pageMetadata({
    title: lesson.title,
    description: lessonMetaDescription(lesson),
    path: `/learn/${level.id}/${lesson.id}`,
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { levelId, lessonId } = await params;
  const level = getLevelById(Number(levelId));
  if (!level?.lessons.some(l => l.id === lessonId)) notFound();
  return <LessonClient />;
}
