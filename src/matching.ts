import { isNullish } from './is.js'
import type { Pattern } from './types.js'

const whitespaceRegex = /\s+/
// A backslash before `-` or a punctuator the `v` flag reserves when doubled (`&&`, `==`) is a
// syntax error under `u`, so those take a hex escape. Syntax characters and `/` take a backslash.
const regexSyntaxCharsRegex = /[.*+?^${}()|[\]\\/]/
const regexEscapableCharsRegex = /[.*+?^${}()|[\]\\/&!#%,:;<=>@`~-]/g

// A global or sticky regex resumes from its lastIndex, so a shared pattern would alternate
// between matching and missing the same value.
const testRegex = (regex: RegExp, value: string): boolean => {
  regex.lastIndex = 0

  return regex.test(value)
}

// A RegExp pattern meets the value lowercased, as a string pattern does, then in its original case,
// so `/^Foo$/` matches `Foo` while `/\/rss\//` still matches `/RSS/`.
const testRegexAnyCase = (regex: RegExp, lowerValue: string, value: string): boolean => {
  return testRegex(regex, lowerValue) || (lowerValue !== value && testRegex(regex, value))
}

// Escapes a literal for a regex source string, valid inside and outside a character class under
// every flag. RegExp.escape also escapes a leading letter or digit and whitespace, and Node 18 and
// 20 lack it. See: https://tc39.es/ecma262/#sec-regexp.escape.
export const escapeRegex = (value: string): string => {
  return value.replace(regexEscapableCharsRegex, (char) => {
    if (regexSyntaxCharsRegex.test(char)) {
      return `\\${char}`
    }

    return `\\x${char.charCodeAt(0).toString(16)}`
  })
}

// A custom parser owns normalization, so the patterns are compared as written when one is given.
// Without one, matching lowercases with toLowerCase, wider than ASCII case-insensitive, so the
// Kelvin sign matches `k`. See: https://infra.spec.whatwg.org/#ascii-case-insensitive.
export const isAnyOf = (
  value: string | undefined,
  patterns: Pattern | ReadonlyArray<Pattern>,
  parser?: (value: string) => string,
): boolean => {
  if (isNullish(value)) {
    return false
  }

  const parsedValue = parser ? parser(value) : value.toLowerCase().trim()
  const originalValue = parser ? parsedValue : value.trim()
  const list = typeof patterns === 'string' || patterns instanceof RegExp ? [patterns] : patterns

  return list.some((pattern) => {
    if (pattern instanceof RegExp) {
      return testRegexAnyCase(pattern, parsedValue, originalValue)
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
  const originalValue = parser ? parsedValue : value

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return testRegexAnyCase(pattern, parsedValue, originalValue)
    }

    return pattern && parsedValue.includes(parser ? pattern : pattern.toLowerCase())
  })
}

export const startsWithAnyOf = (value: string, patterns: ReadonlyArray<Pattern>): boolean => {
  const lowerValue = value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return testRegexAnyCase(pattern, lowerValue, value)
    }

    return pattern && lowerValue.startsWith(pattern.toLowerCase())
  })
}

export const endsWithAnyOf = (value: string, patterns: ReadonlyArray<Pattern>): boolean => {
  const lowerValue = value.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      return testRegexAnyCase(pattern, lowerValue, value)
    }

    return pattern && lowerValue.endsWith(pattern.toLowerCase())
  })
}

export const anyWordMatchesAnyOf = (value: string, patterns: ReadonlyArray<Pattern>): boolean => {
  // The patterns are lowered and trimmed once, outside the word loop, or the work and its
  // allocations would repeat for every word times every pattern.
  const stringPatterns: Array<string> = []
  const regexPatterns: Array<RegExp> = []

  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      regexPatterns.push(pattern)
      continue
    }

    const stringPattern = pattern.toLowerCase().trim()

    if (stringPattern) {
      stringPatterns.push(stringPattern)
    }
  }

  const words = value.split(whitespaceRegex)

  for (const word of words) {
    const lowerWord = word.toLowerCase()

    for (const stringPattern of stringPatterns) {
      if (lowerWord === stringPattern) {
        return true
      }
    }

    for (const regexPattern of regexPatterns) {
      if (testRegexAnyCase(regexPattern, lowerWord, word)) {
        return true
      }
    }
  }

  return false
}
