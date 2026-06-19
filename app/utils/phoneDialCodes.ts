/**
 * Lightweight dial-code reference for the `<ContactPhoneInput>` component.
 *
 * The phone input is intentionally *mask-only* — it does no per-country number
 * validation — so all it needs is the set of calling codes to offer in the
 * picker and a way to split a stored E.164 string back into its dial code +
 * national number. We deliberately avoid pulling in a phone-number library
 * (e.g. libphonenumber-js); the canonical-format guard lives in
 * `normaliseWhatsapp` (`shared/utils/contact.ts`). The UI shows just the dial
 * code, e.g. "+44" — no flag or name.
 */

// Calling code per country. Several countries share a code (e.g. US/CA = +1) —
// the picker shows unique codes only, so the country key here is just a
// readable reference for whoever edits the list.
const dialCodeByCountry: Record<string, string> = {
  AU: '+61',
  AT: '+43',
  BH: '+973',
  BE: '+32',
  BR: '+55',
  CA: '+1',
  CN: '+86',
  CZ: '+420',
  DK: '+45',
  EG: '+20',
  FI: '+358',
  FR: '+33',
  DE: '+49',
  GR: '+30',
  HK: '+852',
  HU: '+36',
  IN: '+91',
  ID: '+62',
  IE: '+353',
  IL: '+972',
  IT: '+39',
  JP: '+81',
  JO: '+962',
  KW: '+965',
  LB: '+961',
  MY: '+60',
  MX: '+52',
  MA: '+212',
  NL: '+31',
  NZ: '+64',
  NG: '+234',
  NO: '+47',
  OM: '+968',
  PK: '+92',
  PH: '+63',
  PL: '+48',
  PT: '+351',
  QA: '+974',
  RU: '+7',
  SA: '+966',
  SG: '+65',
  ZA: '+27',
  KR: '+82',
  ES: '+34',
  SE: '+46',
  CH: '+41',
  TW: '+886',
  TH: '+66',
  TR: '+90',
  AE: '+971',
  GB: '+44',
  US: '+1',
  VN: '+84'
}

/** The default dial code. Stems is UK-first, so UK (+44). */
export const DEFAULT_DIAL_CODE = '+44'

/**
 * Unique, numerically-sorted list of dial codes for the picker (e.g.
 * `['+1', '+7', '+20', …, '+973']`). De-duplicated because several countries
 * share a code and we only show the code itself.
 */
export const dialCodeOptions: string[] = [...new Set(Object.values(dialCodeByCountry))].sort(
  (a, b) => Number(a.slice(1)) - Number(b.slice(1))
)

/**
 * Split a stored E.164 string (e.g. `"+447911123456"`) into its dial code and
 * national number. Matches the longest known dial code that prefixes the value
 * so multi-digit codes (e.g. `+971`) aren't shadowed by shorter ones. Falls
 * back to `fallbackDialCode` (and treats the whole value as digits) when the
 * value has no recognisable code — e.g. a legacy national-only number.
 */
export const splitE164 = (
  value: string | undefined,
  fallbackDialCode: string = DEFAULT_DIAL_CODE
): { dialCode: string; nationalNumber: string } => {
  const e164 = (value ?? '').trim()
  if (!e164) return { dialCode: fallbackDialCode, nationalNumber: '' }

  const match = dialCodeOptions.filter((dc) => e164.startsWith(dc)).sort((a, b) => b.length - a.length)[0]

  if (!match) return { dialCode: fallbackDialCode, nationalNumber: e164.replace(/\D/g, '') }
  return { dialCode: match, nationalNumber: e164.slice(match.length).replace(/\D/g, '') }
}
