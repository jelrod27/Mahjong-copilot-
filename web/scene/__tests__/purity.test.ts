/**
 * Structural proof that the scene projection is framework-free.
 *
 * The seam is only worth what it costs if the projection can be reasoned
 * about and tested without a renderer. That is a property of the source, so
 * it is asserted against the source — and transitively, because a pure module
 * that imports an impure one is not pure.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCENE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const WEB_ROOT = dirname(SCENE_DIR);

const BANNED_PACKAGES = [
  'react',
  'react-dom',
  'three',
  'next',
  '@react-three/fiber',
  '@react-three/drei',
];

/**
 * Globals that only exist in a browser. `window` and `document` are the
 * obvious ones; the rest are the APIs a renderer reaches for first.
 */
const BANNED_GLOBALS = [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'HTMLCanvasElement',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'ResizeObserver',
  'getComputedStyle',
  'matchMedia',
];

function sourceFilesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))
    .map(e => join(dir, e.name));
}

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) specifiers.push(match[1]);

  const bare = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
  while ((match = bare.exec(source)) !== null) specifiers.push(match[1]);

  return specifiers;
}

/** Resolve a `@/`-aliased or relative specifier to a file on disk. */
function resolveLocal(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(WEB_ROOT, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(fromFile), specifier)
      : null;
  if (base === null) return null;

  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      /* try the next extension */
    }
  }
  return null;
}

/** Every file reachable from the scene module's own sources. */
function reachableFiles(): string[] {
  const queue = sourceFilesIn(SCENE_DIR);
  const seen = new Set(queue);

  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const specifier of importSpecifiers(readFileSync(file, 'utf8'))) {
      const resolved = resolveLocal(specifier, file);
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return [...seen];
}

const sceneFiles = sourceFilesIn(SCENE_DIR);
const graph = reachableFiles();

describe('the scene module is framework-free', () => {
  it('has sources to check', () => {
    expect(sceneFiles.length).toBeGreaterThan(0);
    expect(graph.length).toBeGreaterThan(sceneFiles.length);
  });

  it.each(BANNED_PACKAGES)('imports no %s, anywhere in its import graph', pkg => {
    for (const file of graph) {
      const specifiers = importSpecifiers(readFileSync(file, 'utf8'));
      const offenders = specifiers.filter(s => s === pkg || s.startsWith(`${pkg}/`));
      expect({ file, offenders }).toEqual({ file, offenders: [] });
    }
  });

  it('imports nothing from outside the repo at all', () => {
    for (const file of graph) {
      const external = importSpecifiers(readFileSync(file, 'utf8')).filter(
        s => !s.startsWith('.') && !s.startsWith('@/'),
      );
      expect({ file, external }).toEqual({ file, external: [] });
    }
  });

  it.each(BANNED_GLOBALS)('touches no %s', global => {
    // Word-boundary match, so `windowSize` or a comment mentioning the word in
    // prose does not trip the check — only a real reference to the global.
    const pattern = new RegExp(`(?<![.\\w$])${global}\\s*[.\\[(]`);
    for (const file of graph) {
      const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
      expect({ file, uses: pattern.test(source) }).toEqual({ file, uses: false });
    }
  });

  it('exports a projection that runs with no globals beyond the language', async () => {
    // The projection is imported and run here purely to prove it needs nothing
    // the test above forbids; behaviour is covered by projection.test.ts.
    const { projectScene } = await import('../projection');
    const { midHandGame, VIEWER_ID } = await import('./fixtures');
    expect(() =>
      projectScene({ game: midHandGame(), viewerId: VIEWER_ID, cosmetics: {} }),
    ).not.toThrow();
  });
});
