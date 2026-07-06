/**
 * Shared helpers for the date/time picker family (date-picker, date-time-picker,
 * date-range-picker, time-picker). Keeps ISO parsing/formatting and the popover
 * anchor pattern in one place instead of copy-pasted per picker.
 */
import { useRef } from 'react';
import { format } from 'date-fns';

/** Parse a `yyyy-MM-dd` string into a local-midnight Date (`undefined` if empty/invalid). */
export function parseIso(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Format a Date as a local `yyyy-MM-dd` string. */
export const toIso = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Today's local date as a `yyyy-MM-dd` string. */
export const todayIso = (): string => format(new Date(), 'yyyy-MM-dd');

export interface PopoverAnchor {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  /** True when an event target lives inside the anchored trigger element. */
  insideAnchor: (target: EventTarget | null) => boolean;
}

/**
 * Anchor ref + an `insideAnchor` predicate, used to keep a Radix popover open
 * when focus/interaction lands back on its own trigger.
 */
export function usePopoverAnchor(): PopoverAnchor {
  const anchorRef = useRef<HTMLDivElement>(null);
  const insideAnchor = (target: EventTarget | null): boolean =>
    target instanceof Node && (anchorRef.current?.contains(target) ?? false);
  return { anchorRef, insideAnchor };
}
