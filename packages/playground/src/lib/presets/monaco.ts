import type { Preset } from '@studiometa/webpack-config';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

/**
 * Preset to load Monaco editor helpers: loader, plugin, etc.
 */
export function monacoPreset(): Preset {
  return {
    name: 'monaco',
    handler(config, { extendWebpack }) {
      return extendWebpack(config, (webpackConfig) => {
        // Make sure the monaco editor ESM files are treated as ESM
        webpackConfig.module.rules.push({
          test: /monaco-editor\/esm\/vs\/.*\.js$/,
          type: 'javascript/esm',
        });

        webpackConfig.plugins.push(
          new MonacoWebpackPlugin({
            filename: '[name].worker.[contenthash].js',
          })
        );
      });
    },
  };
}
