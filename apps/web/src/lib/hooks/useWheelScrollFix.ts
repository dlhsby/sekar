import * as React from 'react';

/**
 * Returns a callback ref for a scrollable element (e.g. a combobox listbox)
 * that must still wheel-scroll when rendered inside a modal Radix Dialog.
 *
 * Radix Dialog is modal → `react-remove-scroll` adds a document-level wheel
 * listener that `preventDefault`s scrolling of anything outside the dialog's
 * subtree (the popover is portaled to <body>, so it's outside). We handle the
 * wheel on the scroll container itself: scroll it manually and stop the event
 * before it bubbles to that document-level lock. Also stops touchmove for the
 * mobile equivalent.
 *
 * Uses a React 19 cleanup-returning callback ref so it attaches when the node
 * mounts (the listbox is only in the DOM while the popover is open).
 */
export function useWheelScrollFix<T extends HTMLElement>(): (el: T | null) => void {
  return React.useCallback((el: T | null) => {
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      el.scrollTop += e.deltaY;
      e.preventDefault();
      e.stopPropagation();
    };
    const onTouchMove = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
}
