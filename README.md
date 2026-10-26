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

## Biome plugin

The package ships a GritQL plugin for Biome that flags a value compared case-folded to a literal, or looked up case-folded in a list, where `isAnyOf` does the same and also trims:

```ts
route.toLowerCase() === 'embed' // Flagged
routes.includes(route.toLowerCase()) // Flagged
isAnyOf(route, 'embed') // Passes
```

Element names stay exempt, since the DOM already folds them. To enable it, add the plugin to `biome.json`:

```json
{
  "plugins": ["./node_modules/trousse/biome/use-any-of.grit"]
}
```
