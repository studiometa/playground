import { AutoTypings, LocalStorageCache, type SourceResolver } from 'monaco-editor-auto-typings';
import { getScript, setScript } from '../store/index.js';
import Editor from './Editor.js';

class CustomSourceResolver implements SourceResolver {
  #importMap: Record<string, string>;

  constructor({ importMap = {} }: { importMap: Record<string, string> }) {
    this.#importMap = importMap;
  }

  async resolvePackageJson(
    name: string,
    version: string | undefined,
  ): Promise<string | undefined> {
    const url = this.#getUrlForPackage(name, version, 'package.json');

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
    let url = this.#getUrlForPackage(name, version, path)

    return fetch(url)
      .then((r) => r.text())
      .catch(() => '');
  }

  #getUrlForPackage(name: string, version: string, path: string = ''): string {
    let url = `https://esm.sh/${name}@${version}/${path}`;

    for (const [key, value] of Object.entries(this.#importMap)) {
      if (name.startsWith(key)) {
        url = `${name.replace(key, value)}${path ? `/${path}` : ''}`;
        break;
      }
    }

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
