/**
 * Resolve dish/logo media URLs for split-host deploys.
 *
 * Prefer same-origin `/uploads/...` so production loads images through the
 * Vercel rewrite (not a direct call to Railway). Absolute `*.railway.app`
 * URLs often fail on mobile data even when Wi‑Fi works.
 */
export function resolveMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  // Absolute URL → keep /uploads path on the current site when possible.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith('/uploads')) {
        const pathOnly = `${parsed.pathname}${parsed.search || ''}`;
        const apiBase = String(import.meta.env.VITE_API_BASE_URL || '')
          .trim()
          .replace(/\/$/, '');
        // Only keep a cross-origin absolute URL when the app is intentionally
        // pointed at a different API host (no same-origin /uploads proxy).
        if (apiBase) {
          return `${apiBase}${pathOnly}`;
        }
        return pathOnly;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  if (!raw.startsWith('/uploads')) return raw;

  const base = String(import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (!base) return raw;
  return `${base}${raw}`;
}
