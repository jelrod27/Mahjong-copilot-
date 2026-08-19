import { defineConfig } from 'vitest/config';
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
