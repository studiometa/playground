import { resolve } from 'node:path';
import esbuild from 'esbuild-wasm';

const root = resolve(import.meta.dirname, '..');

const start = performance.now();
console.log('Building...');

const { errors, warnings } = await esbuild.build({
  entryPoints: [
    resolve(root, 'src/index.ts'),
    resolve(root, 'src/element.ts'),
  ],
  write: true,
  outdir: resolve(root, 'dist'),
  target: 'es2022',
  format: 'esm',
  sourcemap: true,
  bundle: true,
});

for (const error of errors) {
  console.error(error);
}

for (const warning of warnings) {
  console.log(warning);
}

const duration = (performance.now() - start).toFixed(2);
console.log(`Done building in ${duration}ms!`);
