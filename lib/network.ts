const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
]

function isPrivateHost(host: string): boolean {
  const hostname = host.split(':')[0]
  return PRIVATE_IP_PATTERNS.some((re) => re.test(hostname))
}

export function assertInternalServiceUrl(url: string, serviceName: string): void {
  if (!url) return
  if (process.env.NODE_ENV !== 'production') return

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return
  }

  if (parsed.protocol === 'https:') return
  if (isPrivateHost(parsed.hostname)) return

  throw new Error(
    `[ebuddy] ${serviceName} apunta a red pública via HTTP en producción. ` +
    `Configura la URL para usar HTTPS o una dirección de red privada/Tailscale. ` +
    `URL actual: ${url}`
  )
}
