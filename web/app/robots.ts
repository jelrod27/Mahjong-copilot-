import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteMetadata';

/**
 * Deferred and stateful routes are disallowed here as well as being `noindex`.
 *
 * The two do different jobs: `noindex` keeps a page out of the index but still
 * spends crawl budget, while a Disallow stops the fetch. Both are set because
 * these routes are numerous relative to the real content — nine placeholders
 * against 56 lessons.
 *
 * `/play/game` is excluded because it takes query parameters
 * (?difficulty=, ?table=, ?minFaan=) that would otherwise present many
 * near-duplicate URLs for a single screen with no readable content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/login',
        '/signup',
        '/profile',
        '/leaderboard',
        '/multiplayer/',
        '/play/lobby',
        '/play/multiplayer',
        '/play/game',
        '/auth/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
