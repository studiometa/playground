# CLAUDE.md — @studiometa/playground

## Project overview

A packaged web development playground (code editor + live preview) built as an npm package. Consumers create a playground by importing the `playgroundPreset` into their webpack config.

**Monorepo** with 3 workspace packages:

| Package                          | Path                           | Description                                     |
| -------------------------------- | ------------------------------ | ----------------------------------------------- |
| `@studiometa/playground`         | `packages/playground/`         | Core package — preset, plugins, frontend editor |
| `@studiometa/playground-preview` | `packages/playground-preview/` | Web component for embedding playground previews |
| `@studiometa/playground-demo`    | `packages/demo/`               | Demo app (dev + test consumer)                  |

## Tech stack

- **Node.js** 22+ (see `.nvmrc`)
- **Build:** `@studiometa/webpack-config` (webpack 5) with custom presets
- **Frontend JS:** `@studiometa/js-toolkit` (data-attribute driven components)
- **Editor:** `modern-monaco` (Monaco with built-in LSP + Shiki)
- **CSS:** Tailwind CSS v4
- **Testing:** Vitest 4 with `happy-dom` for DOM tests
- **Linting:** oxlint (scripts), stylelint (CSS), prettier (formatting)
- **Self-hosted deps:** tsdown (rolldown + rolldown-plugin-dts)
- **CI:** GitHub Actions — build, test, coverage (Codecov)
- **Publish:** npm with provenance, triggered by version tags

## Commands

```bash
npm run dev          # Watch playground + demo dev server
npm run build        # Build the playground package
npm run demo:build   # Build the demo (runs build first)
npm run demo:preview # Preview the built demo

npm run lint         # Run all linters (oxlint + stylelint + prettier)
npm run fix          # Auto-fix all linters

npm test             # Run tests (vitest run)
npm run test:watch   # Watch mode
npm run test:ci      # Tests + coverage
```

## Architecture

### Dependency resolution pipeline

The `dependencies` option in `playgroundPreset()` goes through:

1. **`resolveDependencies()`** (`src/lib/utils/resolve-dependencies.ts`) — resolves each dependency into either an esm.sh URL or a self-hosted bundle path. Produces an import map + self-hosted metadata.
2. **`PlaygroundDependenciesPlugin`** (`src/lib/plugins/PlaygroundDependenciesPlugin.ts`) — webpack plugin that bundles self-hosted dependencies with tsdown into `.js` + `.d.ts`. Emits `_headers` file for `x-typescript-types`.
3. **`playground.ts` preset** (`src/lib/presets/playground.ts`) — orchestrates everything: merges import maps, instantiates plugins, configures webpack.

### Frontend

- Components in `src/front/js/components/` — `@studiometa/js-toolkit` components
- Templates in `src/front/templates/` — Twig templates
- Import map is injected into the iframe as `<script type="importmap">`

## Git & branching

- **Git Flow:** `main` (production) + `develop` (integration)
- **Branches:** `feature/#<issue>-description`, `release/<version>`, `hotfix/<version>`
- **Push new branches immediately** after creation

## Commit messages

- **Language:** English
- **Style:** imperative, descriptive (no conventional commit prefixes)
- **Co-authorship** is mandatory: `Co-authored-by: Claude <claude@anthropic.com>`
- **Atomic commits:** one logical change per commit

```bash
# ✅ Good
git commit -m "Fix subpath import resolution for esm.sh URLs

Co-authored-by: Claude <claude@anthropic.com>"

# ❌ Bad
git commit -m "feat: fix imports"
```

## Changelog

- File: `CHANGELOG.md` — [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format, **in English**
- Categories: Added, Changed, Fixed, Deprecated, Removed, Security
- Always include PR and commit references: `([#58](url), [2f6994f](url))`
- Add entries to `[Unreleased]` section first
- On release: replace `[Unreleased]` heading with `## vX.Y.Z - YYYY.MM.DD`
- Commit changelog changes separately from code

## Versioning & releases

- **Semantic Versioning:** `MAJOR.MINOR.PATCH`
- Root `package.json` has a `postversion` script that syncs workspace versions
- Release process:
  1. Create `release/X.Y.Z` branch from `develop`
  2. `npm version X.Y.Z --no-git-tag-version` (bumps all packages)
  3. Update `CHANGELOG.md`
  4. PR into `main`, merge, tag → triggers npm publish via GitHub Actions

## Testing

- Test files: `*.test.ts` next to source files
- Vitest projects: `playground` (node) and `playground-preview` (happy-dom)
- Always run `npm test` before committing
- Write tests for all new logic — aim for full coverage of utility functions

## Important rules

1. **Never use `git add .`** — stage specific files only
2. **Always run lint + tests** before committing
3. **Ask before merging/finishing** release/hotfix branches
4. **The `source` field** in dependency configs only supports local file paths (not bare npm names)
5. **Self-hosted bundles** auto-externalize import map specifiers to prevent duplication
