import type { InitOptions } from 'modern-monaco';

type MonacoNamespace = Awaited<ReturnType<(typeof import('modern-monaco'))['init']>>;

const DARK_THEME = 'dark-plus';
const LIGHT_THEME = 'light-plus';

let monacoPromise: Promise<MonacoNamespace> | null = null;
let monacoInstance: MonacoNamespace | null = null;

/**
 * Pending LSP options collected from editor subclasses before init() is called.
 * Since getMonaco() is a singleton, only the first call's options win.
 * This allows subclasses to register their LSP config before init fires.
 */
const pendingLspOptions: InitOptions['lsp'][] = [];

/**
 * Register LSP options to be merged into the init() call.
 * Must be called before getMonaco() resolves.
 */
export function registerLspOptions(lsp: InitOptions['lsp']): void {
  pendingLspOptions.push(lsp);
}

/**
 * Merge all pending LSP options into a single config.
 */
function buildLspConfig(): InitOptions['lsp'] {
  const merged: InitOptions['lsp'] = {
    formatting: {
      tabSize: 2,
      insertSpaces: true,
    },
  };

  for (const lsp of pendingLspOptions) {
    if (!lsp) continue;
    Object.assign(merged, lsp);
  }

  return merged;
}

/**
 * Get or initialize the shared Monaco instance.
 * Waits one microtask to allow all editors to register their LSP options.
 */
export async function getMonaco(
  themeOptions?: Pick<InitOptions, 'defaultTheme' | 'themes'>,
): Promise<MonacoNamespace> {
  if (!monacoPromise) {
    // Ensure builtin LSP providers are enabled before init().
    // modern-monaco sets this via a top-level side effect in its index.mjs,
    // but webpack may tree-shake it when using dynamic import().
    Object.assign(globalThis, {
      MonacoEnvironment: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(globalThis as any).MonacoEnvironment,
        useBuiltinLSP: true,
      },
    });

    // Wait one microtask so all editors that mount synchronously
    // can register their LSP options before init() fires.
    monacoPromise = Promise.resolve()
      .then(() => import('modern-monaco'))
      .then(({ init }) =>
        init({
          ...themeOptions,
          lsp: buildLspConfig(),
        }),
      )
      .then((monaco) => {
        monacoInstance = monaco;
        return monaco;
      });
  }

  return monacoPromise;
}

/**
 * Get the Monaco instance synchronously. Returns `null` if not yet initialized.
 */
export function getMonacoSync(): MonacoNamespace | null {
  return monacoInstance;
}

export { DARK_THEME, LIGHT_THEME };
export type { MonacoNamespace };
