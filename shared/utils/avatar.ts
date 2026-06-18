// Shared avatar helpers for photo-less profiles. A grower without a photo gets a
// warm, deterministic tint keyed off their handle (so they look the same
// wherever they appear — feed, public page, account) plus serif initials.
// Part of the Toast × Instagram language; see DESIGN.md.

const TINTS = [
  'bg-peach-100 text-peach-700',
  'bg-clay-200 text-clay-700',
  'bg-[#F6EAD9] text-[#9A6A3C]'
] as const

/** Deterministic warm tint classes (bg + text) for a handle. */
export function avatarTint(handle: string): string {
  let h = 0
  for (const ch of handle) h += ch.charCodeAt(0)
  return TINTS[h % TINTS.length]!
}

/** Up to two uppercase initials from a farm/display name. */
export function avatarInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  )
}
