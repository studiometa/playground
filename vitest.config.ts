import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.d.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'playground',
          include: ['packages/playground/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'playground-preview',
          include: ['packages/playground-preview/src/**/*.test.ts'],
          environment: 'happy-dom',
        },
      },
    ],
  },
});
