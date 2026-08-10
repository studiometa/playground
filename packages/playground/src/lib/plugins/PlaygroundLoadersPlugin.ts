import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
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
    const defaultLoader = 'export default async function loader(value) { return value };';

    // The loaders are imported through the bare `@studiometa/playground/<name>-loader.js`
    // specifiers, which webpack resolves via the package's `"./*": "./*"` exports entry to
    // this package's real on-disk root. Since enhanced-resolve >= 5.21 (webpack/enhanced-resolve#399),
    // a matched exports target that does not exist on disk is a hard error instead of falling back
    // to legacy resolution. So the virtual files MUST be written at the package's resolved root; a
    // path relative to the compiler context lands under the consumer app and no longer resolves.
    const require = createRequire(import.meta.url);
    const packageRoot = realpathSync(
      dirname(require.resolve('@studiometa/playground/package.json')),
    );

    for (const loaderName of this.loaderNames) {
      const loaderContent =
        this.loaders && this.loaders[loaderName] && existsSync(this.loaders[loaderName])
          ? readFileSync(this.loaders[loaderName])
          : defaultLoader;
      virtualModulesConfig[`${packageRoot}/${loaderName}-loader.js`] = loaderContent;
    }

    const virtualModules = new VirtualModulesPlugin(virtualModulesConfig);
    virtualModules.apply(compiler);
  }
}
