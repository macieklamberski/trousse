# trousse

Personal toolbox of shared TypeScript utilities used across my projects: type guards, coercions, matching and array helpers.

## Installation

```bash
bun add trousse
```

In published packages, prefer adding it as a dev dependency and bundling it at build time (tsdown/rolldown `noExternal: ['trousse']`) so it adds no runtime dependency.

## API

### Type guards (`is*`)

| Function | Description |
| --- | --- |
| `isString` | `typeof value === 'string'`. |
| `isNumber` | `typeof value === 'number'` (includes `NaN` and `Infinity`). |
| `isBoolean` | `typeof value === 'boolean'`. |
| `isFunction` | `typeof value === 'function'`. |
| `isPresent` | Not `null` or `undefined`; narrows to `NonNullable<T>`. |
| `isNullish` | `null` or `undefined`. |
| `isObject` | Any non-array object (accepts class instances, `Date`, `Map`, …). |
| `isPlainObject` | Object-literal objects only (rejects class instances, built-ins, prototype-less objects). |
| `isNonEmptyString` | Non-empty string; whitespace-only strings are treated as empty (Unicode-aware). |
| `isValidDate` | `Date` instance holding a valid date. |

### Coercions (`coerce*`)

Each returns the coerced value or `undefined` when the input cannot be coerced.

| Function | Description |
| --- | --- |
| `coerceString` | String as-is; number → `String(value)`. |
| `coerceNumber` | Number as-is (`NaN` → `undefined`); non-empty numeric string → number. |
| `coerceBoolean` | Boolean as-is; `'true'`/`'false'` strings (case-insensitive, whitespace-tolerant). |
| `coerceDate` | Valid `Date` as-is; date string or timestamp → `Date`. |
| `coerceSingular` | Array → its first element; anything else as-is. |
| `coerceArray` | Array as-is; nullish → `[]`; anything else → `[value]`. |

### Matching (`*AnyOf`)

All match case-insensitively and accept `Array<string | RegExp>` patterns.

| Function | Description |
| --- | --- |
| `isAnyOf` | Value equals any pattern (trimmed; optional custom parser). |
| `includesAnyOf` | Value contains any pattern (optional custom parser). |
| `startsWithAnyOf` | Value starts with any pattern. |
| `endsWithAnyOf` | Value ends with any pattern. |
| `anyWordMatchesAnyOf` | Any whitespace-separated word of the value equals any pattern. |

### Arrays

| Function | Description |
| --- | --- |
| `omitEmpty` | Drops `null`, `undefined`, and `''` items. |

### JSON

| Function | Description |
| --- | --- |
| `isJsonLike` | Cheap structural sniff: string looks like a JSON object or array (no parsing). |
| `isParseableJson` | String parses with `JSON.parse`. |

### URLs

| Function | Description |
| --- | --- |
| `isHostOf` | URL's hostname exactly matches any of the given hosts. |
| `isSubdomainOf` | URL's hostname is a subdomain of any of the given domains. |

### Types

| Type | Description |
| --- | --- |
| `Nullish<T>` | `T \| null \| undefined`. |
| `MaybePromise<T>` | `T \| Promise<T>`. |
| `Pattern` | `string \| RegExp`. |

## License

Licensed under the [MIT License](LICENSE).
