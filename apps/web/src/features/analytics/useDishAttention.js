import { useEffect, useRef } from 'react';
import { registerDishElement } from './analytics.js';

/**
 * Attach exclusive dish attention tracking to a DOM node.
 */
export function useDishAttention(dishId, meta = {}) {
  const nodeRef = useRef(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !dishId) return undefined;
    return registerDishElement(node, dishId, meta);
  }, [dishId, meta.categoryId, meta.source]);

  return nodeRef;
}

export function useDishAttentionCallback(dishId, meta = {}) {
  const cleanupRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), [dishId, meta.categoryId]);

  return (node) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (node && dishId) {
      cleanupRef.current = registerDishElement(node, dishId, meta);
    }
  };
}
