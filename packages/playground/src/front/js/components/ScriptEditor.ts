import { AutoTypings, LocalStorageCache, type SourceResolver } from 'monaco-editor-auto-typings';
import { withoutLeadingSlash, withoutTrailingSlash } from '@studiometa/js-toolkit/utils';
import { getScript, setScript } from '../store/index.js';
import Editor from './Editor.js';

class CustomSourceResolver implements SourceResolver {
  #importMap: Record<string, string>;

  constructor({ importMap = {} }: { importMap: Record<string, string> }) {
    this.#importMap = importMap;
  }

  async resolvePackageJson(
    name: string,
    version: string = '',
    path: string = '',
  ): Promise<string | undefined> {
    const { name: moduleName, version: moduleVersion } = this.#normalizeParams(name, version, path);
    const url = this.#getUrlForPackage(moduleName, moduleVersion, 'package.json');

    console.log('resolvePackageJson', url, { moduleName, moduleVersion });
    let result = await fetch(url)
      .then((r) => r.text())
      .catch(() => '{}');

    try {
      JSON.parse(result);
    } catch (e) {
      result = '{}';
    }

    return result;
  }

  resolveSourceFile(
    name: string,
    version: string | undefined,
    path: string,
  ): Promise<string | undefined> {
    const {
      name: moduleName,
      version: moduleVersion,
      path: modulePath,
    } = this.#normalizeParams(name, version, path);
    let url = this.#getUrlForPackage(moduleName, moduleVersion, modulePath);

    console.log('resolveSourceFile', url, { moduleName, moduleVersion, modulePath });
    return fetch(url)
      .then((r) => r.text())
      .catch(() => '');
  }

  #normalizeParams(
    name: string,
    version: string,
    path: string = '',
  ): { name: string; version: string; path: string } {
    const url = new URL(this.#getUrlForPackage(name, version, path), window.location.href);
    let moduleName = name;
    let moduleVersion = version;
    let modulePath = path;

    if (name === 'http:' || name === 'https:') {
      if (url.pathname.startsWith('/@')) {
        [, moduleName, moduleVersion = ''] = url.pathname.split('@');
        moduleName = `@${moduleName}`;
      } else {

        [moduleName, moduleVersion = ''] = url.pathname.split('@');

      }

      moduleName = withoutLeadingSlash(withoutTrailingSlash(moduleName));
      let modulePathParts = [];
      [moduleVersion = '', ...modulePathParts] = moduleVersion.split('/');
      modulePath = modulePathParts.join('/');
      moduleVersion = moduleVersion ? withoutLeadingSlash(withoutTrailingSlash(moduleVersion)) : '';
    }

    return {
      name: moduleName,
      version: moduleVersion,
      path: modulePath,
    };
  }

  #getUrlForPackage(name: string, version: string, path: string = ''): string {
    if (name === 'https:' || name === 'http:') {
      return `${name}/${path}`;
    }

    let url = `https://esm.sh/${name}${version ? `@${version}` : ''}/${path}`;

    for (const [key, value] of Object.entries(this.#importMap)) {
      if (name.startsWith(key)) {
        url = `${name.replace(key, value)}${path ? `/${path}` : ''}`;
        break;
      }
    }

    console.log('#getUrlForPackage', { name, version, path }, { url });
    return url;
  }
}

export default class ScriptEditor extends Editor {
  /**
   * Config.
   */
  static config = {
    ...Editor.config,
    options: {
      importMap: Object,
    },
  };

  /**
   * Autotyping instance.
   */
  autoTypings: AutoTypings;

  get language(): string {
    return 'typescript';
  }

  async getInitialValue() {
    return getScript();
  }

  onContentChange({ args: [value] }) {
    setScript(value);
  }

  async mounted() {
    await super.mounted();
    this.autoTypings = await AutoTypings.create(this.editor, {
      // sourceCache: new LocalStorageCache(),
      sourceResolver: new CustomSourceResolver({ importMap: this.$options.importMap }),
      monaco: this.monaco,
    });
  }

  destroyed() {
    this.autoTypings.dispose();
  }
}
