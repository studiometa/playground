import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { debounce } from '@studiometa/js-toolkit/utils';
import type { InitOptions } from 'modern-monaco';
import { getMonaco, registerLspOptions, DARK_THEME, LIGHT_THEME } from '../utils/monaco.js';
import type { MonacoNamespace } from '../utils/monaco.js';
import { themeIsDark, watchTheme } from '../store/index.js';

export type EditorProps = BaseProps & {
  $emits: {
    'content-change': { value: string };
  };
};

type MonacoEditor = ReturnType<MonacoNamespace['editor']['create']>;

/**
 * Editor class.
 */
export default class Editor extends Base<EditorProps> {
  /**
   * Config.
   */
  static config: BaseConfig = {
    name: 'Editor',
  };

  /**
   * Editor instance.
   */
  editor: MonacoEditor;

  /**
   * Monaco namespace.
   */
  #monaco: MonacoNamespace;

  /**
   * Monaco namespace accessor.
   */
  get monaco() {
    return this.#monaco;
  }

  /**
   * Language of the editor.
   */
  get language() {
    return '';
  }

  /**
   * Virtual filename for the editor model.
   * Provides a `file://` URI so that LSP workers (especially TypeScript)
   * can resolve the source. Subclasses should override this.
   */
  get filename() {
    return '';
  }

  /**
   * Get additional LSP options for modern-monaco.
   * Subclasses can override this to provide language-specific LSP config.
   */
  protected getLspOptions(): InitOptions['lsp'] {
    return {};
  }

  async mounted() {
    const { addJsAutocompletion } = await import('../utils/js/index.js');

    // Register LSP options before getMonaco() resolves.
    // The singleton waits one microtask, so all editors that mount
    // in the same tick will have their options merged.
    registerLspOptions(this.getLspOptions());

    const isDark = await themeIsDark();

    this.#monaco = await getMonaco({
      defaultTheme: isDark ? DARK_THEME : LIGHT_THEME,
      themes: [DARK_THEME, LIGHT_THEME],
    });

    const value = await this.getInitialValue();

    // Create a model with a file:// URI so LSP workers can resolve the source.
    const uri = this.filename ? this.#monaco.Uri.file(this.filename) : undefined;
    const model = this.#monaco.editor.createModel(value, this.language, uri);

    this.editor = this.#monaco.editor.create(this.$el, {
      model,
      minimap: { enabled: false },
      automaticLayout: true,
      fontLigatures: true,
      fontFamily: 'JetBrains Mono',
      fontSize: 14,
      tabSize: 2,
      theme: isDark ? DARK_THEME : LIGHT_THEME,
    });

    addJsAutocompletion(this.#monaco.languages);

    const unwatchTheme = watchTheme(async () => {
      this.#monaco.editor.setTheme((await themeIsDark()) ? DARK_THEME : LIGHT_THEME);
    });

    this.editor.onDidChangeModelContent(
      debounce(() => {
        this.$emit('content-change', { value: this.editor.getValue() });
      }, 500),
    );

    // v4 replaces `destroyed()` with the cleanup `mounted()` returns. The theme
    // subscription and the Monaco instance both belong to this mount cycle.
    return () => {
      unwatchTheme();
      this.editor?.dispose();
      this.editor = undefined;
      model.dispose();
    };
  }

  async getInitialValue() {
    return '';
  }
}
