import { isAnyOf } from './matching.js'
import type { LocaleSegmentOptions } from './types.js'

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

const languageNames = /* @__PURE__ */ new Intl.DisplayNames(['en'], {
  type: 'language',
  fallback: 'none',
})

// ISO 639 special-purpose codes, which CLDR names on some runtimes but no site uses as a locale.
const specialPurposeCodes = ['und', 'mul', 'zxx']

// Whether a url path segment, such as `fr` or `pt-br`, is a language tag the runtime's CLDR data
// names. A word such as `api` or `feed`, or a well-formed tag CLDR has no name for, is not.
// BCP 47 separates subtags with `-`, so `fr_FR` counts only with the `underscore` option.
export const isLocaleSegment = (segment: string, options?: LocaleSegmentOptions): boolean => {
  if (isAnyOf(segment, specialPurposeCodes)) {
    return false
  }

  const tag = options?.underscore ? segment.replaceAll('_', '-') : segment

  try {
    return languageNames.of(tag) !== undefined
  } catch {
    return false
  }
}

const regionNames = /* @__PURE__ */ new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
})

// ISO 3166 user-assigned codes CLDR names for its own use: an unknown region, outlying Oceania and
// two pseudo-locales. XK, also user-assigned, stays in since sites use it for Kosovo.
const specialPurposeRegions = ['zz', 'qo', 'xa', 'xb']

// Whether a url path segment, such as `us` or `419`, names a country or region in the runtime's
// CLDR data. It accepts a bare region code only: a locale with a region, such as `en-us`, is
// `isLocaleSegment`'s job. Node names only an uppercase code, so the segment is uppercased first.
export const isRegionSegment = (segment: string): boolean => {
  if (isAnyOf(segment, specialPurposeRegions)) {
    return false
  }

  try {
    return regionNames.of(segment.toUpperCase()) !== undefined
  } catch {
    return false
  }
}
