const STORAGE_PREFIX = 'dm:table';

function key(restaurantSlug) {
  return `${STORAGE_PREFIX}:${restaurantSlug}`;
}

export function getStoredTable(restaurantSlug) {
  if (!restaurantSlug || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(restaurantSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tableNumber) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredTable(restaurantSlug, table) {
  if (!restaurantSlug || !table?.tableNumber || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      key(restaurantSlug),
      JSON.stringify({
        tableNumber: table.tableNumber,
        tableId: table.tableId || null,
        source: table.source || 'picker',
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
}

export function clearStoredTable(restaurantSlug) {
  if (!restaurantSlug || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key(restaurantSlug));
  } catch {
    // ignore
  }
}
