import { isNullish } from './is.js'
import type { Pattern } from './types.js'

const whitespaceRegex = /\s+/
// A backslash before `-` or a punctuator the `v` flag reserves when doubled (`&&`, `==`) is a
// syntax error under `u`, so those take a hex escape. Syntax characters and `/` take a backslash.
const regexSyntaxCharsRegex = /[.*+?^${}()|[\]\\/]/
const regexEscapableCharsRegex = /[.*+?^${}()|[\]\\/&!#%,:;<=>@`~-]/g

// Escapes a literal so it can be interpolated into a regex source string, for the common case
// of building one pattern out of a list of plain strings. The result stays valid inside and
// outside a character class under every flag.
export const escapeRegex = (value: string): string => {
  return value.replace(regexEscapableCharsRegex, (char) => {
    if (regexSyntaxCharsRegex.test(char)) {
      return `\\${char}`
    }

    return `\\x${char.charCodeAt(0).toString(16)}`
  })
}

// A custom parser owns normalization, so the patterns are compared as written when one is given.
export const isAnyOf = (
  value: string | undefined,
  patterns: Pattern | ReadonlyArray<Pattern>,
  parser?: (value: string) => string,
): boolean => {
  if (isNullish(value)) {
    return false
  }

  const parsedValue = parser ? parser(value) : value.toLowerCase().trim()
  const list = typeof patterns === 'string' || patterns instanceof RegExp ? [patterns] : patterns

  return list.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(parsedValue)
    }

    return parsedValue === (parser ? pattern : pattern.toLowerCase().trim())
  })
}

// Returns the list entry the value matches, so a caller can emit the entry's own spelling.
export const getAnyOf = <T extends string>(
  value: string | undefined,
  patterns: ReadonlyArray<T>,
  parser?: (value: string) => string,
): T | undefined => {
  if (isNullish(value)) {
    return
  }

  const parsedValue = parser ? parser(value) : value.toLowerCase().trim()

  return patterns.find((pattern) => {
    return parsedValue === (parser ? pattern : pattern.toLowerCase().trim())
  })
}

export const includesAnyOf = (
  value: string | undefined,
  patterns: ReadonlyArray<Pattern>,
  parser?: (value: string) => string,
): boolean => {
  if (isNullish(value)) {
    return false
  }

  const parsedValue = parser ? parser(value) : value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(parsedValue)
    }

    return pattern && parsedValue.includes(parser ? pattern : pattern.toLowerCase())
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
