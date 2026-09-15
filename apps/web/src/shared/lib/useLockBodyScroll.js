import { useEffect } from 'react';

/**
 * Lock document scroll while a sheet/modal is open.
 * Prevents background page scroll chaining on mobile.
 */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousTouchAction = body.style.touchAction;
    const scrollbarGap = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      body.style.touchAction = previousTouchAction;
    };
  }, [locked]);
}
