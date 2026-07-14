import type { Pattern } from './types.js'

const whitespaceRegex = /\s+/

export const isAnyOf = (
  value: string,
  patterns: ReadonlyArray<Pattern>,
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
  patterns: ReadonlyArray<Pattern>,
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

export const startsWithAnyOf = (value: string, patterns: ReadonlyArray<Pattern>): boolean => {
  const lowerValue = value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(lowerValue)
    }

    return pattern && lowerValue.startsWith(pattern.toLowerCase())
  })
}

export const endsWithAnyOf = (value: string, patterns: ReadonlyArray<Pattern>): boolean => {
  const lowerValue = value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(lowerValue)
    }

    return pattern && lowerValue.endsWith(pattern.toLowerCase())
  })
}

export const anyWordMatchesAnyOf = (value: string, patterns: ReadonlyArray<Pattern>): boolean => {
  // Lower and trim the patterns once up front — doing it inside the word loop (as isAnyOf
  // would) repeats the work and its allocations for every word times every pattern.
  const stringPatterns: Array<string> = []
  const regexPatterns: Array<RegExp> = []

  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      regexPatterns.push(pattern)
    } else {
      stringPatterns.push(pattern.toLowerCase().trim())
    }
  }

  const words = value.toLowerCase().split(whitespaceRegex)

  for (const word of words) {
    for (const stringPattern of stringPatterns) {
      if (word === stringPattern) {
        return true
      }
    }

    for (const regexPattern of regexPatterns) {
      if (regexPattern.test(word)) {
        return true
      }
    }
  }

  return false
}
