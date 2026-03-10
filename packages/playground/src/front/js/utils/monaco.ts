import type { InitOptions } from 'modern-monaco';

type MonacoNamespace = Awaited<ReturnType<(typeof import('modern-monaco'))['init']>>;

/**
 * Installed modern-monaco version, inlined at build time by esbuild.
 * Used to construct CDN URLs that match modern-monaco's internal pattern.
 */
declare const __MODERN_MONACO_VERSION__: string;

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
 * Additional language IDs to load (Shiki grammars from tm-grammars).
 */
const pendingLangs: string[] = [];

/**
 * Language IDs that should reuse the HTML LSP provider
 * (for HTML-superset template languages like Twig, Liquid, Blade, etc.).
 */
const pendingHtmlLspAliases: string[] = [];

/**
 * Register LSP options to be merged into the init() call.
 * Must be called before getMonaco() resolves.
 */
export function registerLspOptions(lsp: InitOptions['lsp']): void {
  pendingLspOptions.push(lsp);
}

/**
 * Register an additional language grammar to load.
 * Must be called before getMonaco() resolves.
 */
export function registerLang(lang: string): void {
  if (!pendingLangs.includes(lang)) {
    pendingLangs.push(lang);
  }
}

/**
 * Register a language ID as an alias of the HTML LSP provider.
 * This enables HTML completions, diagnostics, and emmet inside
 * HTML-superset template languages (Twig, Liquid, Blade, etc.).
 * Must be called before getMonaco() resolves.
 */
export function registerHtmlLspAlias(lang: string): void {
  if (lang !== 'html' && !pendingHtmlLspAliases.includes(lang)) {
    pendingHtmlLspAliases.push(lang);
  }
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

  // Override the HTML LSP provider to include template language aliases.
  // The import() must resolve to the same CDN-hosted HTML setup module
  // that modern-monaco uses internally. We build the URL using the same
  // pattern: https://esm.sh/modern-monaco@{version}/es2022/lsp/html/setup.mjs
  if (pendingHtmlLspAliases.length > 0) {
    const htmlSetupUrl = `https://esm.sh/modern-monaco@${__MODERN_MONACO_VERSION__}/es2022/lsp/html/setup.mjs`;
    merged.providers = {
      ...merged.providers,
      html: {
        aliases: [...pendingHtmlLspAliases],
        import: () => import(/* webpackIgnore: true */ htmlSetupUrl),
      },
    };
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
          langs: pendingLangs.length > 0 ? pendingLangs : undefined,
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
