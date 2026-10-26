import { decodeHTMLStrict } from 'entities'
import { isNullish } from './is.js'
import { endsWithAnyOf, isAnyOf } from './matching.js'
import type { NormalizeOptions, Nullish, RegistrableDomainOptions } from './types.js'

const httpSchemes = ['http:', 'https:']

export const parseUrl = (value: Nullish<string | URL>, base?: string | URL): URL | undefined => {
  if (isNullish(value)) {
    return
  }

  if (value instanceof URL && base === undefined) {
    return value
  }

  // URL.parse returns null for invalid input, which skips the cost of a thrown error. Node 18 and
  // 20 lack it, so the constructor stays as the fallback.
  if (URL.parse) {
    return URL.parse(value, base) ?? undefined
  }

  try {
    return new URL(value, base)
  } catch {}
}

export const getPathSegments = (value: string | URL): Array<string> => {
  return parseUrl(value)?.pathname.split('/').filter(Boolean) ?? []
}

// A fully qualified `example.com.` ends in a dot that no domain pattern carries.
// See: https://www.rfc-editor.org/rfc/rfc1034#section-3.1.
const getHostname = (url: string | URL): string | undefined => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return
  }

  return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname
}

const nonAsciiRegex = /[\u0080-\uffff]/

// A domain pattern is read the way getHostname reads a hostname: trimmed, without the trailing dot
// of `example.com.`, and in punycode, as URL.hostname holds a Unicode domain like `bücher.de`.
// See: https://url.spec.whatwg.org/#concept-domain-to-ascii.
const normalizeDomain = (domain: string): string => {
  const trimmed = domain.trim()
  const bare = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed

  if (!nonAsciiRegex.test(bare)) {
    return bare
  }

  return parseUrl(`http://${bare}`)?.hostname ?? bare
}

export const isHostOf = (url: string | URL, hosts: string | ReadonlyArray<string>): boolean => {
  const hostname = getHostname(url)

  if (!hostname) {
    return false
  }

  const list = typeof hosts === 'string' ? [hosts] : hosts

  return isAnyOf(hostname, list.map(normalizeDomain))
}

export const isSubdomainOf = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): boolean => {
  const hostname = getHostname(url)

  if (!hostname) {
    return false
  }

  const list = typeof domains === 'string' ? [domains] : domains

  return endsWithAnyOf(
    hostname,
    list.map((domain) => `.${normalizeDomain(domain)}`),
  )
}

// See: https://fetch.spec.whatwg.org/#http-scheme.
export const isHttpUrl = (url: string | URL): boolean => {
  const scheme = parseUrl(url)?.protocol

  if (!scheme) {
    return false
  }

  return httpSchemes.includes(scheme)
}

export const isHostOrSubdomainOf = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): boolean => {
  return isHostOf(url, domains) || isSubdomainOf(url, domains)
}

// The labels in front of the first domain the hostname is a subdomain of, lowercased: `alice` for
// `alice.podbean.com`, `a.b` for `a.b.example.com`. A URL of another scheme keeps the case of its
// hostname, so it is lowercased here, as `isSubdomainOf` compares.
export const getSubdomain = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): string | undefined => {
  const hostname = getHostname(url)?.toLowerCase()

  if (!hostname) {
    return
  }

  const list = typeof domains === 'string' ? [domains] : domains

  for (const domain of list) {
    const suffix = `.${normalizeDomain(domain).toLowerCase()}`

    if (hostname.endsWith(suffix) && hostname.length > suffix.length) {
      return hostname.slice(0, -suffix.length)
    }
  }
}

// A path segment arrives percent-encoded, unlike a query value, which `searchParams` decodes. A
// malformed escape such as `%E0` returns undefined, so `decodeSegment(value) ?? value` keeps it.
// See: https://www.rfc-editor.org/rfc/rfc3986#section-2.1.
export const decodeSegment = (segment: string | undefined): string | undefined => {
  if (segment === undefined) {
    return
  }

  try {
    return decodeURIComponent(segment)
  } catch {}
}

const escapeRunRegex = /(?:%[0-9A-Fa-f]{2})+/g

// The byte count of the UTF-8 sequence a lead byte starts, or 0 for a byte no sequence starts with.
// See: https://www.rfc-editor.org/rfc/rfc3629#section-4.
const getSequenceLength = (byte: number): number => {
  if (byte < 0x80) {
    return 1
  }

  if (byte >= 0xc2 && byte < 0xe0) {
    return 2
  }

  if (byte >= 0xe0 && byte < 0xf0) {
    return 3
  }

  if (byte >= 0xf0 && byte < 0xf5) {
    return 4
  }

  return 0
}

const decodeEscapeRun = (run: string): string => {
  try {
    return decodeURIComponent(run)
  } catch {}

  const count = run.length / 3
  let decoded = ''
  let index = 0

  while (index < count) {
    const start = index * 3
    const length = getSequenceLength(Number.parseInt(run.slice(start + 1, start + 3), 16))

    if (length && index + length <= count) {
      try {
        decoded += decodeURIComponent(run.slice(start, start + length * 3))
        index += length
        continue
      } catch {}
    }

    decoded += run.slice(start, start + 3)
    index += 1
  }

  return decoded
}

// Decodes every escape that forms valid UTF-8 and keeps the rest as written, where
// `decodeURIComponent` throws and `URLSearchParams` writes U+FFFD. A `%` without two hex digits, or
// a byte of a legacy charset such as `%E9` for é in Latin-1, stays, so the url keeps its bytes.
export const decodePercent = (value: string): string => {
  return value.replace(escapeRunRegex, decodeEscapeRun)
}

const pathSegmentEscapeRegex = /[/?#\\\s]/g

// A decoded value written into a url path stays one segment. Only the characters that would open
// a new segment, a query or a fragment, and whitespace are escaped, so an `@`, `=`, `:` or `%` the
// value holds reads as written. A url parser reads `\` as `/` in an http path, so it is escaped.
export const encodePathSegment = (value: string): string => {
  return value.replace(pathSegmentEscapeRegex, (character) => encodeURIComponent(character))
}

// Every value of a query parameter whose name matches in any case, `?V=` for `v`, in query order.
export const getQueryParams = (
  params: URLSearchParams | undefined,
  name: string,
): Array<string> => {
  const values: Array<string> = []

  if (!params) {
    return values
  }

  const lowercaseName = name.toLowerCase()

  for (const [key, value] of params) {
    if (key.toLowerCase() === lowercaseName) {
      values.push(value)
    }
  }

  return values
}

// The first value of a query parameter whose name matches in any case, as `URLSearchParams.get`
// reads one in exact case.
export const getQueryParam = (
  params: URLSearchParams | undefined,
  name: string,
): string | undefined => {
  return getQueryParams(params, name)[0]
}

const queryPartEscapeRegex = /[&#%+\s]/g

// Name and value pairs joined into a query ready to append, or an empty string for none. Query
// readers hand back a decoded value, so a `%` or `+` it holds is escaped again, along with what
// would end a pair or the query and whitespace. An `@` stays as written.
export const composeQuery = (params?: Record<string, string | number>): string => {
  const escapePart = (part: string) => {
    return part.replace(queryPartEscapeRegex, (character) => encodeURIComponent(character))
  }
  const pairs = Object.entries(params ?? {}).map(([name, value]) => {
    return `${escapePart(name)}=${escapePart(String(value))}`
  })

  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}

// Keyed by the array itself, so an array changed after its first use keeps its old set.
const strippedParamsCache = new WeakMap<ReadonlyArray<string>, Set<string>>()

const getStrippedParamsSet = (params: ReadonlyArray<string>): Set<string> => {
  let cached = strippedParamsCache.get(params)

  if (!cached) {
    cached = new Set(params.map((param) => param.toLowerCase()))
    strippedParamsCache.set(params, cached)
  }

  return cached
}

const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

// IPv6 addresses have 2-7 colons with hex segments. This is intentionally loose - URL constructor
// validates the actual format, this just filters obvious non-IPv6 strings like single-label
// hostnames.
const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i

const wwwPrefixRegex = /^(?:www\.)+(?=.*\.)/
const ipv6BracketsRegex = /^\[|\]$/g
// A dot, a letter, then up to five letters or digits: `.xml` and `.ashx`, not the `.0` of `/rss/2.0`.
const fileExtensionRegex = /\.[a-z][a-z0-9]{0,5}$/i

// Only an unreserved character means the same encoded and literal. A reserved one like `+` or `,`
// can carry meaning to the server once decoded.
// See: https://www.rfc-editor.org/rfc/rfc3986#section-6.2.2.2.
const unreservedCharsRegex = /[a-zA-Z0-9._~-]/
const httpsLetterRegex = /s/i
const schemePrefixRegex = /^https?:\/\//
const percentEscapeOrLettersRegex = /%[0-9A-Fa-f]{2}|[A-Z]+/g
const plusRegex = /\+/g
const httpSchemeRegex = /^http:\/\//i
const httpsSchemeRegex = /^https:\/\//i

// A run after `scheme:` or `scheme%3A` belongs to a url carried in the path, `/web/{ts}/https://…`.
const repeatedSlashesRegex = /(?<!:|%3a)\/{2,}/gi

const leadingWhitespaceChars = [' ', '\t', '\n']
const relativeLeadChars = ['/', '.', '?', '#']
const localhostRegex = /^localhost(?:[:/?#]|$)/i
const schemeColonRegex = /^[^/]*:/
const missingColonSchemeRegex = /^https?[\s=.\\]*\/\//i

// Fast path: valid http(s):// followed by hostname char (excludes lone 'w' to avoid partial 'www').
const validUrlRegex = /^https?:\/\/(?:www\.|[a-vx-z0-9])/i

// A separator between a scheme and the rest carries at least one character that cannot appear in a
// hostname. A run of dots alone is a label boundary, so the host `tp.media` is not `tp://media`.
const schemeSeparator = String.raw`\.*[:\s=\\/][:\s=.\\/]*`

// A space a CMS left after the scheme also comes percent-encoded, as `%20` or `%C2%A0`. No host
// starts with one, so `http://%20example.com` is the space form of `http:// example.com`.
const separatorChar = String.raw`(?:[:\s=.\\/]|%20|%c2%a0)`

// After the leading scheme a lone `/` is a path separator, not a typo, so the relative path
// `/hp/support` is not `hp://support`. That separator needs a colon or at least two characters.
const leadingSchemeSeparator = String.raw`\.*(?::${separatorChar}*|[\s=\\/]${separatorChar}+)`

// Doubled/nested scheme pattern - captures the INNER scheme which takes precedence.
// Matches: http:http://, https:https://, http://https//, htp://ttps://, etc. An inner match
// followed by `:` and a digit is a host with a port, as in `http://tps:8080`, and one followed by
// an `@` before any `/?#\` is part of a username, as in `https://http:secret@host` or
// `https://http=user@host`. Both are skipped.
const doubledSchemeRegex = /* @__PURE__ */ new RegExp(
  String.raw`^\/?[htps]{2,7}${leadingSchemeSeparator}([htps]{2,7})(?!:\d|[^/?#\\]*@)(${schemeSeparator})[.,:/]*(www[./]+)?`,
  'i',
)

// Single malformed scheme pattern - for typos, wrong separators, etc. Must start with h (or /h)
// to be HTTP-like. Allows colons within letters (http:s//).
const singleMalformedRegex = /* @__PURE__ */ new RegExp(
  String.raw`^\/?(h[htps():]{1,10}|t{1,2}ps?)(${leadingSchemeSeparator})[.,:/]*(www[./]+)?`,
  'i',
)

// Without a colon, only a token spelled with both `t` and `p` reads as a scheme, so the host `hp`
// in `http://hp/support` and the relative path `hp//x` stay as they are.
const isSchemeToken = (token: string, separator: string): boolean => {
  const lowered = token.toLowerCase()

  return `${token}${separator}`.includes(':') || (lowered.includes('t') && lowered.includes('p'))
}

// Repairs a malformed http or https scheme: typos such as `htp://`, a missing, doubled or split
// colon, wrong separators or extra slashes, a doubled scheme, junk after it, `http(s)://`, and a
// misplaced `www` or one missing its dot.
export const fixMalformedScheme = (url: string): string => {
  // Fast path: valid URL without doubled scheme.
  if (validUrlRegex.test(url) && !doubledSchemeRegex.test(url)) {
    return url
  }

  const doubledMatch = doubledSchemeRegex.exec(url)

  if (doubledMatch && isSchemeToken(doubledMatch[1], doubledMatch[2])) {
    const inner = doubledMatch[1]
    const www = doubledMatch[3]
    const rest = url.slice(doubledMatch[0].length)
    const scheme = httpsLetterRegex.test(inner) ? 'https://' : 'http://'

    return `${scheme}${www ? 'www.' : ''}${rest}`
  }

  const singleMatch = singleMalformedRegex.exec(url)

  if (singleMatch && isSchemeToken(singleMatch[1], singleMatch[2])) {
    const fullMatch = singleMatch[0]
    const www = singleMatch[3]
    const rest = url.slice(fullMatch.length)
    const scheme = httpsLetterRegex.test(fullMatch) ? 'https://' : 'http://'

    return `${scheme}${www ? 'www.' : ''}${rest}`
  }

  return url
}

// A url carried inside another one, as a value or bare, holds its own `?` and `&`. The scheme can
// arrive percent-encoded, as in `?url=https%3A//host/a?b=1`, or be left off, as in `?url=//host/a`.
const nestedUrlRegex = /[a-z][a-z\d+.-]*(?::|%3A)(?:\/\/|%2F%2F)|(?<=[=?&])(?:\/\/|%2F%2F)/i
const httpOrSchemeRelativeRegex = /^(?:https?:)?\/\//i
// The lookbehind starts a match only at the head of a whitespace run, so a long run is read once.
const lostSeparatorRegex = /(?<!\s)\s+(?=[A-Za-z_][\w.-]*=)/g
const slashClosedValueRegex = /(=[^&/=]+)\/+(?=&|$)/g

// Repairs a query glued onto a url. The first `&` in the path before any `?` opens the query,
// whatever follows it, and a `?` inside a `name=value` pair becomes `&`. A `?` after a name with no
// `=` stays, and nothing from a nested url on is touched. Whitespace in place of the `&` before a
// pair, as in `h=abc123 portrait=0`, becomes `&`, and a `/` closing a value with no other slash, as
// in `set_id=123/&text=`, is dropped. A query carrying a url keeps its whitespace and slashes.
export const fixMalformedQuery = (url: string): string => {
  // A `data:` or `javascript:` value carries no query, so its `&` and `?` are content.
  if (!httpOrSchemeRelativeRegex.test(url)) {
    return url
  }

  const hashIndex = url.indexOf('#')
  const hasFragment = hashIndex !== -1
  const head = hasFragment ? url.slice(0, hashIndex) : url
  const fragment = hasFragment ? url.slice(hashIndex) : ''

  // Nothing from a nested url on is read: it keeps its own `?` and `&`.
  const authorityEnd = head.indexOf('//') + 2
  const nestedOffset = head.slice(authorityEnd).search(nestedUrlRegex)
  const hasNestedUrl = nestedOffset !== -1
  const ownEnd = hasNestedUrl ? authorityEnd + nestedOffset : head.length

  const markIndex = head.indexOf('?')
  const hasMark = markIndex !== -1 && markIndex < ownEnd

  // An `&` before the path is part of the credentials or the host, as in `https://a&b@host/`.
  const pathIndex = head.indexOf('/', authorityEnd)
  const pathEnd = hasMark ? markIndex : ownEnd
  const hasPath = pathIndex !== -1 && pathIndex < pathEnd
  const glueIndex = hasPath ? head.indexOf('&', pathIndex) : -1
  const isGlued = glueIndex !== -1 && glueIndex < pathEnd

  if (!isGlued && !hasMark) {
    return url
  }

  const queryIndex = isGlued ? glueIndex : markIndex
  // An `&` directly before the `?` opens an empty tail, as in `{id}&?rel=0`.
  const isEmptyTail = isGlued && head[glueIndex + 1] === '?'
  const queryStart = queryIndex + (isEmptyTail ? 2 : 1)
  let query = ''
  let hasValue = false

  for (let index = queryStart; index < ownEnd; index++) {
    const character = head[index]
    // Behind a glued tail the publisher's own `?` still starts parameters, as in `{id}&t?rel=0`.
    const isOwnMark = isGlued && index === markIndex
    const isSeparator = character === '?' && (hasValue || isOwnMark)

    if (isSeparator) {
      query += '&'
      hasValue = false
      continue
    }

    if (character === '&') {
      hasValue = false
    }

    if (character === '=') {
      hasValue = true
    }

    query += character
  }

  if (!hasNestedUrl) {
    query = query.replace(lostSeparatorRegex, '&').replace(slashClosedValueRegex, '$1')
  }

  return `${head.slice(0, queryIndex)}?${query}${head.slice(ownEnd)}${fragment}`
}

// A space as written or escaped, and a tab or line break escaped, since a url parser drops one
// written. `+` reads as a space in a query only. The lookbehind starts a match only at the head of
// a run, so a long run is read once.
const segmentEdgeSpace = '(?:\\s|%(?:09|0A|0D|20))'
const valueEdgeSpace = '(?:\\s|\\+|%(?:09|0A|0D|20))'
const segmentEdgeSpaceRegex = new RegExp(
  `^${segmentEdgeSpace}+|(?<!${segmentEdgeSpace})${segmentEdgeSpace}+$`,
  'gi',
)
const valueEdgeSpaceRegex = new RegExp(
  `^${valueEdgeSpace}+|(?<!${valueEdgeSpace})${valueEdgeSpace}+$`,
  'gi',
)

// A value of whitespace alone stays, so no segment collapses into its neighbours.
const trimEdgeSpace = (value: string, regex: RegExp): string => {
  return value.replace(regex, '') || value
}

const trimPairValue = (pair: string): string => {
  const equalsIndex = pair.indexOf('=')

  if (equalsIndex === -1) {
    return pair
  }

  const value = trimEdgeSpace(pair.slice(equalsIndex + 1), valueEdgeSpaceRegex)

  return `${pair.slice(0, equalsIndex + 1)}${value}`
}

// The url with whitespace stripped from both ends of every path segment and query value, as in
// `user_id=123@N03 &tags=` or `/photos/name%20/`. Names, the host and the fragment stay as written.
export const trimUrlValues = (url: string): string => {
  // A `data:` or `javascript:` value carries no path or query to trim.
  if (!httpOrSchemeRelativeRegex.test(url)) {
    return url
  }

  const hashIndex = url.indexOf('#')
  const head = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex)
  const markIndex = head.indexOf('?')
  const beforeQuery = markIndex === -1 ? head : head.slice(0, markIndex)
  const pathIndex = beforeQuery.indexOf('/', beforeQuery.indexOf('//') + 2)
  const authority = pathIndex === -1 ? beforeQuery : beforeQuery.slice(0, pathIndex)
  const segments = pathIndex === -1 ? [] : beforeQuery.slice(pathIndex).split('/')
  const path = segments.map((segment) => trimEdgeSpace(segment, segmentEdgeSpaceRegex)).join('/')
  const pairs = markIndex === -1 ? [] : head.slice(markIndex + 1).split('&')
  const query = markIndex === -1 ? '' : `?${pairs.map(trimPairValue).join('&')}`

  return `${authority}${path}${query}${fragment}`
}

// Feed pseudo-schemes, replaced as in `feed://host` or unwrapped as in `feed:https://host`.
// `feed:` is provisional in the IANA registry, the others are unregistered.
// See: https://www.iana.org/assignments/uri-schemes/prov/feed.
const feedSchemes = [
  'feed:',
  'rss:',
  'podcast:',
  'podcasts:',
  'pcast:',
  'itpc:',
  'itms:',
  'itms-pcast:',
  'itms-pcasts:',
  'itms-podcast:',
  'itms-podcasts:',
]

export const resolveFeedScheme = (url: string, scheme: 'http' | 'https' = 'https'): string => {
  // Feed schemes start with f, r, p, or i, so anything else returns before lowercasing the whole
  // URL. `| 32` lowercases an ASCII letter.
  const firstCharCode = url.charCodeAt(0) | 32

  if (
    firstCharCode !== 102 && // f
    firstCharCode !== 114 && // r
    firstCharCode !== 112 && // p
    firstCharCode !== 105 // i
  ) {
    return url
  }

  const urlLower = url.toLowerCase()

  for (const prefix of feedSchemes) {
    if (!urlLower.startsWith(prefix)) {
      continue
    }

    // Case 1: Wrapping scheme (e.g., feed:https://example.com).
    if (urlLower.startsWith(`${prefix}http://`) || urlLower.startsWith(`${prefix}https://`)) {
      return url.slice(prefix.length)
    }

    // Case 2: Replacing scheme (e.g., feed://example.com).
    if (urlLower.startsWith(`${prefix}//`)) {
      return `${scheme}:${url.slice(prefix.length)}`
    }
  }

  return url
}

// Adds a scheme to a scheme-relative URL like `//example.com` or a bare domain like
// `example.com/feed`. A path, a query, a fragment, or a host with no dot, such as `//Users/x`,
// stays as it is.
export const addMissingScheme = (url: string, scheme: 'http' | 'https' = 'https'): string => {
  // A bracketed IPv6 host holds colons, which the scheme check below would read as a scheme.
  if (url.startsWith('[')) {
    return parseUrl(`${scheme}://${url}`) ? `${scheme}://${url}` : url
  }

  // Skip if URL already has a real scheme. A scheme may hold a dot, as the registered `z39.50r`
  // does, but reading one as a host keeps `example.com:8080` from passing as a scheme.
  // See: https://www.rfc-editor.org/rfc/rfc3986#section-3.1.
  const colonIndex = url.indexOf(':')

  if (colonIndex > 0) {
    const beforeColon = url.slice(0, colonIndex)
    const hasScheme =
      !beforeColon.includes('.') && !beforeColon.includes('/') && !localhostRegex.test(url)

    if (hasScheme) {
      return url
    }
  }

  // Case 1: Scheme-relative URL (//example.com).
  if (url.startsWith('//') && !url.startsWith('///')) {
    const parsed = parseUrl(`${scheme}:${url}`)

    if (!parsed) {
      return url
    }

    const hostname = parsed.hostname

    if (hostname.includes('.') || hostname === 'localhost' || isIpAddress(hostname)) {
      return parsed.href
    }

    return url
  }

  // Case 2: Bare domain (example.com/feed).
  // Skip if is a path, a query or a fragment.
  if (relativeLeadChars.includes(url.charAt(0))) {
    return url
  }

  // Dot must be in the hostname (before first slash), not in the path.
  const slashIndex = url.indexOf('/')
  const dotIndex = url.indexOf('.')

  if (dotIndex === -1 || (slashIndex !== -1 && dotIndex > slashIndex)) {
    // Exception: localhost is valid without a dot.
    if (!localhostRegex.test(url)) {
      return url
    }
  }

  const firstChar = url.charAt(0)

  if (leadingWhitespaceChars.includes(firstChar)) {
    return url
  }

  return `${scheme}://${url}`
}

// Swaps an existing http or https scheme on a URL. Scheme-relative URLs (`//host`) and other
// schemes (`mailto:`, `data:`, `ftp://`) are left unchanged, and so is any later `http://` inside
// the path or query.
export const upgradeScheme = (url: string, scheme: 'http' | 'https' = 'https'): string => {
  const sourceRegex = scheme === 'https' ? httpSchemeRegex : httpsSchemeRegex

  if (!sourceRegex.test(url)) {
    return url
  }

  const parsed = parseUrl(url)

  if (!parsed) {
    return url.replace(sourceRegex, `${scheme}://`)
  }

  // The setter drops a port that is the new scheme's default, so `http://a.com:443` becomes
  // `https://a.com/`, and `https://a.com:443` arrives already parsed to `https://a.com/`.
  // See: https://url.spec.whatwg.org/#scheme-state.
  parsed.protocol = scheme

  return parsed.href
}

// Turns a raw reference from markup or user input into the http(s) URL to fetch. It decodes HTML
// character references, so a second pass can change the URL: a URL that is already final, like a
// response URL or a Location header, goes through parseUrl instead.
export const resolveUrl = (url: string, base?: string): string | undefined => {
  // The repair steps below match from the start of the string, so surrounding whitespace goes
  // first. `trim` also strips NBSP and U+FEFF, which the URL parser keeps as part of the URL.
  // See: https://url.spec.whatwg.org/#concept-basic-url-parser.
  const trimmedUrl = url.trim()

  // An empty href would resolve to the base itself.
  if (!trimmedUrl) {
    return
  }

  // Fragment-only URLs can only be resolved against a base URL.
  if (trimmedUrl.startsWith('#') && !base) {
    return
  }

  let resolvedUrl: string | undefined

  // Step 1: Decode HTML entities to recover the intended URL.
  // URLs in XML/HTML are often entity-encoded (e.g., &amp; for &). Strict decoding only expands
  // entities with a trailing semicolon, so a query parameter whose name matches an entity (e.g.
  // `?id=1&copy=2`) is left intact instead of being mangled into `?id=1©=2`.
  resolvedUrl = trimmedUrl.includes('&') ? decodeHTMLStrict(trimmedUrl) : trimmedUrl

  // Step 2: Convert feed-related schemes.
  resolvedUrl = resolveFeedScheme(resolvedUrl)

  // Step 3: Fix malformed HTTP/HTTPS schemes. With a base, a browser reads an href with no colon
  // before its first `/` as a relative path, so `tps//x` and `/http://other.com/x` stay on the
  // base host. Only an exact `http` or `https` then `//`, as in `http//x`, reads as a scheme.
  if (!base || schemeColonRegex.test(resolvedUrl) || missingColonSchemeRegex.test(resolvedUrl)) {
    resolvedUrl = fixMalformedScheme(resolvedUrl)
  }

  // Step 4: Resolve relative URLs if base is provided.
  if (base) {
    // An invalid base fails the parse even for an absolute href, so the href is parsed again alone.
    const resolved = parseUrl(resolvedUrl, base) ?? parseUrl(resolvedUrl)

    if (!resolved) {
      return
    }

    // An absolute http(s) href needs no scheme repair and reparsing it changes nothing, so return
    // it directly.
    if (isHttpUrl(resolved)) {
      return resolved.href
    }

    resolvedUrl = resolved.href
  }

  // Step 5: Add scheme if missing (handles both // and bare domains).
  resolvedUrl = addMissingScheme(resolvedUrl)

  // Step 6: Validate and reject non-HTTP(S) schemes.
  const parsed = parseUrl(resolvedUrl)

  if (!parsed || !isHttpUrl(parsed)) {
    return
  }

  return parsed.href
}

const decodeAndNormalizeEncoding = (value: string): string => {
  if (!value.includes('%')) {
    return value
  }

  // Decodes unnecessarily percent-encoded characters and normalizes encoding to uppercase.
  return value.replace(/%([0-9A-Fa-f]{2})/g, (_match, hex) => {
    const charCode = Number.parseInt(hex, 16)
    const char = String.fromCharCode(charCode)

    if (unreservedCharsRegex.test(char)) {
      return char
    }

    // Keep encoded but normalize to uppercase.
    return `%${hex.toUpperCase()}`
  })
}

// Applies the form-urlencoded rules for a key by hand. `new URLSearchParams(pair)` turns a
// malformed escape like `%E0` into U+FFFD, which would sort distinct malformed keys as one.
const decodeQueryKey = (pair: string): string => {
  const key = pair.split('=')[0].replace(plusRegex, ' ')

  try {
    return decodeURIComponent(key)
  } catch {
    return key
  }
}

// Orders two pairs by their decoded key, comparing code units the way searchParams.sort does.
// See: https://url.spec.whatwg.org/#dom-urlsearchparams-sort.
const compareQueryPairs = (a: string, b: string): number => {
  const keyA = decodeQueryKey(a)
  const keyB = decodeQueryKey(b)

  if (keyA < keyB) {
    return -1
  }

  if (keyA > keyB) {
    return 1
  }

  return 0
}

// Lowercases the literal characters of a pair while leaving percent escapes alone, so the raw
// encoding survives, hex case included.
const lowercaseQueryPair = (pair: string): string => {
  return pair.replace(percentEscapeOrLettersRegex, (match) => {
    return match.startsWith('%') ? match : match.toLowerCase()
  })
}

// Builds a key for comparing URLs, not a URL to fetch. Several options produce a string a server
// may answer differently, or one no URL parser reads back the same.
// See: https://www.rfc-editor.org/rfc/rfc3986#section-6.
export const normalizeUrl = (url: string, options: NormalizeOptions): string => {
  try {
    // The parser percent-encodes the path, query and fragment and already applies NFC to the host,
    // so NFC only has an effect on the raw string.
    const parsed = new URL(options.normalizeUnicode ? url.normalize('NFC') : url)

    // Before stripWww, which keeps `www.com` whole only once the dot is gone.
    if (options.stripHostTrailingDot && parsed.hostname.endsWith('.')) {
      parsed.hostname = parsed.hostname.slice(0, -1)
    }

    if (options.stripAuthentication) {
      parsed.username = ''
      parsed.password = ''
    }

    if (options.stripWww) {
      parsed.hostname = stripWww(parsed.hostname)
    }

    if (options.stripHash) {
      parsed.hash = ''
    }

    let pathname = parsed.pathname

    if (options.normalizeEncoding) {
      pathname = decodeAndNormalizeEncoding(pathname)
    }

    if (options.collapseSlashes) {
      pathname = pathname.replace(repeatedSlashesRegex, '/')
    }

    if (options.stripTrailingSlash && pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }

    parsed.pathname = pathname

    // Writing an empty search or hash drops the bare `?` or `#` a URL ends with.
    if (options.normalizeEncoding && parsed.search.includes('%')) {
      parsed.search = decodeAndNormalizeEncoding(parsed.search)
    }

    if (options.normalizeEncoding && parsed.hash.includes('%')) {
      parsed.hash = decodeAndNormalizeEncoding(parsed.hash)
    }

    if (options.stripQuery) {
      parsed.search = ''
    }

    // Query parameters are edited as raw `key=value` pairs. Going through searchParams instead
    // would re-serialize the whole query as form data on any write, so a query a server routes on
    // literally, like `?/feeds/atom10.xml`, would come back as `?%2Ffeeds%2Fatom10.xml=` and stop
    // resolving to the feed.
    if (parsed.search && (options.stripQueryParams || options.lowercaseQuery)) {
      let pairs = parsed.search.slice(1).split('&')

      // Remove tracking/specified parameters (case-insensitive). An empty pair goes too, or a
      // stripped `?a=1&utm_source=x&` would keep a separator `?a=1` lacks.
      if (options.stripQueryParams) {
        const strippedSet = getStrippedParamsSet(options.stripQueryParams)
        pairs = pairs.filter((pair) => pair && !strippedSet.has(decodeQueryKey(pair).toLowerCase()))
      }

      if (options.lowercaseQuery) {
        pairs = pairs.map(lowercaseQueryPair)
      }

      parsed.search = pairs.join('&')
    }

    // Sort query parameters. A query holding one pair is already in order, so only a query with a
    // separator is worth splitting. Empty pairs go out first, or they sort ahead of everything and
    // turn `?b=1&` into `?&b=1`.
    if (options.sortQueryParams && parsed.search.includes('&')) {
      const pairs = parsed.search.slice(1).split('&').filter(Boolean)
      parsed.search = pairs.sort(compareQueryPairs).join('&')
    }

    // A bare `?` reads as an empty search, and writing an empty search drops it.
    if (options.stripEmptyQuery && parsed.search === '') {
      parsed.search = ''
    }

    let result = parsed.href

    // Strip root slash: URL.href always includes "/" for root paths.
    if (options.stripRootSlash && result === `${parsed.origin}/`) {
      result = parsed.origin
    }

    if (options.stripScheme ?? options.stripProtocol) {
      result = result.replace(schemePrefixRegex, '')
    }

    return result
  } catch {
    return url
  }
}

// Strips every leading `www` label. A host whose only other label is the top-level domain, like
// `www.com`, keeps its last `www`.
export const stripWww = (hostname: string): string => {
  return hostname.replace(wwwPrefixRegex, '')
}

// Expects a URL.hostname: it checks the shape only, so `999.1.1.1`, which the URL parser rejects,
// passes. URL.hostname wraps an IPv6 address in brackets, so they are accepted here.
export const isIpAddress = (hostname: string): boolean => {
  return ipv4Regex.test(hostname) || ipv6Regex.test(hostname.replace(ipv6BracketsRegex, ''))
}

// The forms one address is commonly reachable under: each scheme, with and without `www.`, with
// and without a trailing slash. A path ending in a file extension gets no trailing slash variant.
export const createUrlVariants = (url: string): Array<string> => {
  const parsed = parseUrl(url)

  if (!parsed || !isHttpUrl(parsed)) {
    return []
  }

  const hostname = stripWww(parsed.hostname)
  const hostnames = [hostname]

  if (hostname.includes('.') && !isIpAddress(hostname)) {
    hostnames.push(`www.${hostname}`)
  }

  const hasTrailingSlash = parsed.pathname.endsWith('/')
  const pathname = hasTrailingSlash ? parsed.pathname.slice(0, -1) : parsed.pathname
  const pathnames = [pathname]

  if (pathname && (hasTrailingSlash || !fileExtensionRegex.test(pathname))) {
    pathnames.push(`${pathname}/`)
  }

  const variants: Array<string> = []

  for (const scheme of ['https:', 'http:']) {
    for (const variantHostname of hostnames) {
      for (const variantPathname of pathnames) {
        const variant = new URL(parsed.href)
        variant.protocol = scheme
        variant.hostname = variantHostname
        variant.pathname = variantPathname
        variants.push(variant.href)
      }
    }
  }

  return variants
}

// Query spellings a server reads as the same value, each swapped as a whole in either direction.
// The path keeps its spelling: a path `@` written as `%40` returns 404 or a block page on Medium.
const sameQuerySpellings: Array<[string, string]> = [
  ['+', '%20'],
  [':', '%3A'],
  ['@', '%40'],
]

const percentEscapeRegex = /%[0-9a-f]{2}/gi

// A url written without an escape gets no lowercase form, so it costs no extra lookup.
const addLowercaseHexSpellings = (url: string, spellings: Array<string>): Array<string> => {
  if (url.search(percentEscapeRegex) === -1) {
    return [...new Set(spellings)]
  }

  const lowercaseHexSpellings = spellings.map((spelling) => {
    return spelling.replace(percentEscapeRegex, (hex) => hex.toLowerCase())
  })

  return [...new Set([...spellings, ...lowercaseHexSpellings])]
}

// The url, then every combination of the spellings that serve the same feed: percent-escape hex as
// written, uppercased or lowercased, and each pair of `sameQuerySpellings` written or encoded across
// the query. The path keeps its spelling apart from the hex case.
export const createUrlSpellings = (url: string): Array<string> => {
  const uppercaseHexUrl = url.replace(percentEscapeRegex, (hex) => hex.toUpperCase())
  let spellings = [...new Set([url, uppercaseHexUrl])]
  const hashIndex = url.indexOf('#')
  const queryEnd = hashIndex === -1 ? url.length : hashIndex
  const queryIndex = url.indexOf('?')

  if (queryIndex === -1 || queryIndex > queryEnd) {
    return addLowercaseHexSpellings(url, spellings)
  }

  for (const [written, encoded] of sameQuerySpellings) {
    const swapped = spellings.flatMap((spelling) => {
      const fragmentIndex = spelling.indexOf('#')
      const spellingQueryEnd = fragmentIndex === -1 ? spelling.length : fragmentIndex
      const head = spelling.slice(0, queryIndex)
      const query = spelling.slice(queryIndex, spellingQueryEnd)
      const fragment = spelling.slice(spellingQueryEnd)

      return [
        `${head}${query.replaceAll(encoded, written)}${fragment}`,
        `${head}${query.replaceAll(written, encoded)}${fragment}`,
      ]
    })

    spellings = [...new Set(swapped)]
  }

  return addLowercaseHexSpellings(url, [url, ...spellings])
}

// Two-label public suffixes take the form generic-second-level under a country code: co.uk,
// com.au, edu.pl. Matching the shape covers the common ones without carrying the list.
const genericSecondLevels = [
  'ac',
  'co',
  'com',
  'edu',
  'go',
  'gob',
  'gov',
  'id',
  'ne',
  'net',
  'or',
  'org',
]

type SuffixRules = {
  names: Set<string>
  wildcards: Set<string>
  exceptions: Set<string>
}

// Keyed by the array itself, so an array changed after its first use keeps its old rules.
const suffixRulesCache = new WeakMap<ReadonlyArray<string>, SuffixRules>()

// A rule is a domain, or one with a leading `*.` wildcard or `!` exception. The list writes rules
// in Unicode, so they go through the same punycode step as a hostname.
const getSuffixRules = (suffixes: ReadonlyArray<string>): SuffixRules => {
  let cached = suffixRulesCache.get(suffixes)

  if (cached) {
    return cached
  }

  cached = { names: new Set(), wildcards: new Set(), exceptions: new Set() }

  for (const entry of suffixes) {
    const rule = entry.toLowerCase()

    if (rule.startsWith('!')) {
      cached.exceptions.add(normalizeDomain(rule.slice(1)))
      continue
    }

    if (rule.startsWith('*.')) {
      cached.wildcards.add(normalizeDomain(rule.slice(2)))
      continue
    }

    cached.names.add(normalizeDomain(rule))
  }

  suffixRulesCache.set(suffixes, cached)

  return cached
}

// The number of labels in the public suffix, by the list's prevailing rule: an exception rule
// wins, then the rule with the most labels, then the implicit `*` covering the last label.
// See: https://github.com/publicsuffix/list/wiki/Format#formal-algorithm.
const getPublicSuffixLength = (labels: Array<string>, rules: SuffixRules): number => {
  for (let index = 0; index < labels.length; index++) {
    if (rules.exceptions.has(labels.slice(index).join('.'))) {
      return labels.length - index - 1
    }
  }

  for (let index = 0; index < labels.length; index++) {
    if (rules.names.has(labels.slice(index).join('.'))) {
      return labels.length - index
    }

    if (index + 1 < labels.length && rules.wildcards.has(labels.slice(index + 1).join('.'))) {
      return labels.length - index
    }
  }

  return 1
}

// The name a site owner registered, plus its public suffix, so every subdomain of a hosting
// platform resolves to one name. Never returns more labels than the host it came from. Given
// `suffixes`, the Public Suffix List rules decide where the suffix starts.
export const getRegistrableDomain = (
  url: string | URL,
  options?: RegistrableDomainOptions,
): string | undefined => {
  const hostname = getHostname(url)?.toLowerCase()

  if (!hostname) {
    return
  }

  if (isIpAddress(hostname)) {
    return hostname
  }

  const parts = hostname.split('.')

  if (options?.suffixes) {
    const suffixLength = getPublicSuffixLength(parts, getSuffixRules(options.suffixes))

    return parts.slice(-Math.min(suffixLength + 1, parts.length)).join('.')
  }

  if (parts.length <= 2) {
    return hostname
  }

  const [secondLevel, topLevel] = parts.slice(-2)
  const labels = topLevel.length === 2 && genericSecondLevels.includes(secondLevel) ? 3 : 2

  return parts.slice(-labels).join('.')
}

/** @deprecated Use `fixMalformedScheme` instead. */
export const fixMalformedProtocol = fixMalformedScheme

/** @deprecated Use `resolveFeedScheme` instead. */
export const resolveFeedProtocol = resolveFeedScheme

/** @deprecated Use `addMissingScheme` instead. */
export const addMissingProtocol = addMissingScheme

/** @deprecated Use `upgradeScheme` instead. */
export const upgradeProtocol = upgradeScheme
