import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Preset } from '@studiometa/webpack-config';
import { prototyping } from '@studiometa/webpack-config-preset-prototyping';
import { isDefined } from '@studiometa/js-toolkit/utils';
import { htmlWebpackScriptTypeModulePreset } from './html-webpack-script-type-module.js';
import { monacoPreset } from './monaco.js';
import { productionBuildPreset } from './production-build.js';

/**
 * Preset to build the playground.
 */
export function playgroundPreset(): Preset {
  return {
    name: 'playground-preset',
    async handler(config, context) {
      const { handler: prototypingHandler } = prototyping({
        twig: {
          namespaces: {
            'playground': resolve(
              import.meta.dirname,
              '../../front/templates/pages/'
            ),
          },
        },
      });
      await prototypingHandler(config, context);

      await context.extendWebpack(config, (webpackConfig) => {
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
