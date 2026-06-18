export const HANDLE_RE = /^[a-z][a-z0-9_]{2,29}$/ // 3–30 chars, starts with a letter

export const RESERVED_HANDLES = new Set([
  'app',
  'api',
  'admin',
  'auth',
  'login',
  'logout',
  'signup',
  'signin',
  'onboarding',
  'settings',
  'account',
  'me',
  'new',
  'edit',
  'search',
  'discover',
  'explore',
  'about',
  'help',
  'support',
  'terms',
  'privacy',
  'img',
  'images',
  'r',
  'email',
  'unsubscribe',
  'billing',
  'stripe',
  'flowers',
  'flower',
  'grower',
  'growers',
  'florist',
  'stems',
  'www',
  'static'
])

export const normaliseHandle = (raw: string): string => raw.trim().replace(/^@/, '').toLowerCase()

/** null = valid; otherwise a human error message. */
export const validateHandle = (raw: string): string | null => {
  const h = normaliseHandle(raw)
  if (!HANDLE_RE.test(h)) return '3–30 chars, letters/numbers/underscore, starting with a letter.'
  if (RESERVED_HANDLES.has(h)) return 'That username is reserved.'
  return null
}
