import { escapeUTF8 } from 'entities'

const placeholderRegex = /\{\{(\w+)\}\}/g

export const escapeHtml = (value: string): string => {
  return escapeUTF8(value)
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
