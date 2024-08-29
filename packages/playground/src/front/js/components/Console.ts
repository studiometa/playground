import { Base } from '@studiometa/js-toolkit';

function h(tag, attributes= {}, children) {
  const el = document.createElement(tag);

  if (Array.isArray(attributes) && typeof children === 'undefined') {
    children = attributes;
    attributes = {};
  }

  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name.replaceAll(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(), value);
  }

  if (Array.isArray(children)) {
    el.append(...children);
  }

  return el;
}

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
    this.send('error', event.message, event.filename);
  }

  send(level: Levels, ...args: string[]) {
    const title = `[${level}] ${args[0]}`;

    const div = document.createElement('div');
    const tag = args.length === 1 ? 'div' : 'details';
    const color = this.colors[level] ?? 'current';

    div.innerHTML = `
      <${tag} class="px-2 py-1 ${color}">
        <summary class="w-full flex justify-between">
          <span>▸ ${title}</span>
          <span>${Date.now()}</span>
        </summary>
        <div class="whitespace-pre">${args.slice(1).join('\n')}</div>
      </${tag}>
    `;

    this.$el.append(div.firstElementChild);
  }
}

