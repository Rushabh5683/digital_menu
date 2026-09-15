/**
 * Staff / admin menu preview — browse the guest menu without creating
 * analytics sessions or MENU_OPENED events.
 *
 * Use: /menu/:slug?preview=1
 * Also auto-applied when a restaurant admin/captain (same restaurant) or
 * super admin is signed in on this browser.
 */
export const STAFF_MENU_PREVIEW_PARAM = 'preview';
export const STAFF_MENU_PREVIEW_VALUE = '1';

export function isStaffMenuPreview(searchParams) {
  if (!searchParams) return false;
  const raw =
    typeof searchParams.get === 'function'
      ? searchParams.get(STAFF_MENU_PREVIEW_PARAM)
      : searchParams[STAFF_MENU_PREVIEW_PARAM];
  return String(raw || '').trim() === STAFF_MENU_PREVIEW_VALUE;
}

export function staffMenuPreviewPath(slug) {
  const safe = encodeURIComponent(String(slug || '').trim());
  return `/menu/${safe}?${STAFF_MENU_PREVIEW_PARAM}=${STAFF_MENU_PREVIEW_VALUE}`;
}

/** Append ?preview=1 to a guest menu URL (relative or absolute). */
export function withStaffMenuPreview(url) {
  const raw = String(url || '').trim();
  if (!raw) return raw;
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
    const parsed = new URL(raw, base);
    parsed.searchParams.set(STAFF_MENU_PREVIEW_PARAM, STAFF_MENU_PREVIEW_VALUE);
    // Preserve absolute vs path-only form from the input.
    if (/^https?:\/\//i.test(raw)) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}${STAFF_MENU_PREVIEW_PARAM}=${STAFF_MENU_PREVIEW_VALUE}`;
  }
}
