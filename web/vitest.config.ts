import { defineConfig, coverageConfigDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['engine/**', 'scene/**', 'presentation/**', 'models/**', 'store/reducers/**', 'components/**'],
      exclude: [
        // Spread first: setting `exclude` REPLACES vitest's defaults, and losing
        // them would start counting the test files themselves — which are ~100%
        // covered by definition and would inflate the floor into meaninglessness.
        ...coverageConfigDefaults.exclude,
        // The WebGL prototype. These four need a GPU and a real canvas, so they
        // cannot be exercised in jsdom at all; counting them measures nothing and
        // drags the floor down by ~13 points, which would force the thresholds
        // down for the code that IS shipped. The gate is scoped, not weakened —
        // the thresholds below are untouched.
        //
        // Deliberately file-by-file rather than the whole directory: npcFocus,
        // portraitTexture and tileArt are pure, tested, and still counted.
        'components/game/prototype/ThreeTable.tsx',
        'components/game/prototype/npcRig.ts',
        'components/game/prototype/boardMaterials.ts',
        'components/game/prototype/PrototypeVariant.tsx',
        // v8 tries to parse the prototype README as source and logs a parse
        // error before excluding it anyway.
        '**/*.md',
      ],
      // A floor, not a target. Set just under the measured baseline so the
      // number can only be pushed up; raise it as coverage improves.
      //
      // Re-baselined for vitest 4, whose v8 provider counts differently to
      // vitest 3: statements and lines rose (60 -> 69/71) while branches and
      // functions fell (84 -> 59, 85 -> 62) on an unchanged suite. The same
      // 860 tests pass either way; only the measurement moved.
      thresholds: {
        statements: 67,
        branches: 56,
        functions: 60,
        lines: 68,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
