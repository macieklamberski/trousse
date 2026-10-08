import { decodeHTMLStrict } from 'entities'
import { endsWithAnyOf, isAnyOf } from './matching.js'
import type { NormalizeOptions, RegistrableDomainOptions } from './types.js'

const httpSchemes = ['http:', 'https:']

export const parseUrl = (value: string | URL, base?: string | URL): URL | undefined => {
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

const wwwPrefixRegex = /^www\./
const ipv6BracketsRegex = /^\[|\]$/g

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

// After the leading scheme a lone `/` is a path separator, not a typo, so the relative path
// `/hp/support` is not `hp://support`. That separator needs a colon or at least two characters.
const leadingSchemeSeparator = String.raw`\.*(?::[:\s=.\\/]*|[\s=\\/][:\s=.\\/]+)`

// Doubled/nested scheme pattern - captures the INNER scheme which takes precedence.
// Matches: http:http://, https:https://, http://https//, htp://ttps://, etc. An inner match
// followed by `:` and a digit is a host with a port, as in `http://tps:8080`, and one followed by
// `:` and an `@` before any `/?#` is a username, as in `https://http:secret@host`. Both are skipped.
const doubledSchemeRegex = /* @__PURE__ */ new RegExp(
  String.raw`^\/?[htps]{2,7}${leadingSchemeSeparator}([htps]{2,7})(?!:\d|:[^/?#]*@)(${schemeSeparator})[.,:/]*(www[./]+)?`,
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
      pathname = pathname.replace(/\/+/g, '/')
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

// A host whose only other label is the top-level domain, like `www.com`, keeps its `www`.
export const stripWww = (hostname: string): string => {
  const stripped = hostname.replace(wwwPrefixRegex, '')

  return stripped.includes('.') ? stripped : hostname
}

// Expects a URL.hostname: it checks the shape only, so `999.1.1.1`, which the URL parser rejects,
// passes. URL.hostname wraps an IPv6 address in brackets, so they are accepted here.
export const isIpAddress = (hostname: string): boolean => {
  return ipv4Regex.test(hostname) || ipv6Regex.test(hostname.replace(ipv6BracketsRegex, ''))
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
