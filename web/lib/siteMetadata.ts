import type { Metadata } from 'next';

/**
 * Canonical site identity, used by every route's metadata and by sitemap.ts.
 *
 * Every page previously inherited the root layout's title and description, so
 * a production build served `<title>16 Bit Mahjong</title>` and the same
 * description on ~70 URLs with zero canonical tags. Google collapses
 * near-identical pages, which is why 56 lessons of real content were not
 * ranking: they all looked like one page.
 */

/**
 * Absolute origin. Vercel exposes the deployment host without a scheme, so
 * previews get their own canonical rather than pointing at production —
 * otherwise every preview would claim to be the live site.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_ENV === 'production'
    ? 'https://16bitmahjong.co'
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://16bitmahjong.co');

export const SITE_NAME = '16 Bit Mahjong';

/** Appended by Next via the root layout's title.template. */
export const TITLE_SUFFIX = ` — ${SITE_NAME}`;

/**
 * Build a page's metadata with a canonical URL.
 *
 * `path` is root-relative and becomes the canonical, which is the half that
 * actually resolves duplicate-content ambiguity; a unique title alone does not.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  /**
   * Root-relative canonical. Omit for dynamic routes that have no single
   * canonical instance — emitting a path with a literal `[param]` segment
   * would advertise a URL that does not exist.
   */
  path?: string;
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      title: `${title}${TITLE_SUFFIX}`,
      description,
      ...(path ? { url: path } : {}),
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title}${TITLE_SUFFIX}`,
      description,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
