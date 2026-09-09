function storageKey({ restaurantId, anonymousSessionId }) {
  return `dm:active-order:${restaurantId}:${anonymousSessionId}`;
}

export function saveActiveOrder(scope, order) {
  if (!scope?.restaurantId || !scope?.anonymousSessionId || !order?.id) return;
  try {
    localStorage.setItem(
      storageKey(scope),
      JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readActiveOrder(scope) {
  if (!scope?.restaurantId || !scope?.anonymousSessionId) return null;
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveOrder(scope) {
  if (!scope?.restaurantId || !scope?.anonymousSessionId) return;
  try {
    localStorage.removeItem(storageKey(scope));
  } catch {
    // ignore
  }
}
