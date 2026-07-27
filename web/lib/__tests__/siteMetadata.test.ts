import { describe, it, expect } from 'vitest';
import { SITE_URL, pageMetadata } from '../siteMetadata';

describe('SITE_URL', () => {
  it('is an absolute origin', () => {
    expect(SITE_URL).toMatch(/^https:\/\//);
  });

  it('carries no trailing slash', () => {
    // Every consumer concatenates onto it, so a trailing slash would yield
    // `//learn` in the sitemap and a malformed metadataBase.
    expect(SITE_URL.endsWith('/')).toBe(false);
  });
});

describe('pageMetadata', () => {
  it('sets a canonical when given a path', () => {
    expect(pageMetadata({ title: 'T', description: 'D', path: '/learn' }).alternates?.canonical)
      .toBe('/learn');
  });

  it('omits the canonical when no path is given', () => {
    // Dynamic routes with no single canonical instance must not advertise a
    // URL containing a literal [param] segment.
    expect(pageMetadata({ title: 'T', description: 'D' }).alternates?.canonical).toBeUndefined();
  });

  it('does not mark a page noindex by default', () => {
    expect(pageMetadata({ title: 'T', description: 'D', path: '/x' }).robots).toBeUndefined();
  });

  it('marks a page noindex when asked, while still following links', () => {
    // follow:true keeps a placeholder's links into the real content flowing.
    expect(pageMetadata({ title: 'T', description: 'D', path: '/x', noindex: true }).robots)
      .toEqual({ index: false, follow: true });
  });
});
