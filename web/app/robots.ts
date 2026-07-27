import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteMetadata';

/**
 * Deliberately does NOT disallow the deferred routes.
 *
 * They carry `robots: { index: false }` page metadata, and a crawler has to
 * FETCH a page to see that directive. Disallowing them would prevent the fetch,
 * so any URL already discovered through a link would stay in the index
 * indefinitely with no way to drop out — the opposite of the intent. Disallow
 * and noindex are alternatives here, not reinforcement; the first shipped
 * version of this file got that backwards.
 *
 * `/auth/` is the exception: it is a callback route with no page metadata to
 * carry a noindex, so blocking the fetch is the only lever available.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
