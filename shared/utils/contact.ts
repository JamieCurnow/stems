// "Contact the grower" deep links. Stems deliberately has NO in-app messaging:
// a buyer taps a method and we hand off to their native app via a URL scheme
// (mailto:, wa.me, instagram.com). Nothing is sent or stored on our side.

export type ContactMethod = 'whatsapp' | 'email' | 'instagram'

/** Anything carrying a grower's contact details — PublicProfileDto satisfies it. */
export interface ContactSource {
  whatsapp?: string | null
  contactEmail?: string | null
  instagram?: string | null
  preferredContact?: ContactMethod | string | null
}

export interface ContactOption {
  key: ContactMethod
  label: string
  icon: string
  href: string
  /** External link (open in a new tab); false for mailto:. */
  external: boolean
}

// Declared order when no preference is set (and tie-break after the preferred).
const ORDER: ContactMethod[] = ['whatsapp', 'email', 'instagram']

/** wa.me wants the full international number as digits only — no '+', spaces or dashes. */
export function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}`
}

export interface WhatsappResult {
  /** Canonical E.164 form (e.g. '+447700900000'), or null for empty input. Present when valid. */
  value?: string | null
  /** User-facing message when the number can't be used. */
  error?: string
}

/**
 * Validate + normalise a grower's WhatsApp number to E.164 (`+<digits>`).
 *
 * wa.me needs the FULL international number: a national number like
 * `07123456789` resolves to the wrong country (or none), which is the exact
 * "missing country code" error WhatsApp throws. So we insist on an explicit
 * country code. We accept a leading `+`, the international `00` prefix, and the
 * common `+44 (0)7…` trunk-zero notation; anything else without a country code
 * is rejected with a message that teaches the right format.
 *
 * Returns `{ value }` (canonical, e.g. `+447700900000`) when valid, `{ error }`
 * with a user-facing message when not, or `{ value: null }` for empty input.
 */
export function normaliseWhatsapp(input: string | null | undefined): WhatsappResult {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return { value: null }

  // Drop a parenthesised trunk zero — "+44 (0)7700 900000" → "+44 7700 900000".
  let s = trimmed.replace(/\(0\)/g, '')
  // "00" is the international dialling prefix — treat it as a "+".
  if (s.startsWith('00')) s = `+${s.slice(2)}`

  const hasPlus = s.startsWith('+')
  const digits = s.replace(/\D/g, '')

  if (!hasPlus || digits.startsWith('0')) {
    // No "+"/"00", or a leading national trunk zero (e.g. 07… or +0…).
    return { error: 'Add your country code in international format, e.g. +44 7700 900000.' }
  }
  if (digits.length < 8 || digits.length > 15) {
    return { error: 'Enter a valid WhatsApp number, including the country code.' }
  }

  return { value: `+${digits}` }
}

/**
 * Build the ordered list of contact buttons for a grower. Only methods they've
 * actually filled in appear; the preferred one (if any) is sorted first.
 */
export function contactOptions(src: ContactSource): ContactOption[] {
  const options: ContactOption[] = []

  if (src.whatsapp) {
    options.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'i-lucide-message-circle',
      href: whatsappHref(src.whatsapp),
      external: true
    })
  }
  if (src.contactEmail) {
    options.push({
      key: 'email',
      label: 'Email',
      icon: 'i-lucide-mail',
      href: `mailto:${src.contactEmail}`,
      external: false
    })
  }
  if (src.instagram) {
    options.push({
      key: 'instagram',
      label: 'Instagram',
      icon: 'i-lucide-instagram',
      href: `https://instagram.com/${src.instagram}`,
      external: true
    })
  }

  const preferred = src.preferredContact
  return options.sort((a, b) => {
    if (a.key === preferred) return -1
    if (b.key === preferred) return 1
    return ORDER.indexOf(a.key) - ORDER.indexOf(b.key)
  })
}
