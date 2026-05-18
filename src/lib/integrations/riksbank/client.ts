// Riksbanken SWEA API client for daily SEK exchange rates
// API: https://api.riksbank.se/swea/v1
// Documentation: https://api.riksbank.se/swea/v1/swagger-ui.html
//
// Riksbanken publishes fixing rates (mittkurser) daily at approx 06:00 CET.
// The cron job should run at 06:30 to ensure data is available.

import { prisma } from "@/lib/prisma"

const RIKSBANK_BASE = "https://api.riksbank.se/swea/v1"

// Series IDs for daily fixing rates to SEK (PMI = mittkurs/fixing)
// Source: Riksbanken SWEA series catalog
const SERIES_MAP: Record<string, string> = {
  EUR: "SEKEURPMI",
  USD: "SEKUSDPMI",
  GBP: "SEKGBPPMI",
  NOK: "SEKNOKPMI",
  DKK: "SEKDKKPMI",
  CHF: "SEKCHFPMI",
  JPY: "SEKJPYPMI",
  CAD: "SEKCADPMI",
  AUD: "SEKAUDPMI",
  NZD: "SEKNZDPMI",
  HKD: "SEKHKDPMI",
  SGD: "SEKSGDPMI",
  PLN: "SEKPLNPMI",
  CZK: "SEKCZKPMI",
  HUF: "SEKHUFPMI",
  RON: "SEKRONPMI",
  TRY: "SEKTRYPMI",
  CNY: "SEKCNYPMI",
  INR: "SEKINRPMI",
  BRL: "SEKBRLPMI",
  MXN: "SEKMXNPMI",
  ZAR: "SEKZARPMI",
  ILS: "SEKILSPMI",
  THB: "SEKTHBPMI",
}

export const SUPPORTED_CURRENCIES = Object.keys(SERIES_MAP)

interface RiksbankObservation {
  date: string  // "2026-05-18"
  value: string // "11.234567" — may be "" if no data
}

interface RiksbankSeriesResponse {
  seriesid: string
  observations: RiksbankObservation[]
}

/** Fetch the latest available rate for a single currency against SEK */
export async function fetchDailyRate(
  currency: string,
  date?: Date
): Promise<{ rate: number; rateDate: string } | null> {
  const seriesId = SERIES_MAP[currency.toUpperCase()]
  if (!seriesId) return null

  const targetDate = date ?? new Date()
  const from = formatDate(new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000)) // 7 days back
  const to   = formatDate(targetDate)

  const url = `${RIKSBANK_BASE}/CrossRates/${seriesId}/${from}/${to}`

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // 10 second timeout
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) return null

  const data: RiksbankSeriesResponse = await res.json()
  if (!data.observations?.length) return null

  // Find the most recent non-empty value
  const latest = [...data.observations]
    .reverse()
    .find(o => o.value && o.value !== "")

  if (!latest) return null

  return {
    rate:     parseFloat(latest.value),
    rateDate: latest.date,
  }
}

/** Fetch rates for all supported currencies on a given date */
export async function fetchAllSupportedRates(
  date?: Date
): Promise<Map<string, { rate: number; rateDate: string }>> {
  const results = new Map<string, { rate: number; rateDate: string }>()

  // Fetch in parallel (respect API limits — up to ~25 concurrent)
  await Promise.allSettled(
    SUPPORTED_CURRENCIES.map(async currency => {
      const result = await fetchDailyRate(currency, date)
      if (result) results.set(currency, result)
    })
  )

  return results
}

/**
 * Get exchange rate (from → SEK).
 * Checks DB cache first, falls back to live Riksbanken API.
 * For cross-rates (e.g. EUR→USD), routes via SEK.
 */
export async function getExchangeRate(
  from: string,
  to: string,
  date?: Date
): Promise<{ rate: number; rateDate: string; source: string } | null> {
  // SEK→SEK always 1
  if (from.toUpperCase() === to.toUpperCase()) {
    return { rate: 1, rateDate: formatDate(date ?? new Date()), source: "identity" }
  }

  const fromUpper = from.toUpperCase()
  const toUpper   = to.toUpperCase()
  const targetDate = date ?? new Date()
  const dateStr   = formatDate(targetDate)

  // Direct rate: from→SEK
  if (toUpper === "SEK") {
    // Check cache
    const cached = await getCachedRate(fromUpper, "SEK", targetDate)
    if (cached) return cached

    // Live fetch
    const live = await fetchDailyRate(fromUpper, targetDate)
    if (live) {
      await cacheRate(fromUpper, "SEK", live.rate, live.rateDate, "riksbank")
      return { rate: live.rate, rateDate: live.rateDate, source: "riksbank" }
    }
    return null
  }

  // Cross-rate: from→SEK then SEK→to
  if (fromUpper !== "SEK" && toUpper !== "SEK") {
    const [fromSek, toSek] = await Promise.all([
      getExchangeRate(fromUpper, "SEK", targetDate),
      getExchangeRate(toUpper,   "SEK", targetDate),
    ])
    if (!fromSek || !toSek || toSek.rate === 0) return null
    const crossRate = fromSek.rate / toSek.rate
    return {
      rate:     Math.round(crossRate * 1_000_000) / 1_000_000,
      rateDate: dateStr,
      source:   "riksbank_cross",
    }
  }

  // SEK→foreign: inverse of foreign→SEK
  if (fromUpper === "SEK") {
    const inverse = await getExchangeRate(toUpper, "SEK", targetDate)
    if (!inverse || inverse.rate === 0) return null
    return {
      rate:     Math.round((1 / inverse.rate) * 1_000_000) / 1_000_000,
      rateDate: inverse.rateDate,
      source:   inverse.source,
    }
  }

  return null
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function getCachedRate(
  from:    string,
  to:      string,
  date:    Date
): Promise<{ rate: number; rateDate: string; source: string } | null> {
  // Look back up to 7 days for the most recent rate
  const since = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)
  const row = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: from,
      toCurrency:   to,
      rateDate:     { gte: since, lte: date },
    },
    orderBy: { rateDate: "desc" },
  })
  if (!row) return null
  return {
    rate:     Number(row.rate),
    rateDate: formatDate(row.rateDate),
    source:   row.source,
  }
}

async function cacheRate(
  from:     string,
  to:       string,
  rate:     number,
  rateDate: string,
  source:   string
): Promise<void> {
  await prisma.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency_rateDate_source: {
        fromCurrency: from,
        toCurrency:   to,
        rateDate:     new Date(rateDate),
        source,
      },
    },
    create: {
      fromCurrency: from,
      toCurrency:   to,
      rate,
      rateDate:     new Date(rateDate),
      source,
      fetchedAt:    new Date(),
    },
    update: { rate, fetchedAt: new Date() },
  })
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
