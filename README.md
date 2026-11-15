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

## API

### `normalizeUrl`

Builds a key for comparing URLs, so two spellings of one address come out the same. The result is not meant for fetching: `stripScheme` and `stripRootSlash` produce strings no URL parser reads back, and `sortQueryParams` or `lowercaseQuery` can produce a URL the server answers differently.

```typescript
import { normalizeUrl } from 'trousse'

normalizeUrl('https://www.example.com/feed/?utm_source=x&b=2&a=1#top', {
  stripWww: true,
  stripTrailingSlash: true,
  stripHash: true,
  sortQueryParams: true,
  stripQueryParams: ['utm_source'],
})
// 'https://example.com/feed?a=1&b=2'
```

There are no defaults. Every option is off unless set, so `normalizeUrl(url, {})` applies none of them. The URL still goes through the URL parser, which lowercases the host, drops a default port and resolves `..` segments. A string that does not parse comes back unchanged.

| Option | Type | What it does |
|--------|------|--------------|
| `stripScheme` | `boolean` | Removes `http://` or `https://`, so both schemes compare the same |
| `stripProtocol` | `boolean` | Deprecated alias of `stripScheme`, which wins when both are set |
| `stripHostTrailingDot` | `boolean` | `example.com.` → `example.com`, the DNS absolute form |
| `stripAuthentication` | `boolean` | Removes `user:pass@` |
| `stripWww` | `boolean` | Removes every leading `www.` label, except the last one before a bare top-level domain, so `www.com` stays |
| `stripTrailingSlash` | `boolean` | `/feed/` → `/feed`, leaving the root `/` alone |
| `stripRootSlash` | `boolean` | `https://example.com/` → `https://example.com` |
| `collapseSlashes` | `boolean` | `///` → `/` in the path, except right after a `:`, so a URL inside the path keeps its `//` |
| `stripHash` | `boolean` | Removes the `#fragment` |
| `sortQueryParams` | `boolean` | Sorts query pairs by decoded name and drops empty pairs |
| `stripQueryParams` | `ReadonlyArray<string> \| QueryParamPredicate` | Removes query pairs by name or by a function, see below |
| `stripQuery` | `boolean` | Removes the whole query |
| `stripEmptyQuery` | `boolean` | `/feed?` → `/feed` |
| `lowercaseQuery` | `boolean` | Lowercases query names and values, leaving percent escapes as they are |
| `normalizeEncoding` | `boolean` | Uppercases `%xx` hex and decodes needless escapes in the path, query and fragment. In the query, `q=a%3Ab` and `q=a:b` come out the same, while `%26` keeps a value whole |
| `normalizeUnicode` | `boolean` | Applies NFC to the raw input before parsing |

#### `stripQueryParams`

A list of names removes every pair with one of those names, matched case-insensitively against the decoded name. The list is cached by identity, so build it once and never mutate it.

A function decides pair by pair and returns `true` to remove one. It gets three arguments:

- `name`: the decoded name, in its original case.
- `value`: the decoded value, or `undefined` for a pair with no `=`.
- `url`: the URL as normalized so far, so with `stripWww` the host arrives without its `www.`.

```typescript
normalizeUrl('https://example.com/feed?utm_source=x&page=1&ref=', {
  stripQueryParams: (name, value) => name.startsWith('utm_') || value === '',
})
// 'https://example.com/feed?page=1'
```

In both forms, empty pairs go too, and the pairs that stay are written back as written, in their original encoding, or the one `normalizeEncoding` gave them. A query left with no pairs loses its `?`.
