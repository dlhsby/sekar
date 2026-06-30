import { useState, useCallback } from 'react';

/**
 * Shared hook for detail modal state management.
 * Centralizes the repeated pattern of tracking modal open state + selected item.
 *
 * @template T The type of item being viewed
 * @returns Object with modal state and handlers
 */
export function useViewModal<T>() {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<T | null>(null);

  const openWith = useCallback((next: T) => {
    setItem(next);
    setOpen(true);
  }, []);

  return { open, item, openWith, onOpenChange: setOpen } as const;
}
