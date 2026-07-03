'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils/cn';

/**
 * Popover — Neo Brutalism floating surface (host for DatePicker / TimePicker /
 * combobox). 2px black border, hard-edge shadow, rounded-nb-md.
 */
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = 'start', sideOffset = 6, ...props }, ref) {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  // A Radix Dialog is modal (react-remove-scroll locks the page with a
  // capture-phase handler). Because the popover is portaled to <body> — outside
  // the dialog subtree — that lock blocks wheel scrolling of a scrollable popover
  // child (e.g. a combobox listbox), and a bubble-phase stopPropagation can't
  // beat the capture-phase preventDefault. So we scroll the list ourselves:
  // find the scrollable element under the pointer and adjust its scrollTop
  // directly (works regardless of the page lock), stopping the event so it
  // neither double-scrolls nor reaches the lock.
  React.useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const findScrollable = (start: EventTarget | null): HTMLElement | null => {
      let node = start as HTMLElement | null;
      while (node && node !== el.parentElement) {
        if (
          node.scrollHeight > node.clientHeight &&
          /(auto|scroll)/.test(getComputedStyle(node).overflowY)
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    };
    const onWheel = (e: WheelEvent) => {
      const scroller = findScrollable(e.target);
      if (!scroller) return;
      scroller.scrollTop += e.deltaY;
      e.preventDefault();
      e.stopPropagation();
    };
    const stopTouch = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', stopTouch, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', stopTouch);
    };
  }, []);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={setRefs}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 border-2 border-nb-black rounded-nb-md bg-nb-white p-1 text-nb-black shadow-nb-lg outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
