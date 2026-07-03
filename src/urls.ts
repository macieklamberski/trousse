import { endsWithAnyOf, isAnyOf } from './matching.js'

export const isHostOf = (url: string | URL, hosts: string | Array<string>): boolean => {
  try {
    const hostname = (url instanceof URL ? url : new URL(url)).hostname
    const list = Array.isArray(hosts) ? hosts : [hosts]

    return isAnyOf(hostname, list)
  } catch {}

  return false
}

export const isSubdomainOf = (url: string | URL, domains: string | Array<string>): boolean => {
  try {
    const hostname = (url instanceof URL ? url : new URL(url)).hostname
    const list = Array.isArray(domains) ? domains : [domains]

    return endsWithAnyOf(
      hostname,
      list.map((domain) => `.${domain}`),
    )
  } catch {}

  return false
}
