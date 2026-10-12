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
- **Publish:** npm with provenance and trusted publishing (OIDC, no npm token), from the manual `Publish` workflow

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

1. **`resolveDependencies()`** (`src/lib/utils/resolve-dependencies.ts`) — resolves each dependency into either an esm.sh URL or a self-hosted bundle path. Produces an import map + self-hosted metadata. Supports a `subpaths` option that auto-detects export subpaths from a package's `package.json` `exports` (esm.sh: disk-first then npm registry; local: derives the multi-entry `entries`).
2. **`PlaygroundDependenciesPlugin`** (`src/lib/plugins/PlaygroundDependenciesPlugin.ts`) — webpack plugin that bundles self-hosted dependencies with tsdown into `.js` + `.d.ts`. Emits `_headers` file for `x-typescript-types`.
3. **`playground.ts` preset** (`src/lib/presets/playground.ts`) — orchestrates everything: merges import maps, instantiates plugins, configures webpack.

### Frontend

- Components in `src/front/js/components/` — `@studiometa/js-toolkit` components
- Templates in `src/front/templates/` — Twig templates
- Import map is injected into the iframe as `<script type="importmap">`

## Git & branching

- **Trunk-based:** single `main` branch (default)
- **Feature branches:** `feat/#<issue>-description` → PR into `main`
- **Bugfix branches:** `fix/#<issue>-description` → PR into `main`
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
- **Never edit `CHANGELOG.md` directly.** Each PR adds a fragment `.changelog/<slug>.md` (slug = branch name without its prefix, e.g. `feat/auto-detect-subpaths` → `auto-detect-subpaths.md`)
- A fragment only contains `### Added|Changed|Deprecated|Removed|Fixed|Security|Dependencies` headings, each followed by its entries — no `#`/`##` heading
- **Do not write the PR number**: the release appends `[[#N]]` and the link definition from the merged PR that added the fragment
- Commit references are optional: `[2f6994f]` in the entry plus its `[2f6994f]: https://github.com/studiometa/playground/commit/2f6994f` link definition in the fragment
- Prefix breaking changes with `⚠️`
- The `Changelog` check fails when a PR changes `packages/playground/**` or `packages/playground-preview/**` without a fragment; set the `no-changelog` label for changes users do not see (tests, refactors, tooling)
- Format and tooling: [`weareikko/changelog`](https://github.com/weareikko/changelog)

## Versioning & releases

- **Semantic Versioning:** `MAJOR.MINOR.PATCH` (on 0.x, a breaking change is a minor)
- **Do not tag, bump or create GitHub releases manually** — run the `Publish` workflow: `gh workflow run publish.yml -f bump=patch` (or `minor` / `major`)
- The workflow runs lint and tests, bumps the root and all packages to the same version (`npm version --workspaces --include-workspace-root`), folds `.changelog/` into `CHANGELOG.md` under `## vX.Y.Z - YYYY-MM-DD`, commits `vX.Y.Z`, tags `X.Y.Z` (no `v` prefix), pushes to `main`, publishes to npm and creates the GitHub release
- **Prereleases:** `gh workflow run publish.yml -f bump=prerelease -f preid=beta` (or `prepatch` / `preminor` / `premajor`; `preid` is `alpha`, `beta` or `rc`, default `alpha`). A version with a prerelease part (`X.Y.Z-beta.N`) is published on the `next` npm dist-tag and marked as a prerelease on GitHub; any other version goes to `latest`
- **Promoting a prerelease:** releasing `X.Y.Z` after `X.Y.Z-rc.N` works without a fragment: `CHANGELOG.md` gets no new section and the GitHub release says `Stable release of X.Y.Z-rc.N.` Without a fragment, any other release fails
- **npm token:** none. npm trusted publishing (OIDC) is bound to `publish.yml`: keep the publish job in that file, never in another or a reusable workflow
- **Failed publish:** use "Re-run failed jobs" on the run. Each package has its own publish step, and a step skips a version that npm already has, so the replay publishes only the missing packages

## Testing

- Test files: `*.test.ts` next to source files
- Vitest projects: `playground` (node) and `playground-preview` (happy-dom)
- Always run `npm test` before committing
- Write tests for all new logic — aim for full coverage of utility functions

## Important rules

1. **Never use `git add .`** — stage specific files only
2. **Always run lint + tests** before committing
3. **The `source` field** in dependency configs only supports local file paths (not bare npm names)
4. **Self-hosted bundles** auto-externalize import map specifiers to prevent duplication
