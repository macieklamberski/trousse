// All fields optional, but at least one of them present and non-nullable.
export type AnyOf<T> = Partial<{ [Key in keyof T]-?: NonNullable<T[Key]> }> &
  { [Key in keyof T]-?: Pick<{ [InnerKey in keyof T]-?: NonNullable<T[InnerKey]> }, Key> }[keyof T]

// True only for object types that are not arrays, functions, Date or null.
export type IsPlainObject<T> =
  T extends Array<unknown>
    ? false
    : T extends (...args: Array<unknown>) => unknown
      ? false
      : T extends Date
        ? false
        : T extends object
          ? T extends null
            ? false
            : true
          : false

// Strips the named keys at every level, recursing through arrays and plain objects while leaving
// other values (Date, functions, primitives) untouched.
export type DeepOmit<T, Keys extends string> =
  T extends Array<infer Item>
    ? Array<DeepOmit<Item, Keys>>
    : IsPlainObject<T> extends true
      ? Pick<{ [Key in keyof T]: DeepOmit<T[Key], Keys> }, Exclude<keyof T, Keys>>
      : T

export type Nullish<T> = T | null | undefined

export type PartialNullish<T> = { [Key in keyof T]?: Nullish<T[Key]> }

export type MaybePromise<T> = T | Promise<T>

export type Pattern = string | RegExp

export type RegistrableDomainOptions = {
  suffixes?: ReadonlyArray<string> // Public Suffix List rules, cached per array, so never mutate it
}

// See: https://www.rfc-editor.org/rfc/rfc3986.
// See: https://www.rfc-editor.org/rfc/rfc9110.
// See: https://www.rfc-editor.org/rfc/rfc3987.
export type NormalizeOptions = {
  stripScheme?: boolean // Strip the scheme, so http and https compare the same
  /** @deprecated Use `stripScheme` instead, which wins when both are set. */
  stripProtocol?: boolean
  stripHostTrailingDot?: boolean // example.com. → example.com, the DNS absolute form, RFC 1034 §3.1
  stripAuthentication?: boolean // Strip user:pass@, RFC 3986 §3.2.1, RFC 9110 §4.2.4
  stripWww?: boolean // Strip www. prefix
  stripTrailingSlash?: boolean // /feed/ → /feed, against RFC 3986 §3.3
  stripRootSlash?: boolean // example.com/ → example.com, against RFC 9110 §4.2.3
  collapseSlashes?: boolean // /// → /, against RFC 3986 §3.3
  stripHash?: boolean // Strip #fragment, never sent to the server, RFC 3986 §3.5
  sortQueryParams?: boolean // Sort query params alphabetically, a server may read them in order
  stripQueryParams?: ReadonlyArray<string> // Query params to strip, cached per array, so never mutate it
  stripQuery?: boolean // Strip entire query string
  stripEmptyQuery?: boolean // /feed? → /feed, against RFC 3986 §6.2.3
  lowercaseQuery?: boolean // Lowercase query param names and values, against RFC 3986 §6.2.2.1
  normalizeEncoding?: boolean // Uppercase %XX hex, decode needless escapes, RFC 3986 §6.2.2
  normalizeUnicode?: boolean // NFC on raw input, no-op on a serialized href, RFC 3987 §5.3.2.2
}
