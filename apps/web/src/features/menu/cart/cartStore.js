const MAX_QTY = 20;

function storageKey({ restaurantId, tableNumber, anonymousSessionId }) {
  return `dm:cart:${restaurantId}:${tableNumber}:${anonymousSessionId}`;
}

function canUseStorage() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false;
    const probe = '__dm_cart__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readCart(key) {
  if (!canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeCart(key, items) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ items, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // ignore quota errors
  }
}

function normalizeItem(dish, quantity) {
  return {
    dishId: dish.id,
    name: dish.name,
    price: Number(dish.price),
    imageUrl: dish.imageUrl || null,
    quantity,
    isAvailable: dish.isAvailable !== false,
  };
}

export function computeCartTotals(items = []) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const total = Math.round(subtotal * 100) / 100;
  return { itemCount, subtotal: total, total };
}

/**
 * Restaurant + table + anonymous-session scoped cart.
 */
export function createCartController(scope) {
  if (!scope?.restaurantId || !scope?.tableNumber || !scope?.anonymousSessionId) {
    return null;
  }

  const key = storageKey(scope);
  let items = readCart(key).filter(
    (item) => item?.dishId && Number.isInteger(item.quantity) && item.quantity > 0,
  );

  function persist() {
    writeCart(key, items);
  }

  function snapshot() {
    return {
      items: items.map((item) => ({ ...item })),
      ...computeCartTotals(items),
      scope: { ...scope },
    };
  }

  function addDish(dish, quantity = 1) {
    if (!dish?.id) throw new Error('Dish is required');
    if (dish.isAvailable === false) throw new Error('This dish is currently unavailable');
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) throw new Error('Invalid quantity');

    const existing = items.find((item) => item.dishId === dish.id);
    if (existing) {
      const nextQty = Math.min(MAX_QTY, existing.quantity + qty);
      existing.quantity = nextQty;
      existing.name = dish.name;
      existing.price = Number(dish.price);
      existing.imageUrl = dish.imageUrl || null;
      existing.isAvailable = true;
    } else {
      items.push(normalizeItem(dish, Math.min(MAX_QTY, qty)));
    }
    persist();
    return snapshot();
  }

  function setQuantity(dishId, quantity) {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) throw new Error('Invalid quantity');
    if (qty === 0) {
      items = items.filter((item) => item.dishId !== dishId);
    } else {
      const item = items.find((row) => row.dishId === dishId);
      if (!item) throw new Error('Item not in cart');
      item.quantity = Math.min(MAX_QTY, qty);
    }
    persist();
    return snapshot();
  }

  function increment(dishId) {
    const item = items.find((row) => row.dishId === dishId);
    if (!item) throw new Error('Item not in cart');
    if (item.quantity >= MAX_QTY) return snapshot();
    item.quantity += 1;
    persist();
    return snapshot();
  }

  function decrement(dishId) {
    const item = items.find((row) => row.dishId === dishId);
    if (!item) throw new Error('Item not in cart');
    if (item.quantity <= 1) {
      items = items.filter((row) => row.dishId !== dishId);
    } else {
      item.quantity -= 1;
    }
    persist();
    return snapshot();
  }

  function removeDish(dishId) {
    items = items.filter((item) => item.dishId !== dishId);
    persist();
    return snapshot();
  }

  function clear() {
    items = [];
    persist();
    return snapshot();
  }

  /** Drop sold-out / unknown dishes using current menu catalog. */
  function syncAvailability(dishesById) {
    items = items
      .map((item) => {
        const dish = dishesById.get(item.dishId);
        if (!dish || dish.isAvailable === false) return null;
        return {
          ...item,
          name: dish.name,
          price: Number(dish.price),
          imageUrl: dish.imageUrl || null,
          isAvailable: true,
        };
      })
      .filter(Boolean);
    persist();
    return snapshot();
  }

  return {
    getSnapshot: snapshot,
    addDish,
    setQuantity,
    increment,
    decrement,
    removeDish,
    clear,
    syncAvailability,
    maxQuantity: MAX_QTY,
  };
}

export { MAX_QTY };
