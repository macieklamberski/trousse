export const isHostOf = (url: string | URL, hosts: string | Array<string>): boolean => {
  try {
    const hostname = (url instanceof URL ? url : new URL(url)).hostname.toLowerCase()
    const list = Array.isArray(hosts) ? hosts : [hosts]

    return list.some((host) => hostname === host.toLowerCase().trim())
  } catch {}

  return false
}

export const isSubdomainOf = (url: string | URL, domains: string | Array<string>): boolean => {
  try {
    const hostname = (url instanceof URL ? url : new URL(url)).hostname.toLowerCase()
    const list = Array.isArray(domains) ? domains : [domains]

    return list.some((domain) => hostname.endsWith(`.${domain}`))
  } catch {}

  return false
}
