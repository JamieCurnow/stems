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
