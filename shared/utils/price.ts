/** 85 → "£0.85". Null/undefined → ''. */
export const formatPence = (pence?: number | null): string =>
  pence == null ? '' : `£${(pence / 100).toFixed(2)}`

/** Resolve the per-bunch price: explicit override, else stem × count, else null. */
export const bunchPrice = (f: {
  pricePerStem?: number | null
  pricePerBunch?: number | null
  stemsPerBunch?: number | null
}): number | null => {
  if (f.pricePerBunch != null) return f.pricePerBunch
  if (f.pricePerStem != null && f.stemsPerBunch != null) return f.pricePerStem * f.stemsPerBunch
  return null
}

/** Parse a "£8.50" / "8.5" string (or raw number) from a form into integer pence. */
export const parsePounds = (input: string | number): number | null => {
  const n = Number(String(input).replace(/[£,\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}
