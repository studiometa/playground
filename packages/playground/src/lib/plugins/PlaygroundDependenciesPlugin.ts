import { resolve, relative, dirname, join, posix } from 'node:path';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import type { Compiler } from 'webpack';
import glob from 'fast-glob';
import type { ResolvedDependency } from '../utils/resolve-dependencies.js';

/**
 * Webpack plugin that processes self-hosted playground dependencies.
 *
 * Handles three strategies:
 * - **copy**: copies `.js` + `.d.ts` files from a resolved npm package
 * - **bundle**: bundles an npm package into a single ESM file with esbuild
 * - **typescript**: transpiles `.ts` → `.js` with esbuild, generates `.d.ts` with tsgo,
 *   and rewrites `.js` → `.d.ts` import paths in the output
 */
export class PlaygroundDependenciesPlugin {
  dependencies: ResolvedDependency[];
  configDir: string;

  constructor(dependencies: ResolvedDependency[], configDir: string) {
    this.dependencies = dependencies;
    this.configDir = configDir;
  }

  apply(compiler: Compiler) {
    const pluginName = 'PlaygroundDependenciesPlugin';

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          // Run before optimization so other plugins can see our assets
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async (_assets, callback) => {
          try {
            for (const dep of this.dependencies) {
              switch (dep.type) {
                case 'copy':
                  this.processCopy(compilation, dep);
                  break;
                case 'bundle':
                  await this.processBundle(compilation, dep);
                  break;
                case 'typescript':
                  await this.processTypescript(compilation, dep);
                  break;
              }
            }
            callback();
          } catch (err) {
            callback(err as Error);
          }
        },
      );
    });
  }

  /**
   * Copy `.js` and `.d.ts` files from a resolved npm package into the output.
   */
  private processCopy(compilation: any, dep: ResolvedDependency) {
    const require = createRequire(resolve(this.configDir, 'package.json'));
    const pkgJsonPath = require.resolve(`${dep.source}/package.json`);
    const pkgDir = dirname(pkgJsonPath);

    // Find all .js and .d.ts files
    const files = glob.globSync(['**/*.js', '**/*.d.ts'], {
      cwd: pkgDir,
      ignore: ['node_modules/**'],
    });

    const outputBase = `static/deps/${dep.specifier}`;

    for (const file of files) {
      const filePath = resolve(pkgDir, file);
      const content = readFileSync(filePath);
      const assetPath = posix.join(outputBase, file);
      compilation.emitAsset(assetPath, new compilation.compiler.webpack.sources.RawSource(content));
    }
  }

  /**
   * Bundle an npm package into a single ESM file with esbuild.
   */
  private async processBundle(compilation: any, dep: ResolvedDependency) {
    const esbuild = await import('esbuild');
    const result = await esbuild.build({
      entryPoints: [dep.source!],
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2020',
      platform: 'browser',
      // Resolve from the consumer's config directory
      absWorkingDir: this.configDir,
    });

    const outputFile = result.outputFiles[0];
    if (outputFile) {
      const assetPath = `static/deps/${dep.specifier}.js`;
      compilation.emitAsset(
        assetPath,
        new compilation.compiler.webpack.sources.RawSource(outputFile.contents),
      );
    }
  }

  /**
   * Transpile TypeScript sources → `.js` with esbuild, generate `.d.ts` with tsgo,
   * and rewrite relative `.js` imports to `.d.ts` in the declaration output.
   */
  private async processTypescript(compilation: any, dep: ResolvedDependency) {
    const sourcePattern = dep.source!;
    const isGlob = sourcePattern.includes('*');
    const resolvedPattern = resolve(this.configDir, sourcePattern);

    // Find source files
    const sourceFiles = isGlob ? glob.globSync(resolvedPattern) : [resolvedPattern];

    if (sourceFiles.length === 0) {
      console.warn(
        `[playground] No files found for dependency "${dep.specifier}" with source "${dep.source}"`,
      );
      return;
    }

    // Determine the common root for relative path computation
    const commonRoot = isGlob ? this.findCommonRoot(sourceFiles) : dirname(sourceFiles[0]);

    const outputBase = `static/deps/${dep.specifier}`;

    // Step 1: Transpile .ts → .js with esbuild
    const esbuild = await import('esbuild');
    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8');
      const result = await esbuild.transform(content, {
        loader: 'ts',
        format: 'esm',
        target: 'es2020',
        sourcefile: file,
      });

      const relPath = relative(commonRoot, file).replace(/\.ts$/, '.js');
      const assetPath = posix.join(outputBase, relPath);
      compilation.emitAsset(
        assetPath,
        new compilation.compiler.webpack.sources.RawSource(result.code),
      );
    }

    // Step 2: Generate .d.ts with tsgo
    this.generateDeclarations(compilation, dep, sourceFiles, commonRoot, outputBase);
  }

  /**
   * Run tsgo to generate `.d.ts` files, then rewrite `.js` → `.d.ts` import paths.
   */
  private generateDeclarations(
    compilation: any,
    dep: ResolvedDependency,
    sourceFiles: string[],
    commonRoot: string,
    outputBase: string,
  ) {
    // Find tsgo binary
    const tsgoPath = this.findTsgoBinary();
    if (!tsgoPath) {
      console.warn(
        '[playground] @typescript/native-preview not found, skipping .d.ts generation ' +
          `for "${dep.specifier}". Install it as a devDependency to enable type generation.`,
      );
      return;
    }

    // Use a temp directory for tsgo output
    const tmpDir = mkdtempSync(join(tmpdir(), 'playground-dts-'));

    try {
      const args = [
        '--declaration',
        '--emitDeclarationOnly',
        '--noCheck',
        '--outDir',
        tmpDir,
        '--rootDir',
        commonRoot,
        // Minimal compiler options for declaration emit
        '--target',
        'ESNext',
        '--module',
        'ESNext',
        '--moduleResolution',
        'bundler',
        '--skipLibCheck',
        ...sourceFiles,
      ];

      execFileSync(tsgoPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30_000,
      });

      // Read generated .d.ts files and emit them as webpack assets
      const dtsFiles = glob.globSync('**/*.d.ts', { cwd: tmpDir });
      for (const dtsFile of dtsFiles) {
        const dtsContent = readFileSync(resolve(tmpDir, dtsFile), 'utf-8');
        // Rewrite relative .js imports to .d.ts so modern-monaco's TypeScript
        // worker can resolve types when fetching over HTTP
        const rewritten = this.rewriteDtsImports(dtsContent);
        const assetPath = posix.join(outputBase, dtsFile);
        compilation.emitAsset(
          assetPath,
          new compilation.compiler.webpack.sources.RawSource(rewritten),
        );
      }
    } catch (err) {
      console.warn(
        `[playground] tsgo declaration generation failed for "${dep.specifier}":`,
        (err as Error).message,
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Rewrite relative `.js` imports to `.d.ts` in declaration files.
   * modern-monaco's TypeScript worker resolves types by fetching over HTTP,
   * so `from './foo.js'` must become `from './foo.d.ts'` in `.d.ts` files.
   */
  private rewriteDtsImports(content: string): string {
    // Match: from './path.js' or from "../path.js"
    return content.replace(/(from\s+['"])(\.\.?\/[^'"]*?)\.js(['"])/g, '$1$2.d.ts$3');
  }

  /**
   * Find the tsgo native binary from @typescript/native-preview.
   * Resolves the platform-specific native binary directly for best performance,
   * falling back to the bin wrapper script.
   */
  private findTsgoBinary(): string | null {
    const require = createRequire(resolve(this.configDir, 'package.json'));

    // Try to resolve the platform-specific native binary directly
    const platformPkg = `@typescript/native-preview-${process.platform}-${process.arch}`;
    try {
      const platformPkgJson = require.resolve(`${platformPkg}/package.json`);
      const nativeBin = resolve(dirname(platformPkgJson), 'lib', 'tsgo');
      if (existsSync(nativeBin)) {
        return nativeBin;
      }
    } catch {
      // platform package not found
    }

    // Fallback: use the bin wrapper (requires node to execute)
    try {
      const nativePreviewPkg = require.resolve('@typescript/native-preview/package.json');
      const binPath = resolve(dirname(nativePreviewPkg), 'bin', 'tsgo.js');
      if (existsSync(binPath)) {
        return binPath;
      }
    } catch {
      // not installed
    }

    // Last resort: try node_modules/.bin
    const binCandidate = resolve(this.configDir, 'node_modules', '.bin', 'tsgo');
    if (existsSync(binCandidate)) {
      return binCandidate;
    }

    return null;
  }

  /**
   * Find the common root directory of a list of file paths.
   */
  private findCommonRoot(files: string[]): string {
    if (files.length === 0) return '';
    if (files.length === 1) return dirname(files[0]);

    const parts = files.map((f) => f.split('/'));
    const common: string[] = [];

    for (let i = 0; i < parts[0].length; i++) {
      const segment = parts[0][i];
      if (parts.every((p) => p[i] === segment)) {
        common.push(segment);
      } else {
        break;
      }
    }

    return common.join('/') || '/';
  }
}
