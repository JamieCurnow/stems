// Compact relative-time formatting for "Updated X ago" labels. Pure + framework
// free so it works on both the Nitro server (SSR) and the client. Granularity
// caps at minutes, so an SSR render and the hydrating client almost always agree.

/**
 * Human "time ago" string from an epoch-ms timestamp.
 *   < 1 min → "just now"; then minutes / hours / days / weeks / months / years,
 * each singular-aware ("1 hour ago" vs "2 hours ago"). Future times read "just now".
 */
export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms)
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`
  const min = Math.round(sec / 60)
  if (min < 60) return plural(min, 'minute')
  const hr = Math.round(min / 60)
  if (hr < 24) return plural(hr, 'hour')
  const day = Math.round(hr / 24)
  if (day < 7) return plural(day, 'day')
  const wk = Math.round(day / 7)
  if (wk < 5) return plural(wk, 'week')
  const mo = Math.round(day / 30)
  if (mo < 12) return plural(mo, 'month')
  return plural(Math.round(day / 365), 'year')
}
