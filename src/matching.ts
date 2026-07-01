import type { Pattern } from './types.js'

const whitespaceRegex = /\s+/

export const isAnyOf = (
  value: string,
  patterns: Array<Pattern>,
  parser?: (value: string) => string,
): boolean => {
  const parsedValue = parser ? parser(value) : value?.toLowerCase()?.trim()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(parsedValue)
    }

    return parsedValue === pattern.toLowerCase().trim()
  })
}

export const includesAnyOf = (
  value: string,
  patterns: Array<Pattern>,
  parser?: (value: string) => string,
): boolean => {
  const parsedValue = parser ? parser(value) : value?.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(parsedValue)
    }

    return pattern && parsedValue?.includes(pattern.toLowerCase())
  })
}

export const startsWithAnyOf = (value: string, patterns: Array<Pattern>): boolean => {
  const lowerValue = value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(lowerValue)
    }

    return pattern && lowerValue.startsWith(pattern.toLowerCase())
  })
}

export const endsWithAnyOf = (value: string, patterns: Array<Pattern>): boolean => {
  const lowerValue = value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(lowerValue)
    }

    return pattern && lowerValue.endsWith(pattern.toLowerCase())
  })
}

export const anyWordMatchesAnyOf = (value: string, patterns: Array<Pattern>): boolean => {
  const words = value.toLowerCase().split(whitespaceRegex)

  return words.some((word) => isAnyOf(word, patterns))
}
