import type { MonacoNamespace } from '../monaco.js';
import snippets from './snippets.json';

type Languages = MonacoNamespace['languages'];

interface Range {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

function createDependencyProposals(range: Range, languages: Languages) {
  return Object.values(snippets).map((snippet) => ({
    label: snippet.prefix,
    kind: languages.CompletionItemKind.Function,
    documentation: snippet.description,
    insertText: snippet.body,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
  }));
}

export function addJsAutocompletion(languages: Languages) {
  languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: Range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: createDependencyProposals(range, languages),
      };
    },
  });
}
