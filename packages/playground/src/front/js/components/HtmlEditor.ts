import { getHtml, setHtml } from '../store/index.js';
import { registerLang, registerHtmlLspAlias } from '../utils/monaco.js';
import Editor from './Editor.js';

/**
 * Map of known file extensions for HTML-superset template languages.
 * Used as fallback when no explicit filename is provided.
 */
const LANG_EXTENSIONS: Record<string, string> = {
  html: 'html',
  twig: 'twig',
  liquid: 'liquid',
  blade: 'blade.php',
  handlebars: 'hbs',
  'jinja-html': 'jinja',
  edge: 'edge',
  pug: 'pug',
};

export default class HtmlEditor extends Editor {
  /**
   * Config.
   */
  static config = {
    ...Editor.config,
    options: {
      /**
       * The language ID for the editor (e.g. 'html', 'twig', 'liquid').
       * Must match a Shiki grammar name from tm-grammars.
       * Default: 'html'.
       */
      language: { type: String, default: 'html' },
      /**
       * Virtual filename for the editor model (e.g. 'index.twig').
       * If not set, inferred from the language ID.
       */
      filename: { type: String, default: '' },
    },
  };

  get language(): string {
    return (this.$options.language as string) || 'html';
  }

  get filename(): string {
    const explicit = this.$options.filename as string;
    if (explicit) return explicit;

    const ext = LANG_EXTENSIONS[this.language] || this.language;
    return `index.${ext}`;
  }

  async mounted() {
    const lang = this.language;

    // For non-HTML template languages, register the Shiki grammar
    // and alias the HTML LSP so completions/emmet still work.
    if (lang !== 'html') {
      registerLang(lang);
      registerHtmlLspAlias(lang);
    }

    await super.mounted();

    // Register language-specific snippets after Monaco is ready.
    if (lang === 'twig') {
      const { addTwigAutocompletion } = await import('../utils/twig/index.js');
      addTwigAutocompletion(this.monaco.languages);
    }
  }

  async getInitialValue() {
    return getHtml();
  }

  onContentChange({ args: [value] }) {
    setHtml(value);
  }
}
