// Sliding window rate limiter — in-memory for MVP.
// Key: `${organizationId}:${apiKeyId}`, window: 60 seconds.

const windows = new Map<string, number[]>()

export function checkRateLimit(key: string, limitPerMinute: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now    = Date.now()
  const window = 60_000
  const cutoff = now - window

  let timestamps = windows.get(key) ?? []
  timestamps = timestamps.filter(t => t > cutoff)

  const allowed   = timestamps.length < limitPerMinute
  const remaining = Math.max(0, limitPerMinute - timestamps.length - (allowed ? 1 : 0))
  const resetAt   = timestamps.length > 0 ? timestamps[0] + window : now + window

  if (allowed) {
    timestamps.push(now)
    windows.set(key, timestamps)
  }

  return { allowed, remaining, resetAt }
}

// Purge stale entries every 5 minutes to avoid unbounded growth
setInterval(() => {
  const cutoff = Date.now() - 60_000
  for (const [key, ts] of windows) {
    const fresh = ts.filter(t => t > cutoff)
    if (fresh.length === 0) windows.delete(key)
    else windows.set(key, fresh)
  }
}, 5 * 60_000)
