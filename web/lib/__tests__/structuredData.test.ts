import { describe, it, expect } from 'vitest';
import { AllLevels } from '@/content';
import { SITE_URL } from '../siteMetadata';
import {
  ORGANIZATION_ID,
  breadcrumbJsonLd,
  courseJsonLd,
  courseListJsonLd,
  lessonJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from '../structuredData';

describe('site entity', () => {
  it('gives the organization a stable @id other graphs can reference', () => {
    expect(organizationJsonLd()['@id']).toBe(ORGANIZATION_ID);
  });

  it('attributes the website to the organization', () => {
    expect(webSiteJsonLd().publisher).toEqual({ '@id': ORGANIZATION_ID });
  });
});

describe('breadcrumbs', () => {
  const crumbs = breadcrumbJsonLd([
    { name: 'Learn', path: '/learn' },
    { name: 'Playing a Hand', path: '/learn/7' },
  ]);

  it('prepends the site root', () => {
    expect(crumbs.itemListElement[0].name).toBe('Home');
  });

  it('numbers positions from 1 with no gaps', () => {
    const positions = crumbs.itemListElement.map(i => i.position);
    expect(positions).toEqual([1, 2, 3]);
  });

  it('uses absolute URLs', () => {
    for (const item of crumbs.itemListElement) {
      expect(item.item.startsWith(SITE_URL)).toBe(true);
    }
  });
});

describe('Course markup', () => {
  const level = AllLevels[0];
  const course = courseJsonLd(level);

  it('names a provider', () => {
    // Google rejects Course markup with a missing or generic provider; this is
    // the most common reason it is silently ignored.
    expect(course.provider).toEqual({ '@id': ORGANIZATION_ID });
  });

  it('declares a zero-price offer for a free course', () => {
    // Google's guidance is that even free courses carry an Offer to be
    // eligible for enhanced display.
    expect(course.offers.price).toBe(0);
  });

  it('lists what the level teaches', () => {
    expect(course.teaches).toEqual(level.lessons.map(l => l.title));
  });

  it('gives every level a distinct @id', () => {
    const ids = AllLevels.map(l => courseJsonLd(l)['@id']);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Course list', () => {
  const list = courseListJsonLd();

  it('carries enough courses to be carousel-eligible', () => {
    // Google requires at least three marked-up courses for the Course List
    // carousel. If the curriculum ever shrank below that, the markup would
    // stop earning anything and this should fail loudly.
    expect(list.itemListElement.length).toBeGreaterThanOrEqual(3);
  });

  it('includes every level', () => {
    expect(list.itemListElement).toHaveLength(AllLevels.length);
  });

  it('numbers positions from 1 in curriculum order', () => {
    expect(list.itemListElement.map(i => i.position)).toEqual(
      AllLevels.map((_, i) => i + 1),
    );
  });
});

describe('lesson markup', () => {
  const level = AllLevels.find(l => l.id === 7)!;
  const lesson = level.lessons[3];
  const node = lessonJsonLd(level, lesson, 'A description.');

  it('attaches the lesson to its level course', () => {
    expect(node.isPartOf).toEqual({ '@id': `${SITE_URL}/learn/${level.id}#course` });
  });

  it('gives every lesson a distinct @id', () => {
    const ids = AllLevels.flatMap(l =>
      l.lessons.map(les => lessonJsonLd(l, les, 'd')['@id']),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('serialisation safety', () => {
  it('escapes < so a string value cannot terminate the script block', () => {
    // Not an XSS vector — ld+json is not executed — but an unescaped
    // "</script>" inside any value ends the block early and breaks the page.
    const json = JSON.stringify(
      breadcrumbJsonLd([{ name: '</script><b>x', path: '/x' }]),
    ).replace(/</g, '\\u003c');
    expect(json).not.toContain('</script>');
  });
});
