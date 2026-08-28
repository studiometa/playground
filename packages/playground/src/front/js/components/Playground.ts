import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps, DelegatedEvent } from '@studiometa/js-toolkit';
import { wait } from '@studiometa/js-toolkit/utils';
import HeaderSwitcher from './HeaderSwitcher.js';
import LayoutReactive from './LayoutReactive.js';
import LayoutSwitcher from './LayoutSwitcher.js';
import ThemeSwitcher from './ThemeSwitcher.js';
import EditorVisibility from './EditorVisibility.js';
import Editors from './Editors.js';
import Iframe from './Iframe.js';
import type Resizable from './Resizable.js';
import { layoutUpdateDOM, themeUpdateDOM, headerUpdateDOM } from '../store/index.js';
import { urlStore } from '../utils/storage/index.js';
import { setDefaults } from '../store/config.js';

layoutUpdateDOM();
themeUpdateDOM();
headerUpdateDOM();

export type PlaygroundProps = BaseProps & {
  $refs: {
    htmlVisibility: HTMLInputElement;
    scriptVisibility: HTMLInputElement;
    styleVisibility: HTMLInputElement;
  };
  $options: {
    html: string;
    style: string;
    script: string;
  };
};

/**
 * The `data-lang` value each visibility checkbox owns.
 */
const LANGS = {
  html: 'text/html',
  style: 'text/css',
  script: 'text/javascript',
} as const;

type EditorKind = keyof typeof LANGS;

export class Playground extends Base<PlaygroundProps> {
  static config: BaseConfig = {
    name: 'Playground',
    refs: ['htmlVisibility', 'scriptVisibility', 'styleVisibility'],
    options: {
      html: String,
      style: String,
      script: String,
    },
    components: {
      LayoutReactive,
      LayoutSwitcher,
      ThemeSwitcher,
      HeaderSwitcher,
      EditorVisibility,
      Editors,
      Iframe,
      Resizable: async () => wait(100).then(() => import('./Resizable.js')),
      HtmlEditor: async () => wait(100).then(() => import('./HtmlEditor.js')),
      ScriptEditor: async () => wait(100).then(() => import('./ScriptEditor.js')),
      StyleEditor: async () => wait(100).then(() => import('./StyleEditor.js')),
      IframeReloader: async () => wait(100).then(() => import('./IframeReloader.js')),
    },
  };

  /**
   * Which editors are visible, by `data-lang`.
   *
   * v3 kept this in the DOM and read it back through `$children`, which was
   * only safe because a parent mounted after its children. v4 gives no such
   * ordering, so the coordinator owns the state and pushes it onto every
   * `EditorVisibility` it sees — the ones already there, and the ones that
   * arrive later.
   */
  #visibility = new Map<string, boolean>([
    [LANGS.html, true],
    [LANGS.style, true],
    [LANGS.script, true],
  ]);

  #editorVisibilities = this.$watchChildren(EditorVisibility, {
    added: (instance) => {
      this.#applyVisibility(instance);
      this.maybeToggleEditorsContainer();
    },
    removed: () => this.maybeToggleEditorsContainer(),
  });

  #editors = this.$watchChildren(Editors, {
    added: () => this.maybeToggleEditorsContainer(),
  });

  #iframes = this.$watchChildren(Iframe);

  get iframe(): Iframe | undefined {
    return this.#iframes.items[0];
  }

  get editors(): Editors | undefined {
    return this.#editors.items[0];
  }

  async mounted() {
    setDefaults({
      html: this.$options.html,
      script: this.$options.script,
      style: this.$options.style,
    });

    const [html, style, script] = await Promise.all([
      this.#readStoredVisibility('html-editor'),
      this.#readStoredVisibility('style-editor'),
      this.#readStoredVisibility('script-editor'),
    ]);

    this.$refs.htmlVisibility.checked = html;
    this.$refs.styleVisibility.checked = style;
    this.$refs.scriptVisibility.checked = script;

    this.#setVisibility('html', html);
    this.#setVisibility('style', style);
    this.#setVisibility('script', script);
  }

  onHtmlVisibilityInput({ target: { checked } }) {
    this.#setVisibility('html', checked);
    urlStore.set('html-editor', checked);
  }

  onStyleVisibilityInput({ target: { checked } }) {
    this.#setVisibility('style', checked);
    urlStore.set('style-editor', checked);
  }

  onScriptVisibilityInput({ target: { checked } }) {
    this.#setVisibility('script', checked);
    urlStore.set('script-editor', checked);
  }

  maybeToggleEditorsContainer() {
    const { editors } = this;

    if (!editors) {
      return;
    }

    if ([...this.#visibility.values()].some(Boolean)) {
      editors.show();
    } else {
      editors.hide();
    }
  }

  onHtmlEditorContentChange() {
    this.iframe?.updateHtml();
  }

  onStyleEditorContentChange() {
    this.iframe?.updateStyle();
  }

  onScriptEditorContentChange() {
    this.iframe?.updateScript();
  }

  onResizableDragged({ payload }: DelegatedEvent<Resizable, 'dragged'>) {
    const { iframe } = this;

    if (!iframe) {
      return;
    }

    if (payload.mode === 'start') {
      this.$write(() => {
        document.body.classList.add('select-none');
        iframe.$el.parentElement.classList.add('pointer-events-none');
      });
    }

    if (payload.mode === 'drop') {
      this.$write(() => {
        document.body.classList.remove('select-none');
        iframe.$el.parentElement.classList.remove('pointer-events-none');
      });
    }
  }

  onIframeReloaderClick() {
    // A reload the user asked for is a full reset, realm included: under v4 a
    // rebuilt document alone would keep the component registry the previous
    // script filled in.
    this.iframe?.resetFrame();
  }

  /**
   * Read one editor's stored visibility. Absent means visible.
   */
  async #readStoredVisibility(key: string): Promise<boolean> {
    return !(await urlStore.has(key)) || (await urlStore.get(key)) === 'true';
  }

  #setVisibility(kind: EditorKind, isVisible: boolean) {
    this.#visibility.set(LANGS[kind], isVisible);

    for (const instance of this.#editorVisibilities) {
      if (instance.lang === LANGS[kind]) {
        instance.toggle(isVisible);
      }
    }

    this.maybeToggleEditorsContainer();
  }

  #applyVisibility(instance: EditorVisibility) {
    const isVisible = this.#visibility.get(instance.lang);

    if (typeof isVisible === 'boolean') {
      instance.toggle(isVisible);
    }
  }
}
