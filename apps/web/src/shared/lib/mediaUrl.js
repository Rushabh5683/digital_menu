/**
 * Resolve dish/logo media URLs for split-host deploys.
 * Relative /uploads/... paths are served by the API, not the Vite/Vercel host.
 */
export function resolveMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }
  if (!raw.startsWith('/uploads')) return raw;

  const base = String(import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (!base) return raw;
  return `${base}${raw}`;
}
