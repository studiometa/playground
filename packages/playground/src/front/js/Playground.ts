import { Base, createApp } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { domScheduler, wait } from '@studiometa/js-toolkit/utils';
import HeaderSwitcher from './components/HeaderSwitcher.js';
import LayoutReactive from './components/LayoutReactive.js';
import LayoutSwitcher from './components/LayoutSwitcher.js';
import ThemeSwitcher from './components/ThemeSwitcher.js';
import type Editors from './components/Editors.js';
import type HtmlEditor from './components/HtmlEditor.js';
import type Iframe from './components/Iframe.js';
import type Resizable from './components/Resizable.js';
import type ScriptEditor from './components/ScriptEditor.js';
import type StyleEditor from './components/StyleEditor.js';
import {
  layoutUpdateDOM,
  themeUpdateDOM,
  headerUpdateDOM,
} from './store/index.js';
import { urlStore } from './utils/storage/index.js';

layoutUpdateDOM();
themeUpdateDOM();
headerUpdateDOM();

export interface PlaygroundProps extends BaseProps {
  $children: {
    LayoutSwitcher: LayoutSwitcher[];
    LayoutReactive: LayoutReactive[];
    HeaderSwitcher: HeaderSwitcher[];
    Iframe: Promise<Iframe>[];
    Resizable: Promise<Resizable>[];
    Editors: Promise<Editors>[];
    HtmlEditor: Promise<HtmlEditor>[];
    ScriptEditor: Promise<ScriptEditor>[];
    StyleEditor: Promise<StyleEditor>[];
  };
  $refs: {
    htmlVisibility: HTMLInputElement;
    scriptVisibility: HTMLInputElement;
    styleVisibility: HTMLInputElement;
  };
}

export class Playground extends Base<PlaygroundProps> {
  static config: BaseConfig = {
    name: 'Playground',
    refs: ['htmlVisibility', 'scriptVisibility', 'styleVisibility'],
    components: {
      LayoutReactive,
      LayoutSwitcher,
      ThemeSwitcher,
      HeaderSwitcher,
      Iframe: async () =>
        wait(100).then(() => import('./components/Iframe.js')),
      Resizable: async () =>
        wait(100).then(() => import('./components/Resizable.js')),
      Editors: async () =>
        wait(100).then(() => import('./components/Editors.js')),
      HtmlEditor: async () =>
        wait(100).then(() => import('./components/HtmlEditor.js')),
      ScriptEditor: async () =>
        wait(100).then(() => import('./components/ScriptEditor.js')),
      StyleEditor: async () =>
        wait(100).then(() => import('./components/StyleEditor.js')),
    },
  };

  get iframe() {
    return this.$children.Iframe[0];
  }

  get editors() {
    return this.$children.Editors[0];
  }

  get htmlEditor() {
    return this.$children.HtmlEditor[0];
  }

  get scriptEditor() {
    return this.$children.ScriptEditor[0];
  }

  get styleEditor() {
    return this.$children.StyleEditor[0];
  }

  async mounted() {
    this.$refs.htmlVisibility.checked =
      !urlStore.has('html-editor') || urlStore.get('html-editor') === 'true';
    this.$refs.styleVisibility.checked =
      !urlStore.has('style-editor') || urlStore.get('style-editor') === 'true';
    this.$refs.scriptVisibility.checked =
      !urlStore.has('script-editor') ||
      urlStore.get('script-editor') === 'true';
    const [htmlEditor, scriptEditor, styleEditor] = await Promise.all([
      this.htmlEditor,
      this.scriptEditor,
      this.styleEditor,
    ]);
    htmlEditor.toggle(this.$refs.htmlVisibility.checked);
    scriptEditor.toggle(this.$refs.scriptVisibility.checked);
    styleEditor.toggle(this.$refs.styleVisibility.checked);
    this.maybeToggleEditorsContainer();
  }

  async onHtmlVisibilityInput({ target: { checked } }) {
    const editor = await this.htmlEditor;
    editor.toggle(checked);
    urlStore.set('html-editor', checked);
    this.maybeToggleEditorsContainer();
  }

  async onStyleVisibilityInput({ target: { checked } }) {
    const editor = await this.styleEditor;
    editor.toggle(this.$refs.styleVisibility.checked);
    urlStore.set('style-editor', checked);
    this.maybeToggleEditorsContainer();
  }

  async onScriptVisibilityInput({ target: { checked } }) {
    const editor = await this.scriptEditor;
    editor.toggle(this.$refs.scriptVisibility.checked);
    urlStore.set('script-editor', checked);
    this.maybeToggleEditorsContainer();
  }

  async maybeToggleEditorsContainer() {
    const editors = await this.editors;
    if (
      !this.$refs.htmlVisibility.checked &&
      !this.$refs.scriptVisibility.checked &&
      !this.$refs.styleVisibility.checked
    ) {
      editors.hide();
    } else {
      editors.show();
    }
  }

  async onHtmlEditorContentChange() {
    const iframe = await this.iframe;
    iframe.updateHtml();
  }

  async onStyleEditorContentChange() {
    const iframe = await this.iframe;
    iframe.updateStyle();
  }

  async onScriptEditorContentChange() {
    const iframe = await this.iframe;
    iframe.updateScript();
  }

  async onResizableDragged(props) {
    const iframe = await this.iframe;
    if (props.mode === 'start') {
      domScheduler.write(() => {
        document.body.classList.add('select-none');
        iframe.$el.parentElement.classList.add('pointer-events-none');
      });
    }

    if (props.mode === 'drop') {
      domScheduler.write(() => {
        document.body.classList.remove('select-none');
        iframe.$el.parentElement.classList.remove('pointer-events-none');
      });
    }
  }
}

export function createPlayground() {
  return createApp(Playground, {
    features: {
      asyncChildren: true,
    },
  });
}

export default createPlayground();
