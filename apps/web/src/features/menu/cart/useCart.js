import { useCallback, useEffect, useMemo, useState } from 'react';
import { createCartController } from './cartStore.js';

export function useCart({
  restaurantId,
  restaurantSlug,
  restaurantName,
  tableNumber,
  tableLabel,
  anonymousSessionId,
  dishesById,
}) {
  const scope = useMemo(() => {
    if (!restaurantId || !tableNumber || !anonymousSessionId) return null;
    return {
      restaurantId,
      restaurantSlug,
      tableNumber,
      anonymousSessionId,
    };
  }, [restaurantId, restaurantSlug, tableNumber, anonymousSessionId]);

  const controller = useMemo(() => createCartController(scope), [scope]);

  const [cart, setCart] = useState(() =>
    controller
      ? controller.getSnapshot()
      : { items: [], itemCount: 0, subtotal: 0, total: 0, scope: null },
  );

  useEffect(() => {
    if (!controller) {
      setCart({ items: [], itemCount: 0, subtotal: 0, total: 0, scope: null });
      return;
    }
    setCart(controller.getSnapshot());
  }, [controller]);

  useEffect(() => {
    if (!controller || !dishesById) return;
    setCart(controller.syncAvailability(dishesById));
  }, [controller, dishesById]);

  const addDish = useCallback(
    (dish, quantity = 1) => {
      if (!controller) throw new Error('Choose a table before adding to cart');
      const next = controller.addDish(dish, quantity);
      setCart(next);
      return next;
    },
    [controller],
  );

  const increment = useCallback(
    (dishId) => {
      if (!controller) return;
      setCart(controller.increment(dishId));
    },
    [controller],
  );

  const decrement = useCallback(
    (dishId) => {
      if (!controller) return;
      setCart(controller.decrement(dishId));
    },
    [controller],
  );

  const removeDish = useCallback(
    (dishId) => {
      if (!controller) return;
      setCart(controller.removeDish(dishId));
    },
    [controller],
  );

  const clear = useCallback(() => {
    if (!controller) return;
    setCart(controller.clear());
  }, [controller]);

  const getQuantity = useCallback(
    (dishId) => cart.items.find((item) => item.dishId === dishId)?.quantity || 0,
    [cart.items],
  );

  return {
    cart,
    ready: Boolean(controller),
    restaurantName,
    tableLabel:
      tableLabel ||
      (tableNumber ? `Table ${String(tableNumber).padStart(2, '0')}` : null),
    tableNumber,
    addDish,
    increment,
    decrement,
    removeDish,
    clear,
    getQuantity,
    maxQuantity: controller?.maxQuantity || 20,
  };
}
