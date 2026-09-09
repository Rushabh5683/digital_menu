import { useEffect, useRef } from 'react';
import { registerCategoryElement } from './analytics.js';

/**
 * Attach exclusive category attention tracking to a DOM node.
 * @returns React ref callback / ref object for the category section element
 */
export function useCategoryAttention(categoryId, meta = {}) {
  const nodeRef = useRef(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !categoryId) return undefined;
    return registerCategoryElement(node, categoryId, meta);
  }, [categoryId, meta.restaurantId]);

  return nodeRef;
}

/**
 * Convenience: merge refs if parent also needs the element.
 */
export function useCategoryAttentionCallback(categoryId, meta = {}) {
  const cleanupRef = useRef(null);

  useEffect(() => () => cleanupRef.current?.(), [categoryId]);

  return (node) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (node && categoryId) {
      cleanupRef.current = registerCategoryElement(node, categoryId, meta);
    }
  };
}
