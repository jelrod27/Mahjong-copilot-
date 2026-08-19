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
      include: ['engine/**', 'models/**', 'presentation/**', 'store/reducers/**', 'components/**'],
      // A floor, not a target. Set just under the measured baseline so the
      // number can only be pushed up; raise it as coverage improves.
      thresholds: {
        statements: 58,
        branches: 80,
        functions: 83,
        lines: 58,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
