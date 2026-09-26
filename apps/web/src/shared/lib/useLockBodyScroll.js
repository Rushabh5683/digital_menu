import { useEffect } from 'react';

/** Nested-safe body scroll lock (counts overlapping modals/sheets). */
let lockCount = 0;
let savedStyles = null;

/**
 * Lock document scroll while a sheet/modal is open.
 * Prevents background page scroll chaining on mobile.
 */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;

    const { body, documentElement } = document;

    if (lockCount === 0) {
      savedStyles = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
        touchAction: body.style.touchAction,
      };
      const scrollbarGap = window.innerWidth - documentElement.clientWidth;
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
      if (scrollbarGap > 0) {
        body.style.paddingRight = `${scrollbarGap}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && savedStyles) {
        body.style.overflow = savedStyles.overflow;
        body.style.paddingRight = savedStyles.paddingRight;
        body.style.touchAction = savedStyles.touchAction;
        savedStyles = null;
      }
    };
  }, [locked]);
}
