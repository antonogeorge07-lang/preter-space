/**
 * Guards against avatar URLs (or other long raw values) leaking into places the
 * UI renders as text, which made long URLs bleed across the call UI.
 */
const URL_LIKE = /^(https?:\/\/|data:|blob:|www\.)/i;

export const looksLikeUrl = (value) =>
  typeof value === 'string' && URL_LIKE.test(value.trim());

/** A name safe to render as text. Falls back when the value is a URL/too long. */
export function safeDisplayName(value, fallback = 'Contact') {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || looksLikeUrl(raw) || raw.length > 80) return fallback;
  return raw;
}

/** Turns an email into a short readable label. */
export function nameFromEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '';
  return email.split('@')[0];
}
