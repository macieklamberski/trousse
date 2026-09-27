import { isPresent } from './is.js'
import type { AnyOf } from './types.js'

// Assigning to `__proto__` replaces the prototype, so an own `__proto__` key from JSON.parse would
// vanish and its fields would be inherited instead.
const setKey = <T extends object>(object: T, key: keyof T, value: unknown): void => {
  if (key === '__proto__') {
    Object.defineProperty(object, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    })

    return
  }

  object[key] = value as T[keyof T]
}

// Keys the object does not have are skipped rather than set to undefined, so picking from a
// value with optional fields yields only the ones actually present.
export const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: ReadonlyArray<K>,
): Pick<T, K> => {
  const result: Partial<Pick<T, K>> = {}

  for (const key of keys) {
    if (key in object) {
      setKey(result, key, object[key])
    }
  }

  return result as Pick<T, K>
}

export const omit = <T extends object, K extends keyof T>(
  object: T,
  keys: ReadonlyArray<K>,
): Omit<T, K> => {
  const result: Partial<T> = { ...object }

  for (const key of keys) {
    delete result[key]
  }

  return result as Omit<T, K>
}

// Drops the fields whose value fails the keep predicate, by default the null and undefined ones.
// Returns undefined when nothing survives, and the input object itself when everything does, so
// the fully-present case allocates nothing.
export const trimObject = <T extends Record<string, unknown>>(
  object: T,
  keep: (value: unknown) => boolean = isPresent,
): AnyOf<T> | undefined => {
  let hasKept = false
  let hasDropped = false

  // biome-ignore lint/suspicious/noForIn: Plain object; avoids per-call Object.keys allocation.
  for (const key in object) {
    if (keep(object[key])) {
      hasKept = true
    } else {
      hasDropped = true
    }

    if (hasKept && hasDropped) {
      break
    }
  }

  if (!hasKept) {
    return
  }

  if (!hasDropped) {
    return object as AnyOf<T>
  }

  const result: Partial<T> = {}

  // biome-ignore lint/suspicious/noForIn: Plain object; avoids per-call Object.keys allocation.
  for (const key in object) {
    const value = object[key]

    if (keep(value)) {
      setKey(result, key, value)
    }
  }

  return result as AnyOf<T>
}

// A map only ever sees the keys that were put into it, so a lookup for a name that lives on the
// object prototype, `constructor` or `toString`, misses instead of resolving up the chain.
export const toMap = <V>(record: Record<string, V>): Map<string, V> => {
  return new Map(Object.entries(record))
}
