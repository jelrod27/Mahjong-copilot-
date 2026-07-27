import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import robots from '../robots';
import { AllLevels } from '@/content';
import { SITE_URL } from '@/lib/siteMetadata';

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

  it('does not disallow pages that rely on noindex metadata', () => {
    // A crawler must FETCH a page to see its noindex directive. Disallowing a
    // noindex page prevents that fetch, so an already-discovered URL would stay
    // indexed forever. The two are alternatives, not reinforcement — the first
    // version of robots.ts got this backwards and blocked all nine placeholders.
    const disallow = [[robots().rules].flat()[0]?.disallow ?? []].flat();
    const noindexPaths = [
      '/login', '/signup', '/profile', '/leaderboard',
      '/multiplayer/', '/play/lobby', '/play/multiplayer', '/play/game',
    ];
    for (const path of noindexPaths) {
      expect(disallow, `${path} is noindex and must stay crawlable`).not.toContain(path);
    }
  });

  it('still blocks routes that have no page metadata to carry a noindex', () => {
    const disallow = [[robots().rules].flat()[0]?.disallow ?? []].flat();
    expect(disallow).toContain('/auth/');
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
