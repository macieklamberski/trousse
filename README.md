# trousse

[![codecov](https://codecov.io/gh/macieklamberski/trousse/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/trousse)
[![npm version](https://img.shields.io/npm/v/trousse.svg)](https://www.npmjs.com/package/trousse)
[![license](https://img.shields.io/npm/l/trousse.svg)](https://github.com/macieklamberski/trousse/blob/main/LICENSE)

Personal toolbox of shared TypeScript utilities used across my projects: type guards, coercions, matching, URL, array, object and locale interpolation helpers.

## Installation

```bash
npm add trousse
```

In published packages, prefer adding it as a dev dependency and bundling it at build time so it adds no runtime dependency.

`resolveUrl` decodes HTML entities with `entities`, the one runtime dependency of trousse. A package that bundles trousse and calls `resolveUrl` should list `entities` in its own dependencies, or the bundler inlines a copy of it.
