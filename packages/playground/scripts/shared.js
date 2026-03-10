import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import glob from 'fast-glob';
import esbuild from 'esbuild-wasm';

const root = resolve(import.meta.dirname, '..');

/**
 * Get options.
 * @returns {object}
 */
function getOptions() {
  // Read the installed modern-monaco version to inline it at build time.
  // Use import.meta.resolve to locate the package in (possibly hoisted) node_modules.
  const modernMonacoEntry = new URL(import.meta.resolve('modern-monaco'));
  const modernMonacoPkgPath = resolve(modernMonacoEntry.pathname, '../../package.json');
  const modernMonacoPkg = JSON.parse(readFileSync(modernMonacoPkgPath, 'utf-8'));
  const modernMonacoVersion = modernMonacoPkg.version;

  return {
    entryPoints: glob.globSync(
      ['src/**/*.ts', 'src/**/*.twig', 'src/**/*.json', '!src/**/*.test.ts'],
      {
        cwd: root,
      },
    ),
    write: true,
    outdir: resolve(root, 'dist'),
    target: 'esnext',
    format: 'esm',
    sourcemap: true,
    define: {
      __MODERN_MONACO_VERSION__: JSON.stringify(modernMonacoVersion),
    },
    loader: {
      '.twig': 'copy',
      '.json': 'copy',
    },
  };
}

/**
 * Watch and rebuild.
 * @returns {Promise<void>}
 */
export async function watch() {
  const ctx = await esbuild.context({
    ...getOptions(),
    plugins: [
      {
        name: 'watch',
        setup(builder) {
          let start = performance.now();
          builder.onStart(() => {
            console.log('Building...');
            start = performance.now();
          });
          builder.onEnd(({ errors, warnings }) => {
            for (const error of errors) {
              console.error(error);
            }

            for (const warning of warnings) {
              console.log(warning);
            }

            const duration = (performance.now() - start).toFixed(2);
            console.log(`Done building in ${duration}ms!`);
          });
        },
      },
    ],
  });

  await ctx.watch();
  console.log('Watching...');
}

/**
 * Build.
 * @returns {Promise<void>}
 */
export async function build() {
  const start = performance.now();

  console.log(`Building...`);
  const { errors, warnings } = await esbuild.build(getOptions());

  for (const error of errors) {
    console.error(error);
  }

  for (const warning of warnings) {
    console.log(warning);
  }

  const duration = (performance.now() - start).toFixed(2);
  console.log(`Done building in ${duration}ms!`);
}
