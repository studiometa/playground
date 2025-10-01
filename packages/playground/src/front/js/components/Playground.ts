import { Base } from '@studiometa/js-toolkit';
import type { BaseConfig, BaseProps } from '@studiometa/js-toolkit';
import { domScheduler, wait } from '@studiometa/js-toolkit/utils';
import HeaderSwitcher from './HeaderSwitcher.js';
import LayoutReactive from './LayoutReactive.js';
import LayoutSwitcher from './LayoutSwitcher.js';
import ThemeSwitcher from './ThemeSwitcher.js';
import EditorVisibility from './EditorVisibility.js';
import Editors from './Editors.js';
import type HtmlEditor from './HtmlEditor.js';
import type Iframe from './Iframe.js';
import type Resizable from './Resizable.js';
import type ScriptEditor from './ScriptEditor.js';
import type StyleEditor from './StyleEditor.js';
import { layoutUpdateDOM, themeUpdateDOM, headerUpdateDOM } from '../store/index.js';
import { urlStore } from '../utils/storage/index.js';
import { setDefaults } from '../store/config.js';

layoutUpdateDOM();
themeUpdateDOM();
headerUpdateDOM();

export interface PlaygroundProps extends BaseProps {
  $children: {
    LayoutSwitcher: LayoutSwitcher[];
    LayoutReactive: LayoutReactive[];
    HeaderSwitcher: HeaderSwitcher[];
    Editors: Editors[];
    EditorVisibility: EditorVisibility[];
    Iframe: Promise<Iframe>[];
    Resizable: Promise<Resizable>[];
    HtmlEditor: Promise<HtmlEditor>[];
    ScriptEditor: Promise<ScriptEditor>[];
    StyleEditor: Promise<StyleEditor>[];
  };
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
}

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
      Iframe: async () => wait(100).then(() => import('./Iframe.js')),
      Resizable: async () => wait(100).then(() => import('./Resizable.js')),
      HtmlEditor: async () => wait(100).then(() => import('./HtmlEditor.js')),
      ScriptEditor: async () => wait(100).then(() => import('./ScriptEditor.js')),
      StyleEditor: async () => wait(100).then(() => import('./StyleEditor.js')),
      IframeReloader: async () => wait(100).then(() => import('./IframeReloader.js')),
    },
  };

  get iframe() {
    return this.$children.Iframe[0];
  }

  get editors() {
    return this.$children.Editors[0];
  }

  get htmlEditorVisibility() {
    for (const editor of this.$children.EditorVisibility) {
      if (editor.$el.dataset.lang === 'text/html') {
        return editor;
      }
    }
  }

  get scriptEditorVisibility() {
    for (const editor of this.$children.EditorVisibility) {
      if (editor.$el.dataset.lang === 'text/javascript') {
        return editor;
      }
    }
  }

  get styleEditorVisibility() {
    for (const editor of this.$children.EditorVisibility) {
      if (editor.$el.dataset.lang === 'text/css') {
        return editor;
      }
    }
  }

  async mounted() {
    setDefaults({
      html: this.$options.html,
      script: this.$options.script,
      style: this.$options.style,
    });

    this.$refs.htmlVisibility.checked =
      !urlStore.has('html-editor') || urlStore.get('html-editor') === 'true';
    this.$refs.styleVisibility.checked =
      !urlStore.has('style-editor') || urlStore.get('style-editor') === 'true';
    this.$refs.scriptVisibility.checked =
      !urlStore.has('script-editor') || urlStore.get('script-editor') === 'true';

    this.htmlEditorVisibility.toggle(this.$refs.htmlVisibility.checked);
    this.scriptEditorVisibility.toggle(this.$refs.scriptVisibility.checked);
    this.styleEditorVisibility.toggle(this.$refs.styleVisibility.checked);
    this.maybeToggleEditorsContainer();
  }

  onHtmlVisibilityInput({ target: { checked } }) {
    this.htmlEditorVisibility.toggle(checked);
    urlStore.set('html-editor', checked);
    this.maybeToggleEditorsContainer();
  }

  onStyleVisibilityInput({ target: { checked } }) {
    this.styleEditorVisibility.toggle(this.$refs.styleVisibility.checked);
    urlStore.set('style-editor', checked);
    this.maybeToggleEditorsContainer();
  }

  onScriptVisibilityInput({ target: { checked } }) {
    this.scriptEditorVisibility.toggle(this.$refs.scriptVisibility.checked);
    urlStore.set('script-editor', checked);
    this.maybeToggleEditorsContainer();
  }

  maybeToggleEditorsContainer() {
    const { editors } = this;
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

  async onIframeReloaderClick() {
    const iframe = await this.iframe;
    iframe.initIframe();
  }
}
