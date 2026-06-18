/**
 * Turn a stored R2 key (e.g. `public/abc123.webp`) into a public URL the
 * client can drop straight into `<img src>`. The client never sees raw R2
 * keys — API handlers run keys through `imgUrl()` when building DTOs.
 *
 * Null-safe: returns null for a null/empty key so callers can pass through
 * optional columns (`profile.avatarKey`, `flower_photo.r2Key`) directly.
 */
export const imgUrl = (key?: string | null): string | null =>
  key ? `/img/${key.replace(/^public\//, '')}` : null
