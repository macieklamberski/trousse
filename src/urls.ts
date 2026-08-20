import { endsWithAnyOf, isAnyOf } from './matching.js'

const toDotPrefixed = (domain: string): string => {
  return `.${domain}`
}

export const parseUrl = (value: string | URL, base?: string | URL): URL | undefined => {
  if (value instanceof URL && base === undefined) {
    return value
  }

  try {
    return new URL(value, base)
  } catch {}
}

export const getPathSegments = (value: string | URL): Array<string> => {
  return parseUrl(value)?.pathname.split('/').filter(Boolean) ?? []
}

export const isHostOf = (url: string | URL, hosts: string | ReadonlyArray<string>): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = typeof hosts === 'string' ? [hosts] : hosts

  return isAnyOf(hostname, list)
}

// Whether the url sits at the domain or anywhere under it, which is what a check keyed on a
// platform usually means: `isHostOf` alone misses `www.` and every regional host, and pairing
// the two by hand parses the url twice. Ask for one of the halves directly where the difference
// matters, such as a host whose subdomains belong to other people.
export const isDomainOf = (url: string | URL, domains: string | ReadonlyArray<string>): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = typeof domains === 'string' ? [domains] : domains

  return isAnyOf(hostname, list) || endsWithAnyOf(hostname, list.map(toDotPrefixed))
}

export const isSubdomainOf = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = typeof domains === 'string' ? [domains] : domains

  return endsWithAnyOf(hostname, list.map(toDotPrefixed))
}

// `decodeURIComponent` throws on a malformed escape such as `%zz`, so a value read out of a url
// cannot be decoded without a guard. Answers undefined instead, leaving the caller to drop the
// value or to keep the raw one with `?? value`.
export const decodeUrlComponent = (value: string): string | undefined => {
  try {
    return decodeURIComponent(value)
  } catch {}
}
