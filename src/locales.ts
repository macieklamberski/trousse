const placeholderRegex = /\{\{(\w+)\}\}/g
const escapableRegex = /[&<>"']/g

// Escapes the five characters that make text safe inside an element and inside a single- or
// double-quoted attribute. HTML's own serializer escapes a different set and never `'`.
// See: https://html.spec.whatwg.org/multipage/parsing.html#escapingString.
export const escapeHtml = (value: string): string => {
  return value.replace(escapableRegex, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

// Interpolates `{{key}}` placeholders in a locale string with the given params. A placeholder
// with no matching own param stays in the output, so a missing key is visible in the UI.
export const t = (template: string, params: Record<string, string | number>): string => {
  return template.replace(placeholderRegex, (placeholder, key) => {
    return Object.hasOwn(params, key) ? String(params[key]) : placeholder
  })
}

// Like `t`, for a locale string holding markup such as `<strong>{{name}}</strong>`. The template is
// trusted and kept as is, while each param is HTML-escaped, so a param renders as inert text.
export const tx = (template: string, params: Record<string, string | number>): string => {
  return template.replace(placeholderRegex, (placeholder, key) => {
    return Object.hasOwn(params, key) ? escapeHtml(String(params[key])) : placeholder
  })
}
