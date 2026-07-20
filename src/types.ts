export type Nullish<T> = T | null | undefined

// A value on its way in: every field optional, and nullish rather than merely absent, since
// the DOM and JSON reads it comes from return null. Normalize it into T before passing it on.
export type PartialNullish<T> = { [Key in keyof T]?: Nullish<T[Key]> }

export type MaybePromise<T> = T | Promise<T>

export type Pattern = string | RegExp
