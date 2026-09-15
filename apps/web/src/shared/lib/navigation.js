/**
 * Navigate to the previous history entry when available; otherwise to fallback.
 * Uses React Router's history idx when present (SPA session).
 */
export function goBack(navigate, fallback = '/') {
  if (typeof navigate !== 'function') return;

  const idx = window.history.state?.idx;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
    return;
  }

  // Fallback when the page was opened directly / refreshed with no in-app history.
  if (fallback != null && fallback !== '') {
    navigate(fallback);
  }
}
