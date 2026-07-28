import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from '../JsonLd';

/**
 * Exercises the renderer itself.
 *
 * The first version of this lived in the structuredData tests and re-applied
 * the escape expression inline, so it asserted that a regex works rather than
 * that the component uses one — it would have stayed green if JsonLd stopped
 * escaping entirely.
 */

const scriptOf = (container: HTMLElement) =>
  container.querySelector('script[type="application/ld+json"]');

describe('JsonLd', () => {
  it('renders an ld+json script', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Thing' }} />);
    expect(scriptOf(container)).not.toBeNull();
  });

  it('serialises the payload', () => {
    const { container } = render(<JsonLd data={{ '@type': 'Thing', name: 'Tile' }} />);
    expect(JSON.parse(scriptOf(container)!.innerHTML)).toEqual({
      '@type': 'Thing',
      name: 'Tile',
    });
  });

  it('accepts a graph array', () => {
    const { container } = render(<JsonLd data={[{ '@type': 'A' }, { '@type': 'B' }]} />);
    expect(JSON.parse(scriptOf(container)!.innerHTML)).toHaveLength(2);
  });

  it('escapes < so a string value cannot terminate the script block', () => {
    // ld+json is not executed, so this is not an XSS vector — but an
    // unescaped "</script>" inside any value ends the block early and breaks
    // every tag after it on the page.
    const { container } = render(
      <JsonLd data={{ '@type': 'Thing', name: '</script><b>boom' }} />,
    );
    expect(scriptOf(container)!.innerHTML).not.toContain('</script>');
  });

  it('keeps the escaped payload parseable', () => {
    // Escaping must not corrupt the data — \\u003c is still a valid JSON
    // escape for '<', so a consumer reads the original string back.
    const { container } = render(
      <JsonLd data={{ '@type': 'Thing', name: '</script>' }} />,
    );
    expect(JSON.parse(scriptOf(container)!.innerHTML).name).toBe('</script>');
  });
});
