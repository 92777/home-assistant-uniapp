const DEFAULT_PORT = 8123
const DEFAULT_NETWORK_PREFIXES = ['192.168.0', '192.168.1', '192.168.31', '10.0.0']
const PRIORITY_LAST_OCTETS = [1, 2, 3, 4, 5, 10, 20, 30, 31, 50, 60, 80, 100, 101, 110, 123, 150, 200, 201, 250, 254]
const DEFAULT_TIMEOUT_MS = 1200
const DEFAULT_CONCURRENCY = 24
const DEFAULT_MAX_DURATION_MS = 9000

export function normalizeHaUrl(value = '') {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')

  if (!trimmed) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`

  try {
    const url = new URL(withProtocol)
    return url.origin
  } catch {
    return withProtocol
  }
}

export function normalizeDiscoveryPort(value = DEFAULT_PORT) {
  const port = Number(String(value || '').trim())
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT
}

export function buildHaUrl(host = '', port = DEFAULT_PORT) {
  const trimmedHost = String(host || '').trim()

  if (!trimmedHost) {
    return ''
  }

  const normalizedPort = normalizeDiscoveryPort(port)
  const withProtocol = /^https?:\/\//i.test(trimmedHost) ? trimmedHost : `http://${trimmedHost}`

  try {
    const url = new URL(withProtocol)
    url.port = `${normalizedPort}`
    return url.origin
  } catch {
    return normalizeHaUrl(`${withProtocol}:${normalizedPort}`)
  }
}

function uniqueList(list = []) {
  const seen = new Set()
  const result = []

  list.forEach((item) => {
    const normalized = normalizeHaUrl(item)

    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  })

  return result
}

function getStoredUrls() {
  const urls = [uni.getStorageSync('ha_url')]
  const discoveredUrls = uni.getStorageSync('ha_discovered_urls')

  if (Array.isArray(discoveredUrls)) {
    urls.push(...discoveredUrls)
  }

  return urls
}

function getLastOctets() {
  const prioritySet = new Set(PRIORITY_LAST_OCTETS)
  const ordered = [...PRIORITY_LAST_OCTETS]

  for (let value = 1; value <= 254; value += 1) {
    if (!prioritySet.has(value)) {
      ordered.push(value)
    }
  }

  return ordered
}

function deriveNetworkPrefix(url = '') {
  try {
    const hostname = new URL(normalizeHaUrl(url)).hostname
    const parts = hostname.split('.').map((item) => Number(item))

    if (parts.length === 4 && parts.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
      return parts.slice(0, 3).join('.')
    }
  } catch {
    return ''
  }

  return ''
}

function buildNetworkCandidates(prefixes = [], port = DEFAULT_PORT) {
  const lastOctets = getLastOctets()
  const normalizedPort = normalizeDiscoveryPort(port)
  return prefixes.flatMap((prefix) => {
    return lastOctets.map((lastOctet) => `http://${prefix}.${lastOctet}:${normalizedPort}`)
  })
}

export function buildHaDiscoveryCandidates(options = {}) {
  const addressInput = options.address || options.host || options.inputUrl || ''
  const port = normalizeDiscoveryPort(options.port)
  const inputUrl = addressInput ? buildHaUrl(addressInput, port) : ''
  const shouldRestrictToDerivedSubnet = Boolean(options.restrictToDerivedSubnet)
  const storedUrls = shouldRestrictToDerivedSubnet ? [] : getStoredUrls()
  const seedUrls = uniqueList([inputUrl, ...storedUrls])
  const derivedPrefixes = seedUrls.map(deriveNetworkPrefix).filter(Boolean)
  const customPrefixes = options.networkPrefixes || []
  const shouldIncludeDefaultNetworks = !shouldRestrictToDerivedSubnet && options.includeDefaultNetworks !== false
  const networkPrefixes = [
    ...new Set([
      ...customPrefixes,
      ...derivedPrefixes,
      ...(shouldIncludeDefaultNetworks ? DEFAULT_NETWORK_PREFIXES : [])
    ])
  ]

  return uniqueList([
    inputUrl,
    ...storedUrls,
    ...(shouldRestrictToDerivedSubnet ? [] : [
      `http://homeassistant.local:${port}`,
      `http://homeassistant:${port}`
    ]),
    ...buildNetworkCandidates(networkPrefixes, port)
  ])
}

export function getIpv4NetworkPrefix(value = '') {
  return deriveNetworkPrefix(value)
}

function stringifyResponse(data) {
  if (typeof data === 'string') {
    return data
  }

  try {
    return JSON.stringify(data)
  } catch {
    return ''
  }
}

function isHomeAssistantApiResponse(res) {
  if (res.statusCode < 200 || res.statusCode >= 300) {
    return false
  }

  const text = stringifyResponse(res.data)
  return /API running/i.test(text) || /home assistant/i.test(text)
}

function requestWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false
    let requestTask = null
    const timeoutId = setTimeout(() => {
      if (settled) {
        return
      }

      settled = true
      if (requestTask?.abort) {
        requestTask.abort()
      }
      reject(new Error('探测超时'))
    }, timeoutMs)

    requestTask = uni.request({
      url,
      method: 'GET',
      timeout: timeoutMs,
      success: (res) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeoutId)
        resolve(res)
      },
      fail: (error) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeoutId)
        reject(new Error(error.errMsg || '探测失败'))
      }
    })
  })
}

async function probeHaCandidate(baseUrl, timeoutMs) {
  const normalized = normalizeHaUrl(baseUrl)
  const res = await requestWithTimeout(`${normalized}/api/`, timeoutMs)

  if (!isHomeAssistantApiResponse(res)) {
    throw new Error(`非 Home Assistant 响应: ${res.statusCode}`)
  }

  return normalized
}

function saveDiscoveredUrls(urls = []) {
  if (urls.length === 0) {
    return
  }

  const nextUrls = uniqueList([...urls, ...getStoredUrls()]).slice(0, 20)
  uni.setStorageSync('ha_discovered_urls', nextUrls)
}

export async function discoverHaServers(options = {}) {
  const candidates = buildHaDiscoveryCandidates(options)
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const maxDurationMs = options.maxDurationMs || DEFAULT_MAX_DURATION_MS
  const startedAt = Date.now()
  const discovered = []
  let cursor = 0
  let checked = 0
  let lastError = null

  async function worker() {
    while (cursor < candidates.length) {
      if (Date.now() - startedAt > maxDurationMs) {
        return
      }

      const candidate = candidates[cursor]
      cursor += 1

      options.onProgress?.({
        phase: 'probing',
        candidate,
        checked,
        found: discovered.length,
        total: candidates.length
      })

      try {
        const url = await probeHaCandidate(candidate, timeoutMs)

        if (!discovered.includes(url)) {
          discovered.push(url)
          options.onFound?.(url, discovered.slice())
        }
      } catch (error) {
        lastError = error
      } finally {
        checked += 1
        options.onProgress?.({
          phase: 'checked',
          candidate,
          checked,
          found: discovered.length,
          total: candidates.length
        })
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  saveDiscoveredUrls(discovered)

  return {
    candidates,
    discovered,
    checked,
    total: candidates.length,
    timedOut: cursor < candidates.length,
    lastError
  }
}
