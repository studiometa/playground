# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.3.10 - 2026.07.27

### Fixed

- Pin the TypeScript compiler used by modern-monaco's editor worker to the 6.x line, fixing the worker failing to load since the TypeScript 7 release ([#72](https://github.com/studiometa/playground/pull/72), [d89092b](https://github.com/studiometa/playground/commit/d89092b))

## v0.3.9 - 2026.07.27

### Fixed

- Resolve the opaque `about:srcdoc` base in the preview iframe so `new URL('/some-path', window.location.href)` no longer throws `Invalid URL` ([#71](https://github.com/studiometa/playground/pull/71), [c04bca9](https://github.com/studiometa/playground/commit/c04bca9))

## v0.3.8 - 2026.04.03

### Fixed

- Watch local dependency source files in dev/watch mode — changes now trigger webpack rebuilds ([#70](https://github.com/studiometa/playground/pull/70), [0c08ef0](https://github.com/studiometa/playground/commit/0c08ef0))

## v0.3.7 - 2026.04.01

### Added

- Add typed `esmSh` option to `DependencyConfig` for controlling esm.sh query parameters per dependency (e.g. `{ bundle: false }` to prevent singleton duplication) ([#69](https://github.com/studiometa/playground/pull/69), [e06c5b6](https://github.com/studiometa/playground/commit/e06c5b6))

### Fixed

- Disable esm.sh bundling for `@studiometa/js-toolkit` in demo to fix singleton service duplication ([#69](https://github.com/studiometa/playground/pull/69), [a5e5e83](https://github.com/studiometa/playground/commit/a5e5e83))

## v0.3.6 - 2026.03.23

### Added

- **playground-preview:** Support dynamically injected `<script type="playground/...">` children via `MutationObserver`, enabling framework compatibility (Vue, Svelte, etc.) ([#66](https://github.com/studiometa/playground/pull/66), [f1c21b1](https://github.com/studiometa/playground/commit/f1c21b1))

### Fixed

- **playground-preview:** Fix iframe `load` event not firing on hash-only URL changes, which left the loader visible indefinitely ([#66](https://github.com/studiometa/playground/pull/66), [f1c21b1](https://github.com/studiometa/playground/commit/f1c21b1))

### Changed

- Switch playground-preview tests from happy-dom to real browser via `@vitest/browser` + Playwright for reliable `IntersectionObserver`, `MutationObserver`, and iframe behavior ([#66](https://github.com/studiometa/playground/pull/66), [f2477dc](https://github.com/studiometa/playground/commit/f2477dc))
- Include `@studiometa/playground-preview` in compressed size analysis and root `build` script ([#66](https://github.com/studiometa/playground/pull/66), [a34fed6](https://github.com/studiometa/playground/commit/a34fed6))
- Add `codecov.yml` with per-package project coverage targets ([#66](https://github.com/studiometa/playground/pull/66), [33cbbb6](https://github.com/studiometa/playground/commit/33cbbb6))

## v0.3.5 - 2026.03.25

### Changed

- Rework publish workflow: split into test + publish jobs, add prerelease support, switch to `ncipollo/release-action` ([#63](https://github.com/studiometa/playground/pull/63), [7455f8b](https://github.com/studiometa/playground/commit/7455f8b))
- Align tests workflow with publish workflow conventions: `npm ci`, consistent naming, build playground-preview ([#63](https://github.com/studiometa/playground/pull/63), [d69f1f8](https://github.com/studiometa/playground/commit/d69f1f8))
- Replace `export-size-action` with `preactjs/compressed-size-action` ([#63](https://github.com/studiometa/playground/pull/63), [806fa6f](https://github.com/studiometa/playground/commit/806fa6f))
- Switch from git-flow to trunk-based workflow with single `main` branch ([b192f37](https://github.com/studiometa/playground/commit/b192f37))

### Added

- Add `@studiometa/playground-preview` to publish workflow ([#63](https://github.com/studiometa/playground/pull/63), [bd3721c](https://github.com/studiometa/playground/commit/bd3721c))

## v0.3.4 - 2026.03.12

### Changed

- Move import map `publicPath` prefixing into `PlaygroundDependenciesPlugin`, automatically inferring it from webpack's `output.publicPath` ([#61](https://github.com/studiometa/playground/pull/61), [fe758c0](https://github.com/studiometa/playground/commit/fe758c0))

### Fixed

- Fix TypeScript error by accepting function type for webpack `output.publicPath` ([#61](https://github.com/studiometa/playground/pull/61), [319ec0b](https://github.com/studiometa/playground/commit/319ec0b))

## v0.3.3 - 2026.03.10

### Fixed

- Fix subpath import resolution for esm.sh URLs (e.g. `@studiometa/js-toolkit/utils` now correctly resolves to `esm.sh/@studiometa/js-toolkit@x.y.z/utils`) ([#58](https://github.com/studiometa/playground/pull/58), [2f6994f](https://github.com/studiometa/playground/commit/2f6994f))
- Fix version lookup for subpath imports using the package name instead of the full specifier ([#58](https://github.com/studiometa/playground/pull/58))
- Reject bare npm package names as `source` values with a warning and esm.sh fallback — `source` now only supports local file paths/globs ([#58](https://github.com/studiometa/playground/pull/58))
- Fix bundle duplication by auto-externalizing import map specifiers in self-hosted builds ([#58](https://github.com/studiometa/playground/pull/58))

## v0.3.2 - 2026.03.10

### Added

- Add `publicPath` option to `playgroundPreset()` for self-hosted dependency paths, with automatic inference from webpack's `output.publicPath` ([#55](https://github.com/studiometa/playground/pull/55), [a2784d2](https://github.com/studiometa/playground/commit/a2784d2))
- Add `@studiometa/playground-preview` web component package for embedding playground previews anywhere ([#53](https://github.com/studiometa/playground/pull/53), [9e2d52c](https://github.com/studiometa/playground/commit/9e2d52c))

## v0.3.1 - 2026.03.10

### Added

- Add declarative `dependencies` option to `playgroundPreset()` for managing script editor packages with esm.sh resolution and self-hosted bundling via tsdown ([#50](https://github.com/studiometa/playground/pull/50))
- Add `_headers` file generation for `x-typescript-types` (Cloudflare Pages / Netlify) ([#50](https://github.com/studiometa/playground/pull/50))
- Add CI test job with vitest and Codecov coverage ([#50](https://github.com/studiometa/playground/pull/50))

### Fixed

- Fix relative import map URLs not resolving to absolute URLs for TypeScript LSP ([#49](https://github.com/studiometa/playground/pull/49))

## v0.3.0 - 2026.03.10

### Changed

- ⚠️ Replace `monaco-editor` with `modern-monaco` for built-in LSP, auto `.d.ts` fetching, Shiki syntax highlighting, and no webpack plugin needed ([#43](https://github.com/studiometa/playground/pull/43))
- ⚠️ Replace `eslint` with `oxlint` ([#44](https://github.com/studiometa/playground/pull/44))
- Update dependencies ([#45](https://github.com/studiometa/playground/pull/45))

### Added

- Add `htmlLanguage` preset option to support HTML-superset template languages (Twig, Liquid, Blade, Handlebars, etc.) in the HTML editor ([#43](https://github.com/studiometa/playground/pull/43))

## v0.2.1 - 2025.10.17

### Added

- Add support for auto-types in the script editor ([#37](https://github.com/studiometa/playground/pull/37), [0a3a495](https://github.com/studiometa/playground/commit/0a3a495))

## v0.2.0 - 2025.10.16

### Added

- Add support for embedding display ([#35](https://github.com/studiometa/playground/pull/35), [8b1c825](https://github.com/studiometa/playground/commit/8b1c825))
- Add support for switching theme from the URL only ([#35](https://github.com/studiometa/playground/pull/35), [beb4cf8](https://github.com/studiometa/playground/commit/beb4cf8))

### Changed

- ⚠️ Upgrade playground Tailwind version to v4 ([#35](https://github.com/studiometa/playground/pull/35), [15fb7d2](https://github.com/studiometa/playground/commit/15fb7d2))
- Improve default values for the playground demo ([#35](https://github.com/studiometa/playground/pull/35), [2704848](https://github.com/studiometa/playground/commit/2704848))
- Improve UI ([#35](https://github.com/studiometa/playground/pull/35))
- Improve load performance ([#35](https://github.com/studiometa/playground/pull/35), [229d3ad](https://github.com/studiometa/playground/commit/229d3ad))
- Improve layout shifts on load ([#35](https://github.com/studiometa/playground/pull/35), [e1b8430](https://github.com/studiometa/playground/commit/e1b8430))
- Always update style even if empty ([#35](https://github.com/studiometa/playground/pull/35), [11fd53f](https://github.com/studiometa/playground/commit/11fd53f))
- Reduce layout shifts on load ([#35](https://github.com/studiometa/playground/pull/35), [db85a5d](https://github.com/studiometa/playground/commit/db85a5d))
- Switch to more neutral color scheme ([#35](https://github.com/studiometa/playground/pull/35), [ea7d180](https://github.com/studiometa/playground/commit/ea7d180))
- Update dependencies ([dc8bc36](https://github.com/studiometa/playground/commit/dc8bc36))

### Fixed

- Fix style update ([#35](https://github.com/studiometa/playground/pull/35), [2d6196d](https://github.com/studiometa/playground/commit/2d6196d))
- Fix script update ([#35](https://github.com/studiometa/playground/pull/35), [d299aaf](https://github.com/studiometa/playground/commit/d299aaf))

## v0.1.5 - 2024.11.18

### Changed

- Update dependencies ([60cef7b](https://github.com/studiometa/playground/commit/60cef7b), [8ffba5d](https://github.com/studiometa/playground/commit/8ffba5d), [3f47162](https://github.com/studiometa/playground/commit/3f47162), [9adc03e](https://github.com/studiometa/playground/commit/9adc03e), [22f15fe](https://github.com/studiometa/playground/commit/22f15fe), [f139277](https://github.com/studiometa/playground/commit/f139277), [6c88ecf](https://github.com/studiometa/playground/commit/6c88ecf), [e427cfd](https://github.com/studiometa/playground/commit/e427cfd), [f93ab86](https://github.com/studiometa/playground/commit/f93ab86))

### Fixed

- Fix GitHub actions for main ([7ab645d](https://github.com/studiometa/playground/commit/7ab645d))

## v0.1.4 - 2024.08.05

### Fixed

- Fix compatibility with [@studiometa/js-toolkit](https://github.com/studiometa/js-toolkit) v3.0.0-alpha.6 ([#3](https://github.com/studiometa/playground/pull/3), [43c216d](https://github.com/studiometa/playground/commit/43c216d))
- Fix an error where the export were not found ([#3](https://github.com/studiometa/playground/pull/3), [4f1d20a](https://github.com/studiometa/playground/commit/4f1d20a))

### Changed

- Update dependencies ([#3](https://github.com/studiometa/playground/pull/3), [350c1a6](https://github.com/studiometa/playground/commit/350c1a6))

## v0.1.3 - 2024.07.11

### Added

- Add a reload button ([b5f3811](https://github.com/studiometa/playground/commit/b5f3811))

## v0.1.2 - 2024.07.11

### Fixed

- Fix build ([9d7973b](https://github.com/studiometa/playground/commit/9d7973b))
- Fix production build config ([a63eb38](https://github.com/studiometa/playground/commit/a63eb38))

### Changed

- Improve responsive layout ([1df4cdf](https://github.com/studiometa/playground/commit/1df4cdf))

## v0.1.1 - 2024.07.10

### Fixed

- Fix an error where uninitialized variables were accessed ([1eb2128](https://github.com/studiometa/playground/commit/1eb2128))
- Fix dark theme ([23538b7](https://github.com/studiometa/playground/commit/23538b7))

### Changed

- Update dependencies ([1b60675](https://github.com/studiometa/playground/commit/1b60675))
- Update dev Node version ([8b82c52](https://github.com/studiometa/playground/commit/8b82c52))

## v0.1.0 - 2024.04.17

### Fixed

- Add a main property ([f6e57c4](https://github.com/studiometa/playground/commit/f6e57c4))

### Changed

- ⚠️ Update @studiometa/js-toolkit to v3.0.0-alpha.3 ([050a41a](https://github.com/studiometa/playground/commit/050a41a))
- ⚠️ Update dependencies ([cc8fcd8](https://github.com/studiometa/playground/commit/cc8fcd8))

## v0.0.3 - 2024.02.13

### Fixed

- Fix publish action ([c17534a](https://github.com/studiometa/playground/commit/c17534a))

## v0.0.2 - 2024.02.12

### Changed

- Fix publish action ([39ebaaa](https://github.com/studiometa/playground/commit/39ebaaa))

## v0.0.1 - 2024.02.12

### Changed

- Improve publish action ([ec9bb1d](https://github.com/studiometa/playground/commit/ec9bb1d))

## v0.0.0 - 2024.02.12

First release 🎉
