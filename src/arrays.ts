export const omitEmpty = <T>(array: Array<T | null | undefined>): Array<T> => {
  const result: Array<T> = []

  for (const item of array) {
    if (item != null && item !== '') {
      result.push(item as T)
    }
  }

  return result
}
