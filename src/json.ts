// Mirrors the regex \s character set exactly: ECMAScript WhiteSpace and LineTerminator.
const isWhitespaceCode = (code: number): boolean => {
  return (
    (code >= 0x09 && code <= 0x0d) ||
    code === 0x20 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000 ||
    code === 0xfeff
  )
}

// Scans from both ends instead of testing regexes: an unanchored /\}\s*$/ attempts a match
// at every closing brace, which costs milliseconds per call on multi-megabyte documents.
export const isJsonLike = (value: string): boolean => {
  if (value.length < 2) {
    return false
  }

  let start = 0
  let end = value.length - 1

  while (start < end && isWhitespaceCode(value.charCodeAt(start))) {
    start++
  }

  while (end > start && isWhitespaceCode(value.charCodeAt(end))) {
    end--
  }

  const first = value.charCodeAt(start)
  const last = value.charCodeAt(end)

  // 123/125 are curly braces, 91/93 are square brackets.
  return (first === 123 && last === 125) || (first === 91 && last === 93)
}

export const isParseableJson = (value: string): boolean => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
