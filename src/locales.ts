const placeholderRegex = /\{\{(\w+)\}\}/g
const escapableRegex = /[&<>"']/g

// Single-pass HTML escape of the five significant characters. Cheaper and lighter than a chained
// `replaceAll` (one scan instead of five), and the set is fixed by the spec so it never goes stale.
const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export const escapeHtml = (value: string): string => {
  return value.replace(escapableRegex, (char) => htmlEscapes[char])
}

// Interpolates `{{key}}` placeholders in a locale string with the given params. A placeholder
// with no matching own param stays in the output, so a missing key is visible in the UI.
export const t = (template: string, params: Record<string, string | number>): string => {
  return template.replace(placeholderRegex, (placeholder, key) => {
    return Object.hasOwn(params, key) ? String(params[key]) : placeholder
  })
}

// Like `t`, but for locale strings that contain markup (e.g. `<strong>{{name}}</strong>`). The
// template is trusted (developer-authored) and kept as-is; `{{key}}` params are untrusted and
// HTML-escaped, so the result is safe to render as HTML — the template's markup renders while
// param values render as inert text.
export const tx = (template: string, params: Record<string, string | number>): string => {
  return template.replace(placeholderRegex, (placeholder, key) => {
    return Object.hasOwn(params, key) ? escapeHtml(String(params[key])) : placeholder
  })
}
