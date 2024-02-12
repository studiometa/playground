import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { PartialDeep } from 'type-fest';
import type { Preset } from '@studiometa/webpack-config';
import { prototyping } from '@studiometa/webpack-config-preset-prototyping';
import { isDefined } from '@studiometa/js-toolkit/utils';
import { htmlWebpackScriptTypeModulePreset } from './html-webpack-script-type-module.js';
import { monacoPreset } from './monaco.js';
import { productionBuildPreset } from './production-build.js';

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

export interface PlaygroundPresetOptions {
  head: {
    title: string;
    description: string;
    link: HTMLLinkElementAttributes[];
    meta: HTMLMetaElementAttributes[];
  };
  html_attr: any;
  body_attr: any;
  header: {
    title: string;
  };
  defaults: {
    html: string;
    style: string;
    script: string;
  },
  tailwindcss: boolean;
  syncColorScheme: boolean;
}

/**
 * Preset to build the playground.
 */
export function playgroundPreset(options?: PartialDeep<PlaygroundPresetOptions>): Preset {
  return {
    name: 'playground-preset',
    async handler(config, context) {
      const { handler: prototypingHandler } = prototyping({
        twig: {
          data: options,
          namespaces: {
            playground: resolve(import.meta.dirname, '../../front/templates/'),
          },
        },
      });
      await prototypingHandler(config, context);

      await context.extendWebpack(config, (webpackConfig) => {
        webpackConfig.cache = {
          ...webpackConfig.cache,
          buildDependencies: {
            // @ts-ignore
            config: [import.meta.filename, config.PATH],
          },
        };

        if (!isDefined(webpackConfig.entry['js/app'])) {
          webpackConfig.entry['js/app'] =
            '@studiometa/playground/dist/front/js/app.js';
        }

        if (!isDefined(webpackConfig.entry['css/app'])) {
          webpackConfig.entry['css/app'] =
            '@studiometa/playground/dist/front/css/app.css';
        }
      });

      const { handler: scriptTypeModuleHandler } =
        htmlWebpackScriptTypeModulePreset();
      await scriptTypeModuleHandler(config, context);

      await monacoPreset().handler(config, context);

      if (context.isDev) {
        productionBuildPreset().handler(config, context);
      }
    },
  };
}
