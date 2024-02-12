import type { Preset } from '@studiometa/webpack-config';

/**
 * Preset to configure the production build of the playground.
 */
export function productionBuildPreset(): Preset {
  return {
    name: 'production-build',
    handler(config, { isDev, extendWebpack }) {
      return extendWebpack(config, (webpackConfig) => {
        if (isDev) {
          return;
        }

        webpackConfig.output.scriptType = 'module';
        webpackConfig.output.iife = false;
        webpackConfig.output.module = true;
        webpackConfig.experiments.outputModule = true;
      });
    },
  };
}
