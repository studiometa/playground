import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import plugin from 'tailwindcss/plugin.js';

function resolveGlob(glob) {
  const root = dirname(require.resolve('@studiometa/playground'));
  return resolve( root, 'front', glob);
}

export function tailwindConfig() {
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
      }),
    ],
  };
}
