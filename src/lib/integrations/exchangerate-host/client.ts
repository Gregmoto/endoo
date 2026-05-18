// Exchangerate.host fallback client
// Used when Riksbanken API is unavailable or doesn't support the requested currency.
// API: https://api.exchangerate.host (free tier, no key required for basic use)
// NOTE: exchangerate.host now requires API key for some endpoints. If unavailable,
// we log a warning and return null so callers can surface the error gracefully.

const BASE_URL = "https://api.exchangerate.host"

interface ExchangerateResponse {
  success: boolean
  base:    string
  date:    string
  rates:   Record<string, number>
}

/**
 * Fetch a single rate from exchangerate.host.
 * Returns null if the API is unavailable.
 */
export async function fetchRateFallback(
  from: string,
  to:   string,
  date?: Date
): Promise<{ rate: number; rateDate: string; source: string } | null> {
  const dateStr   = date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  const targetUrl = `${BASE_URL}/${dateStr}?base=${from}&symbols=${to}`

  try {
    const res = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      signal:  AbortSignal.timeout(8_000),
    })

    if (!res.ok) return null

    const data: ExchangerateResponse = await res.json()
    if (!data.success || !data.rates[to]) return null

    return {
      rate:     data.rates[to],
      rateDate: data.date ?? dateStr,
      source:   "exchangerate.host",
    }
  } catch {
    // Network error or timeout — return null for graceful degradation
    return null
  }
}

/**
 * Fetch rates for all requested symbols from SEK base.
 * Used as fallback when Riksbanken is unreachable.
 */
export async function fetchAllRatesFallback(
  symbols: string[],
  date?:   Date
): Promise<Map<string, { rate: number; rateDate: string }>> {
  const results = new Map<string, { rate: number; rateDate: string }>()
  if (symbols.length === 0) return results

  const dateStr   = date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  const symbolStr = symbols.join(",")
  const url       = `${BASE_URL}/${dateStr}?base=SEK&symbols=${symbolStr}`

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal:  AbortSignal.timeout(10_000),
    })

    if (!res.ok) return results

    const data: ExchangerateResponse = await res.json()
    if (!data.success) return results

    // Rates are SEK-based: 1 SEK = data.rates[X] X
    // We store as 1 X = Y SEK (inverse)
    for (const [currency, rate] of Object.entries(data.rates)) {
      if (rate && rate > 0) {
        results.set(currency, {
          rate:     Math.round((1 / rate) * 1_000_000) / 1_000_000,
          rateDate: data.date ?? dateStr,
        })
      }
    }
  } catch {
    // Silently return empty map — caller handles missing data
  }

  return results
}
