import type { MetadataRoute } from 'next';
import { AllLevels } from '@/content';
import { SITE_URL } from '@/lib/siteMetadata';

/**
 * Sitemap, derived from level data rather than hand-listed.
 *
 * A literal list would drift the moment a lesson is added — the same failure
 * that left `/learn` advertising a "Full Game" level that never existed. Adding
 * Level 8 should require no edit here, and `__tests__/sitemap.test.ts` asserts
 * that every lesson is present so a hardcoded list cannot creep back.
 *
 * Deferred placeholder routes (/login, /profile, /multiplayer/*, …) are
 * deliberately absent: they are `noindex`, and listing a noindex URL in a
 * sitemap is a contradiction Search Console reports as an error.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${SITE_URL}${path}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url('/'), changeFrequency: 'monthly', priority: 1 },
    { url: url('/learn'), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/reference'), changeFrequency: 'monthly', priority: 0.9 },
    { url: url('/practice'), changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/play'), changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/parlour'), changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/cosmetics'), changeFrequency: 'yearly', priority: 0.3 },
    { url: url('/progress'), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const levelRoutes: MetadataRoute.Sitemap = AllLevels.map(level => ({
    url: url(`/learn/${level.id}`),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // The lessons are the substance: 56 pages answering the questions people
  // actually search ("can you chow from any player", "what is a kong").
  const lessonRoutes: MetadataRoute.Sitemap = AllLevels.flatMap(level =>
    level.lessons.map(lesson => ({
      url: url(`/learn/${level.id}/${lesson.id}`),
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
  );

  return [...staticRoutes, ...levelRoutes, ...lessonRoutes];
}
