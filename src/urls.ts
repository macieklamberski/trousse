import { endsWithAnyOf, isAnyOf } from './matching.js'

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

export const isHostOf = (url: string | URL, hosts: string | Array<string>): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = Array.isArray(hosts) ? hosts : [hosts]

  return isAnyOf(hostname, list)
}

export const isSubdomainOf = (url: string | URL, domains: string | Array<string>): boolean => {
  const hostname = parseUrl(url)?.hostname

  if (!hostname) {
    return false
  }

  const list = Array.isArray(domains) ? domains : [domains]

  return endsWithAnyOf(
    hostname,
    list.map((domain) => `.${domain}`),
  )
}
