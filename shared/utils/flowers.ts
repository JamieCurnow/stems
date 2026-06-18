// Flower availability is a raw stem count (no categorical Good/Limited status).
// Semantics of `stemsAvailable`:
//   null  → available, count unspecified ("Available")
//   0     → sold out
//   > 0   → that many stems currently available

/** Upper bound for a sane stem count (also enforced server-side). */
export const MAX_STEMS_AVAILABLE = 100_000

/** In stock = anything that isn't an explicit 0. */
export const isInStock = (stems: number | null | undefined): boolean => stems !== 0

/** Sold out = an explicit 0. */
export const isSoldOut = (stems: number | null | undefined): boolean => stems === 0

/**
 * Human label for a stem count.
 *   0 → "Sold out", null → "Available", n → "120 stems available".
 * Pass `short: true` for tight rows → "120 stems".
 */
export function stemsLabel(stems: number | null | undefined, short = false): string {
  if (stems === 0) return 'Sold out'
  if (stems == null) return 'Available'
  const noun = stems === 1 ? 'stem' : 'stems'
  return short ? `${stems.toLocaleString()} ${noun}` : `${stems.toLocaleString()} ${noun} available`
}
