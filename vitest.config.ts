import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

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
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
