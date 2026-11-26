// The characters that count as blank. U+FEFF, the byte order mark, is not White_Space, but `trim`
// strips it and it is never text.
// See: https://www.unicode.org/reports/tr44/#White_Space.
export const blankCharacterClass = '[\\p{White_Space}\\uFEFF]'
