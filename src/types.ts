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
          ? true
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

export type NormalizeOptions = {
  stripProtocol?: boolean // Strip protocol (http ↔ https treated same)
  stripAuthentication?: boolean // Strip user:pass@
  stripWww?: boolean // Strip www. prefix
  stripTrailingSlash?: boolean // /feed/ → /feed
  stripRootSlash?: boolean // example.com/ → example.com
  collapseSlashes?: boolean // /// → /
  stripHash?: boolean // Strip #fragment
  sortQueryParams?: boolean // Sort query params alphabetically
  stripQueryParams?: Array<string> // Query params to strip, cached per array, so never mutate it
  stripQuery?: boolean // Strip entire query string
  stripEmptyQuery?: boolean // /feed? → /feed
  lowercaseQuery?: boolean // Lowercase query param names and values
  normalizeEncoding?: boolean // Normalize %XX encoding
  normalizeUnicode?: boolean // NFC normalization
}
