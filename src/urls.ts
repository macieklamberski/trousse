import { endsWithAnyOf, isAnyOf } from './matching.js'

const httpProtocols = ['http:', 'https:']

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

export const isSubdomainOf = (
  url: string | URL,
  domains: string | ReadonlyArray<string>,
): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = typeof domains === 'string' ? [domains] : domains

  return endsWithAnyOf(
    hostname,
    list.map((domain) => `.${domain}`),
  )
}

export const isHttpUrl = (url: string | URL): boolean => {
  const protocol = parseUrl(url)?.protocol

  if (!protocol) {
    return false
  }

  return httpProtocols.includes(protocol)
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
  const hostname = parseUrl(url)?.hostname.toLowerCase()

  if (!hostname) {
    return
  }

  const list = typeof domains === 'string' ? [domains] : domains

  for (const domain of list) {
    const suffix = `.${domain.toLowerCase()}`

    if (hostname.endsWith(suffix) && hostname.length > suffix.length) {
      return hostname.slice(0, -suffix.length)
    }
  }
}

// A path segment arrives percent-encoded, unlike a query value, which `searchParams` decodes. A
// malformed escape such as `%E0` returns undefined, so `decodeSegment(value) ?? value` keeps it.
export const decodeSegment = (segment: string | undefined): string | undefined => {
  if (segment === undefined) {
    return
  }

  try {
    return decodeURIComponent(segment)
  } catch {}
}
