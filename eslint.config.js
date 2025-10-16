import { defineConfig, js, ts, prettier, globals } from '@studiometa/eslint-config';

export default defineConfig(
  js,
  ts,
  prettier,
  {
    files: ['packages/playground/scripts/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ['packages/*/dist/*', 'node_modules/*'],
  },
);
