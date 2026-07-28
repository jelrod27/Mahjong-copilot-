import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AllLevels, getLevelById } from '@/content';
import { pageMetadata } from '@/lib/siteMetadata';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, courseJsonLd } from '@/lib/structuredData';
import LevelClient from './LevelClient';

type Params = { levelId: string };

/**
 * Prerender every level. Without this the route is server-rendered on demand,
 * which is both slower and weaker for crawling — the level pages are the hub
 * that links to each lesson, so they are what a crawler follows to reach them.
 */
export function generateStaticParams(): Params[] {
  return AllLevels.map(level => ({ levelId: String(level.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { levelId } = await params;
  const level = getLevelById(Number(levelId));
  if (!level) {
    return pageMetadata({
      title: 'Level not found',
      description: 'That level does not exist.',
      path: `/learn/${levelId}`,
      noindex: true,
    });
  }

  return pageMetadata({
    title: `${level.title} — Level ${level.id}`,
    // The level's own description is written for learners, so it doubles as a
    // meta description rather than needing a parallel string that would drift.
    description: `${level.description}. Level ${level.id} of the Hong Kong Mahjong course — ${level.lessons.length} lessons.`,
    path: `/learn/${level.id}`,
  });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { levelId } = await params;
  const level = getLevelById(Number(levelId));
  if (!level) notFound();

  return (
    <>
      <JsonLd
        data={[
          courseJsonLd(level),
          breadcrumbJsonLd([
            { name: 'Learn', path: '/learn' },
            { name: level.title, path: `/learn/${level.id}` },
          ]),
        ]}
      />
      <LevelClient />
    </>
  );
}
