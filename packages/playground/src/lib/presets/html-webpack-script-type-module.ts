import type { Preset } from '@studiometa/webpack-config';

/**
 * Inline source preset.
 */
export function htmlWebpackScriptTypeModulePreset(): Preset {
  return {
    name: 'html-webpack-script-type-module',
    handler(config, { extendWebpack }) {
      return extendWebpack(config, (webpackConfig) => {
        webpackConfig.plugins = webpackConfig.plugins.map((plugin) => {
          if (plugin.constructor.name === 'HtmlWebpackPlugin') {
            plugin.userOptions.scriptLoading = 'module';
          }
          return plugin;
        });
      });
    },
  };
}
