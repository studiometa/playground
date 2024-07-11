import { js, prettier } from '@studiometa/eslint-config';
import { globals } from '@studiometa/eslint-config/utils';

export default [
  ...js,
  ...prettier,
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
];
