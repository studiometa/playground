import { resolve, join } from 'node:path';
import plugin from 'tailwindcss/plugin.js';

function resolveGlob(glob) {
  return resolve(import.meta.dirname, 'front', glob);
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
