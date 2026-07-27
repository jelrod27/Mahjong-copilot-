import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import robots from '../robots';
import { AllLevels } from '@/content';
import { SITE_URL, pageMetadata } from '@/lib/siteMetadata';
import { lessonMetaDescription } from '@/lib/lessonSeo';

/**
 * Before this change a production build served `<title>16 Bit Mahjong</title>`
 * and one shared description on every URL, with zero canonical tags — ~70 pages
 * that were indistinguishable to a crawler. These tests pin the properties that
 * fixed it, because nothing else in the suite looks at metadata.
 */

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map(e => e.url);

  it('lists every lesson', () => {
    // Derived from AllLevels, so adding Level 8 needs no edit here. If someone
    // replaces the derivation with a literal list, this fails.
    for (const level of AllLevels) {
      for (const lesson of level.lessons) {
        expect(urls, `missing lesson ${lesson.id}`).toContain(
          `${SITE_URL}/learn/${level.id}/${lesson.id}`,
        );
      }
    }
  });

  it('lists every level', () => {
    for (const level of AllLevels) {
      expect(urls).toContain(`${SITE_URL}/learn/${level.id}`);
    }
  });

  it('contains no duplicate URLs', () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('uses absolute URLs', () => {
    for (const url of urls) expect(url.startsWith('https://')).toBe(true);
  });

  it('omits routes that robots.txt disallows', () => {
    // Listing a disallowed URL in a sitemap is a contradiction Search Console
    // reports as an error.
    const disallowed = [robots().rules].flat().flatMap(r => [r?.disallow ?? []].flat());
    for (const url of urls) {
      const path = url.replace(SITE_URL, '');
      for (const rule of disallowed) {
        expect(path.startsWith(rule), `${path} is disallowed but listed`).toBe(false);
      }
    }
  });
});

describe('robots', () => {
  it('points at the sitemap', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('allows the site root', () => {
    expect([robots().rules].flat()[0]?.allow).toBe('/');
  });

  it('disallows the parameterised game route', () => {
    // ?difficulty=/?table=/?minFaan= would otherwise present many
    // near-duplicate URLs for one screen with no readable content.
    const disallow = [[robots().rules].flat()[0]?.disallow ?? []].flat();
    expect(disallow).toContain('/play/game');
  });
});

describe('pageMetadata', () => {
  it('sets a canonical when given a path', () => {
    const meta = pageMetadata({ title: 'T', description: 'D', path: '/learn' });
    expect(meta.alternates?.canonical).toBe('/learn');
  });

  it('omits the canonical when no path is given', () => {
    // Dynamic routes with no single canonical instance must not advertise a
    // URL containing a literal [param] segment.
    const meta = pageMetadata({ title: 'T', description: 'D' });
    expect(meta.alternates?.canonical).toBeUndefined();
  });

  it('marks a page noindex only when asked', () => {
    expect(pageMetadata({ title: 'T', description: 'D', path: '/x' }).robots).toBeUndefined();
    expect(
      pageMetadata({ title: 'T', description: 'D', path: '/x', noindex: true }).robots,
    ).toEqual({ index: false, follow: true });
  });
});

describe('lesson meta descriptions', () => {
  const lessons = AllLevels.flatMap(l => l.lessons);

  it('generates one for every lesson', () => {
    for (const lesson of lessons) {
      expect(lessonMetaDescription(lesson).length, lesson.id).toBeGreaterThan(0);
    }
  });

  it('keeps every description within Google’s display limit', () => {
    for (const lesson of lessons) {
      expect(lessonMetaDescription(lesson).length, lesson.id).toBeLessThanOrEqual(155);
    }
  });

  it('gives every lesson a distinct description', () => {
    // The entire defect being fixed was ~70 pages sharing one description.
    const descriptions = lessons.map(lessonMetaDescription);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('excludes ALL-CAPS section headers', () => {
    // "PUNG AND KONG — FROM ANYONE" is a layout header, not a sentence, and
    // reads as shouting in a search result.
    //
    // Checks each lesson against its OWN header lines rather than a generic
    // caps regex — several lessons legitimately use inline caps for emphasis
    // mid-sentence ("DRAGON PUNGS are one of the easiest fans to earn"), and a
    // blanket pattern flags those too.
    const isHeader = (line: string) => {
      const letters = [...line].filter(c => /[a-z]/i.test(c));
      return letters.length > 0 && letters.every(c => c === c.toUpperCase());
    };

    for (const lesson of lessons) {
      const desc = lessonMetaDescription(lesson);
      for (const header of lesson.content.filter(isHeader)) {
        expect(desc, `${lesson.id} leaked header "${header}"`).not.toContain(header);
      }
    }
  });

  it('starts each description with readable prose, not a header', () => {
    for (const lesson of lessons) {
      expect(lessonMetaDescription(lesson)[0], lesson.id).toMatch(/[A-Za-z0-9"'“]/);
    }
  });

  it('does not run the subtitle into the body text', () => {
    const lesson = AllLevels.flatMap(l => l.lessons).find(l => l.id === '7-4')!;
    expect(lessonMetaDescription(lesson)).toContain('most often.');
  });
});

describe('lesson titles', () => {
  it('are unique across the whole curriculum', () => {
    // Two lessons sharing a title would reintroduce duplicate <title> tags,
    // which is the exact problem this change exists to fix.
    const titles = AllLevels.flatMap(l => l.lessons).map(l => l.title);
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(dupes).toEqual([]);
  });
});
