import { resolve } from 'node:path';
import glob from 'fast-glob';
import esbuild from 'esbuild';

const root = resolve(import.meta.dirname, '..');

function getOptions() {
  return {
    entryPoints: glob.globSync(
      ['src/**/*.ts', 'src/**/*.css', 'src/**/*.twig', 'src/**/*.json'],
      { cwd: root }
    ),
    write: true,
    outdir: resolve(root, 'dist'),
    target: 'esnext',
    format: 'esm',
    sourcemap: true,
    loader: {
      '.twig': 'copy',
      '.json': 'copy',
    },
  };
}

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
