/**
 * usePruningCapacityCalendar — Fetch 8-week capacity calendar for week picker.
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCapacity } from '../../../store/slices/serviceCapacitySlice';
import { getISOWeek } from '../../../utils/dateUtils';

export function usePruningCapacityCalendar(rayonId: string) {
  const dispatch = useAppDispatch();

  // Fetch the rayon's 8-week capacity calendar once rayonId is known.
  useEffect(() => {
    if (!rayonId) {
      return;
    }
    const today = new Date();
    const { year, week } = getISOWeek(today);
    void dispatch(
      fetchCapacity({
        rayonId,
        year,
        fromWeek: week,
        toWeek: Math.min(week + 7, 53),
        serviceType: 'pruning',
      }),
    );
  }, [dispatch, rayonId]);

  // Capacity calendar state — populated by fetchCapacity for the user's rayon.
  // Defensive against test stores that don't register the serviceCapacity slice.
  const capacityRows = useAppSelector((state) => {
    const slice = (state as any).serviceCapacity;
    if (!slice || !rayonId) {
      return [];
    }
    return slice.calendarByRayon?.[rayonId] ?? [];
  });
  const capacityLoading = useAppSelector(
    (state) => Boolean((state as any).serviceCapacity?.loading),
  );

  return { capacityRows, capacityLoading };
}
