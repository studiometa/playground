import { existsSync, readFileSync } from 'node:fs';
import type { Compiler } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

export interface PlaygroundLoadersOptions {
  /**
   * Define the path to a JavaScript file exporting a function to
   * transform the HTML editor's content.
   */
  html: string;
  style: string;
  script: string;
}

export class PlaygroundLoadersPlugin {
  loaderNames = ['html', 'style', 'script'];

  loaders?: Partial<PlaygroundLoadersOptions>;

  constructor(loaders?: Partial<PlaygroundLoadersOptions>) {
    this.loaders = loaders;
  }

  apply(compiler: Compiler) {
    const virtualModulesConfig = {};
    const defaultLoader =
      'export default async function loader(value) { return value };';

    for (const loaderName of this.loaderNames) {
      const loaderContent =
        this.loaders && this.loaders[loaderName] && existsSync(this.loaders[loaderName])
          ? readFileSync(this.loaders[loaderName])
          : defaultLoader;
      virtualModulesConfig[
        `node_modules/@studiometa/playground/${loaderName}-loader.js`
      ] = loaderContent;
    }

    const virtualModules = new VirtualModulesPlugin(virtualModulesConfig);
    virtualModules.apply(compiler);
  }
}
