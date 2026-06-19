// A flower's availability is described by two independent, optional signals:
//
//   • `availabilityStatus` — a categorical hint the grower picks from a fixed
//     list (Good / Limited / … / Available next week). null = none chosen.
//   • `stemsAvailable` — a raw stem count. Semantics:
//        null  → count unspecified
//        0     → sold out
//        > 0   → that many stems currently available
//
// A grower can set either, both, or neither. Sold-out is therefore derivable
// from EITHER signal (an explicit 0 count, or the 'sold_out' status) — use the
// `isSoldOut` / `isInStock` helpers rather than checking `stemsAvailable === 0`
// directly so both signals are honoured everywhere.

/** Upper bound for a sane stem count (also enforced server-side). */
export const MAX_STEMS_AVAILABLE = 100_000

/** The categorical availability statuses a grower can pick. Order = display order. */
export const AVAILABILITY_STATUSES = [
  { value: 'good', label: 'Good', color: 'success' },
  { value: 'limited', label: 'Limited', color: 'warning' },
  { value: 'very_limited', label: 'Very limited', color: 'error' },
  { value: 'sold_out', label: 'Sold out', color: 'neutral' },
  { value: 'midweek', label: 'Available midweek', color: 'info' },
  { value: 'next_week', label: 'Available next week', color: 'info' },
  { value: 'soon', label: 'Available soon', color: 'info' }
] as const

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]['value']

/** Just the value tuple — handy for `z.enum(...)` server-side. */
export const AVAILABILITY_STATUS_VALUES = AVAILABILITY_STATUSES.map((s) => s.value) as [
  AvailabilityStatus,
  ...AvailabilityStatus[]
]

/** The full status option (label + semantic colour) for a value, or null. */
export const availabilityStatusMeta = (status: string | null | undefined) =>
  AVAILABILITY_STATUSES.find((s) => s.value === status) ?? null

/** Human label for a status value, or null when none/unknown. */
export const availabilityStatusLabel = (status: string | null | undefined): string | null =>
  availabilityStatusMeta(status)?.label ?? null

/** The availability signals carried by a flower (subset of FlowerDto / FlowerRow). */
interface AvailabilitySignals {
  stemsAvailable: number | null
  availabilityStatus?: string | null
}

/** Sold out = an explicit 0 count OR the 'sold_out' status. */
export const isSoldOut = (f: AvailabilitySignals): boolean =>
  f.stemsAvailable === 0 || f.availabilityStatus === 'sold_out'

/** In stock = anything that isn't sold out. */
export const isInStock = (f: AvailabilitySignals): boolean => !isSoldOut(f)

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

/**
 * Short stem-count text for tight rows where a separate status badge already
 * conveys availability: null → null (nothing to show), 0 → "Sold out",
 * n → "120 stems".
 */
export function stemsCountLabel(stems: number | null | undefined): string | null {
  if (stems == null) return null
  if (stems === 0) return 'Sold out'
  const noun = stems === 1 ? 'stem' : 'stems'
  return `${stems.toLocaleString()} ${noun}`
}
