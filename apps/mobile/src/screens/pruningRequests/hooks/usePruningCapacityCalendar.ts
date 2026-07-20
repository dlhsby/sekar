/**
 * usePruningCapacityCalendar — Fetch 8-week capacity calendar for week picker.
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCapacity } from '../../../store/slices/serviceCapacitySlice';
import { getISOWeek } from '../../../utils/dateUtils';

export function usePruningCapacityCalendar(districtId: string) {
  const dispatch = useAppDispatch();

  // Fetch the district's 8-week capacity calendar once districtId is known.
  useEffect(() => {
    if (!districtId) {
      return;
    }
    const today = new Date();
    const { year, week } = getISOWeek(today);
    void dispatch(
      fetchCapacity({
        districtId,
        year,
        fromWeek: week,
        toWeek: Math.min(week + 7, 53),
        serviceType: 'pruning',
      }),
    );
  }, [dispatch, districtId]);

  // Capacity calendar state — populated by fetchCapacity for the user's district.
  // Defensive against test stores that don't register the serviceCapacity slice.
  const capacityRows = useAppSelector((state) => {
    const slice = (state as any).serviceCapacity;
    if (!slice || !districtId) {
      return [];
    }
    return slice.calendarByDistrict?.[districtId] ?? [];
  });
  const capacityLoading = useAppSelector(
    (state) => Boolean((state as any).serviceCapacity?.loading),
  );

  return { capacityRows, capacityLoading };
}
