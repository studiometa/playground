export async function data() {
  return {
    importMaps: () => ({
      imports: {
        'modern-monaco/editor-core': 'https://esm.sh/modern-monaco/editor-core',
        'modern-monaco/lsp': 'https://esm.sh/modern-monaco/modern-monaco/lsp',
      },
    }),
  };
}
