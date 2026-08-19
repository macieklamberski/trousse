// All fields optional, but at least one of them present and non-nullable.
export type AnyOf<T> = Partial<{ [Key in keyof T]-?: NonNullable<T[Key]> }> &
  { [Key in keyof T]-?: Pick<{ [InnerKey in keyof T]-?: NonNullable<T[InnerKey]> }, Key> }[keyof T]

export type Nullish<T> = T | null | undefined

export type PartialNullish<T> = { [Key in keyof T]?: Nullish<T[Key]> }

export type MaybePromise<T> = T | Promise<T>

export type Pattern = string | RegExp
