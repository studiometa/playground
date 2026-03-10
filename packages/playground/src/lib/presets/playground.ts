import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PartialDeep } from 'type-fest';
import type { Preset } from '@studiometa/webpack-config';
import { prototyping } from '@studiometa/webpack-config-preset-prototyping';
import { isDefined } from '@studiometa/js-toolkit/utils';
import { htmlWebpackScriptTypeModulePreset } from './html-webpack-script-type-module.js';
import { productionBuildPreset } from './production-build.js';
import { PlaygroundLoadersPlugin } from '../plugins/PlaygroundLoadersPlugin.js';
import type { PlaygroundLoadersOptions } from '../plugins/PlaygroundLoadersPlugin.js';
import { PlaygroundDependenciesPlugin } from '../plugins/PlaygroundDependenciesPlugin.js';
import { resolveDependencies } from '../utils/resolve-dependencies.js';
import type { DependencyConfig } from '../utils/resolve-dependencies.js';

export interface HTMLElementAttributes {
  [name: string]: unknown;
}

export interface HTMLMetaElementAttributes extends HTMLElementAttributes {
  content?: string;
  httpEquiv?: string;
  media?: string;
  name?: string;
  scheme?: string;
}

export interface HTMLLinkElementAttributes extends HTMLElementAttributes {
  as?: string;
  crossorigin?: string | null;
  disabled?: boolean;
  fetchpriority?: 'high' | 'low' | 'auto';
  href?: string;
  hreflang?: string;
  imagesizes?: string;
  imagesrcset?: string;
  integrity?: string;
  media?: string;
  referrerpolicy?: string;
  rel?: string;
  sizes?: string;
  title?: string;
  type?: string;
}

export interface PlaygroundHtmlLanguage {
  /**
   * Language ID matching a Shiki grammar name from tm-grammars.
   * Available values include: 'html', 'twig', 'liquid', 'blade',
   * 'handlebars', 'jinja-html', 'edge', 'pug'.
   * @default 'html'
   */
  id: string;
  /**
   * Virtual filename for the editor model (e.g. 'index.twig').
   * If omitted, inferred from the language ID.
   */
  filename?: string;
}

export interface PlaygroundPresetOptions {
  head: {
    title: string;
    description: string;
    link: HTMLLinkElementAttributes[];
    meta: HTMLMetaElementAttributes[];
  };
  header: {
    title: string;
  };
  defaults: {
    html: string;
    style: string;
    script: string;
  };
  loaders: PlaygroundLoadersOptions;
  /**
   * Configure the HTML editor language. Allows using HTML-superset
   * template languages like Twig, Liquid, Blade, etc.
   * When set to a non-HTML language, the editor will:
   * - Load the corresponding Shiki grammar for syntax highlighting
   * - Alias the HTML LSP provider for tag/attribute completions and emmet
   * - Register built-in snippets when available (e.g. for Twig)
   * @example { id: 'twig' }
   * @example { id: 'liquid', filename: 'template.liquid' }
   */
  htmlLanguage: PlaygroundHtmlLanguage;
  tailwindcss: boolean;
  syncColorScheme: boolean;
  html_attr: Record<string, unknown>;
  body_attr: Record<string, unknown>;
  /**
   * Declarative dependencies available in the script editor.
   * Automatically generates import map entries and bundles self-hosted
   * dependencies into `.js` + `.d.ts` files with tsdown.
   *
   * - Plain string → resolved via [esm.sh](https://esm.sh) (zero-config)
   * - Object with `source` → bundled with tsdown into `.js` + `.d.ts`
   *
   * @example
   * dependencies: [
   *   "deepmerge",
   *   { specifier: "morphdom", source: "morphdom" },
   *   { specifier: "@studiometa/ui", source: "../ui/**\/*.ts", entry: "../ui/index.ts" },
   * ]
   *
   * @see https://github.com/studiometa/playground/issues/48
   */
  dependencies: DependencyConfig[];
  /**
   * Manual import map entries. Merged with entries generated from `dependencies`.
   * Relative paths are resolved to absolute URLs at runtime.
   * @deprecated Prefer using `dependencies` for new projects.
   */
  importMap: Record<string, string>;
  /**
   * Public path prefix for self-hosted dependency URLs and `_headers` paths.
   * Useful when the playground is deployed under a sub-path (e.g. `/play/`).
   *
   * When omitted, the plugin will try to infer it from webpack's
   * `output.publicPath` configuration.
   *
   * @example '/play'
   * @see https://github.com/studiometa/playground/issues/54
   */
  publicPath: string;
}

/**
 * Preset to build the playground.
 */
export function playgroundPreset(options?: PartialDeep<PlaygroundPresetOptions>): Preset {
  return {
    name: 'playground-preset',
    async handler(config, context) {
      // Resolve consumer's config directory for dependency resolution
      // @ts-expect-error config.PATH is an internal property
      const configDir = config.PATH ? dirname(config.PATH as string) : process.cwd();

      // Resolve declarative dependencies into an import map + self-hosted metadata
      let mergedImportMap: Record<string, string> = { ...options?.importMap };
      let selfHostedDeps: import('../utils/resolve-dependencies.js').ResolvedDependency[] = [];

      if (options?.dependencies?.length) {
        const packageJsonPath = resolve(configDir, 'package.json');
        const resolved = resolveDependencies(
          options.dependencies,
          packageJsonPath,
          options?.publicPath,
        );
        // Dependencies go first, manual importMap entries take precedence
        mergedImportMap = { ...resolved.importMap, ...mergedImportMap };
        selfHostedDeps = resolved.selfHosted;
      }

      const twigData = {
        ...options,
        importMap: mergedImportMap,
      };

      const { handler: prototypingHandler } = prototyping({
        twig: {
          data: twigData,
          namespaces: {
            playground: resolve(import.meta.dirname, '../../front/templates/'),
          },
        },
        tailwindcss() {
          return {
            name: 'tailwindcss',
            async handler() {
              // shhhh
            },
          } as Preset;
        },
      });
      await prototypingHandler(config, context);

      await context.extendWebpack(config, (webpackConfig) => {
        webpackConfig.plugins.push(new PlaygroundLoadersPlugin(options.loaders));

        // Add self-hosted dependencies plugin when needed
        if (selfHostedDeps.length > 0) {
          webpackConfig.plugins.push(
            new PlaygroundDependenciesPlugin(selfHostedDeps, configDir, options?.publicPath),
          );
        }

        webpackConfig.cache = {
          ...webpackConfig.cache,
          buildDependencies: {
            // @ts-expect-error config.PATH does not exist on MetaConfig (internal)
            config: [import.meta.filename, config.PATH],
          },
        };

        delete webpackConfig.optimization?.runtimeChunk;

        if (!isDefined(webpackConfig.entry['js/app'])) {
          webpackConfig.entry['js/app'] = '@studiometa/playground/dist/front/js/app.js';
        }

        if (!isDefined(webpackConfig.entry['css/app'])) {
          webpackConfig.entry['css/app'] = '@studiometa/playground/dist/front/css/app.css';
        }
      });

      const { handler: scriptTypeModuleHandler } = htmlWebpackScriptTypeModulePreset();
      await scriptTypeModuleHandler(config, context);

      if (!context.isDev) {
        await productionBuildPreset().handler(config, context);
      }

      await context.extendWebpack(config, (webpackConfig) => {
        webpackConfig.resolve = {
          ...webpackConfig.resolve,
          fallback: {
            path: fileURLToPath(import.meta.resolve('path-browserify')),
          },
        };
      });
    },
  };
}
