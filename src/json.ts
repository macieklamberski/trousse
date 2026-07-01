const jsonObjectStartRegex = /^\s*\{/
const jsonObjectEndRegex = /\}\s*$/
const jsonArrayStartRegex = /^\s*\[/
const jsonArrayEndRegex = /\]\s*$/

export const isJsonLike = (value: string): boolean => {
  if (value.length < 2) {
    return false
  }

  return (
    (jsonObjectStartRegex.test(value) && jsonObjectEndRegex.test(value)) ||
    (jsonArrayStartRegex.test(value) && jsonArrayEndRegex.test(value))
  )
}

export const isParseableJson = (value: string): boolean => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
