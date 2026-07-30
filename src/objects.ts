// Keys the object does not have are skipped rather than set to undefined, so picking from a
// value with optional fields yields only the ones actually present.
export const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: ReadonlyArray<K>,
): Pick<T, K> => {
  const result = {} as Pick<T, K>

  for (const key of keys) {
    if (key in object) {
      result[key] = object[key]
    }
  }

  return result
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
