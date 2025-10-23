import {
  AutoTypings,
  LocalStorageCache,
  JsDelivrSourceResolver,
  type SourceResolver,
} from 'monaco-editor-auto-typings';
import { getScript, setScript } from '../store/index.js';
import Editor from './Editor.js';

class CustomSourceResolver extends JsDelivrSourceResolver implements SourceResolver {
  #importMap: Record<string, string>;

  constructor({ importMap = {} }: { importMap: Record<string, string> }) {
    super();
    this.#importMap = importMap;
  }

  resolvePackageJson(
    packageName: string,
    version: string | undefined,
    subPath: string | undefined,
  ): Promise<string | undefined> {
    console.log('resolvePackageJson', ...arguments);
    return super.resolvePackageJson(packageName, version, subPath);
  }

  resolveSourceFile(
    packageName: string,
    version: string | undefined,
    path: string,
  ): Promise<string | undefined> {
    console.log('resolveSourceFile', ...arguments);
    for (const [key, value] of Object.entries(this.#importMap)) {
      if (packageName.startsWith(key)) {
        const url = packageName.replace(key, value) + '/' + path;
        return this.resolveFile(url);
      }
    }
    return super.resolveSourceFile(packageName, version, path);
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
