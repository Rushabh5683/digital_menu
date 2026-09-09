import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../shared/api/client.js';
import {
  clearActiveOrder,
  readActiveOrder,
  saveActiveOrder,
} from './activeOrderStore.js';
import { isActiveOrderStatus } from './orderStatus.js';

/**
 * Tracks the open order for this table / anonymous session.
 * Restores via table lookup after a cleared tab.
 */
export function useMyOrder({
  restaurantId,
  restaurantSlug,
  anonymousSessionId,
  tableNumber,
  enabled = true,
}) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !restaurantSlug || !anonymousSessionId || !restaurantId) {
      setOrder(null);
      return null;
    }

    const scope = { restaurantId, anonymousSessionId };
    setLoading(true);
    try {
      let next = null;

      // Table is the source of truth for an open ticket (survives cleared storage).
      if (tableNumber) {
        try {
          const open = await api.getOpenOrder({
            restaurantSlug,
            tableNumber,
            anonymousSessionId,
          });
          if (open?.order && isActiveOrderStatus(open.order.status)) {
            next = open.order;
          } else if (open?.order) {
            next = open.order;
          }
        } catch {
          // Fall through
        }
      }

      if (!next) {
        const stored = readActiveOrder(scope);
        if (stored?.orderId) {
          try {
            const tracked = await api.trackOrder(stored.orderId, {
              restaurantSlug,
              anonymousSessionId,
              tableNumber: tableNumber || undefined,
            });
            next = tracked.order;
          } catch {
            // Fall through to /mine
          }
        }
      }

      if (!next) {
        const mine = await api.getMyOrder({
          restaurantSlug,
          anonymousSessionId,
          tableNumber: tableNumber || undefined,
        });
        next = mine.order;
      }

      setOrder(next || null);

      if (next) {
        saveActiveOrder(scope, next);
      } else {
        clearActiveOrder(scope);
      }

      return next;
    } catch {
      setOrder(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, restaurantId, restaurantSlug, anonymousSessionId, tableNumber]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !order || !isActiveOrderStatus(order.status)) return undefined;
    const timer = window.setInterval(() => {
      refresh();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [enabled, order?.id, order?.status, refresh]);

  const rememberPlacedOrder = useCallback(
    (placed) => {
      if (!placed || !restaurantId || !anonymousSessionId) return;
      saveActiveOrder({ restaurantId, anonymousSessionId }, placed);
      setOrder(placed);
    },
    [restaurantId, anonymousSessionId],
  );

  const hasActiveOrder = Boolean(order && isActiveOrderStatus(order.status));

  return {
    order,
    loading,
    hasOrder: Boolean(order),
    hasActiveOrder,
    openOrder: hasActiveOrder ? order : null,
    refresh,
    rememberPlacedOrder,
  };
}
