import { Base } from '@studiometa/js-toolkit';
import devalue from '@nuxt/devalue';

type Levels = 'log' | 'debug' | 'warn' | 'error' | 'info';

export default class Console extends Base {
  static config = {
    name: 'Console',
    log: true,
  };

  references = {
    log: null,
    debug: null,
    warn: null,
    error: null,
    info: null,
  } as Record<Levels, null | Function>;


  colors = {
    error: 'text-red-500',
    warn: 'text-yellow-500'
  }

  async mounted() {
    const iframe = await this.$root.iframe;
    iframe.$on('iframe-ready', () => {
      window.console.log('iframe ready')
      const { console } = iframe.window

      iframe.window.addEventListener('error', (event) => {
        this.$log(event.error.toString())
    this.send('error', event.message, event.error.stack);
      })

      for (const method of Object.keys(this.references) as Array<Levels>) {
        this.references[method] = console[method];

        Object.defineProperty(console, method, {
          configurable: true,
          value: (...args) => {
            this.send(method, ...args);
            this.references[method](...args);
          }
        })
      }
    });
  }

  async destroyed() {
    const iframe = await this.$root.iframe;
    const { console } = iframe.window

    for (const method of Object.keys(this.references)) {
      Object.defineProperty(console, method, {
        configurable: true,
        value: this.references[method],
      });
      this.references[method] = null;
    }
  }

  onWindowError({ event }) {
    this.send('error', event.error);
  }

  send(level: Levels, ...args: string[]) {
    const title = `[${level}] ${args[0]}`;

    const div = document.createElement('div');
    const tag = args.length === 1 ? 'div' : 'div';
    const color = this.colors[level] ?? 'current';

    div.innerHTML = `
      <${tag} class="px-2 py-1 ${color}">

        <div class="whitespace-pre">${args.map(arg => devalue(arg)).join(' ')}</div>
      </${tag}>
    `;

    this.$el.append(div.firstElementChild);
  }
}

