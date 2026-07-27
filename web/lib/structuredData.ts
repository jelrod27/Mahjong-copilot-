import { AllLevels } from '@/content';
import type { Level, Lesson } from '@/content/level1';
import { SITE_NAME, SITE_URL } from './siteMetadata';

/**
 * JSON-LD builders.
 *
 * Scoped to what Google still rewards, which is narrower than it was:
 *
 * - **BreadcrumbList** — still earns a rich result and still has an active
 *   Search Console enhancement report. Desktop-only for the visible crumb
 *   trail now, but the hierarchy signal applies everywhere.
 * - **Course / ItemList** — the *course info* rich card was retired in June
 *   2025; the Course List carousel survives. It needs at least three courses
 *   and a clearly identified provider, both of which we satisfy.
 * - **WebSite / Organization** — entity understanding rather than a rich
 *   result.
 *
 * Deliberately NOT built: FAQPage. Google stopped showing FAQ rich results on
 * 7 May 2026 and removed the report and Rich Results Test support the
 * following month, so marking up the 28 glossary terms would earn nothing in
 * Search. The type is still valid schema.org if we later want it purely for
 * AI-search consumption, but it should not be added under the impression that
 * it produces a rich result.
 */

const url = (path: string) => `${SITE_URL}${path}`;

/** Publisher identity, referenced by @id from the other graphs. */
export const ORGANIZATION_ID = url('/#organization');
export const WEBSITE_ID = url('/#website');

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  };
}

/**
 * Breadcrumb trail. `items` are ordered root-first and exclude the site root,
 * which this adds.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: url(item.path),
    })),
  };
}

/**
 * One level as a Course.
 *
 * `offers` with price 0 is included deliberately: Google's guidance is that
 * even free courses should carry an Offer to be eligible for enhanced display,
 * and omitting it is a common reason markup is silently ignored.
 */
export function courseJsonLd(level: Level) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': url(`/learn/${level.id}#course`),
    name: level.title,
    description: level.description,
    url: url(`/learn/${level.id}`),
    // A generic or missing provider is the most common reason Course markup is
    // rejected, so it is named explicitly rather than left to inference.
    provider: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      category: 'Free',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${Math.max(level.lessons.length * 2, 5)}M`,
    },
    teaches: level.lessons.map(lesson => lesson.title),
  };
}

/**
 * The /learn index as a Course List. Requires three or more courses to be
 * carousel-eligible; the curriculum has seven.
 */
export function courseListJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: AllLevels.map((level, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: courseJsonLd(level),
    })),
  };
}

/** One lesson, as part of its level's course. */
export function lessonJsonLd(level: Level, lesson: Lesson, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': url(`/learn/${level.id}/${lesson.id}#lesson`),
    name: lesson.title,
    description,
    url: url(`/learn/${level.id}/${lesson.id}`),
    learningResourceType: 'Lesson',
    educationalLevel: `Level ${level.id}`,
    inLanguage: 'en',
    isAccessibleForFree: true,
    isPartOf: { '@id': url(`/learn/${level.id}#course`) },
    publisher: { '@id': ORGANIZATION_ID },
  };
}
