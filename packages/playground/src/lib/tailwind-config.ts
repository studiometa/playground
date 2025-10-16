import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from 'tailwindcss/plugin.js';
import type { Config } from 'tailwindcss';

function resolveGlob(glob) {
  const root = dirname(fileURLToPath(import.meta.resolve('@studiometa/playground')));
  return resolve(root, 'front', glob);
}

export function tailwindConfig(): Config {
  return {
    darkMode: 'class',
    content: [
      resolveGlob('js/**/*.ts'),
      resolveGlob('templates/**/*.twig'),
      resolveGlob('templates/**/*.yml'),
      'tailwind.safelist.txt',
    ],
    theme: {
      extend: {
        keyframes: {
          loader: {
            '0%': { transform: 'rotate(0)' },
            '100%': { transform: 'rotate(720deg)' },
          },
        },
        animation: {
          loader: 'loader 1s ease-in-out infinite',
        },
      },
    },
    plugins: [
      plugin(({ addVariant }) => {
        addVariant('has-header', 'html.has-header &');
        addVariant('is-resizing', 'html.is-resizing &');
      }),
    ],
  } satisfies Config;
}
