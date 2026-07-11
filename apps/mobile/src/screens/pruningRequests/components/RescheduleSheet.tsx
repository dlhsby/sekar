/**
 * RescheduleSheet — admin "Atur Jadwal" entry point.
 *
 * Renders a fullscreen `NBModal` hosting `AvailabilityCalendar` so admin_rayon /
 * management can adjust a request's `expected_date` independent of the
 * assign-to-task flow. On confirm dispatches `reschedulePruningRequest`.
 *
 * Round 4 (Apr 28). Switched from `type="sheet"` to `type="fullscreen"` on
 * May 9, 2026 — the bottom-sheet layout collapsed because the calendar's
 * inner ScrollView has no bounded height when nested inside a sheet whose
 * own height is `flexShrink: 1`. Fullscreen gives the calendar the full
 * viewport, the NBModal scroll wrapper handles vertical overflow, and the
 * footer pins the action row predictably.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBModal, NBButton } from '../../../components/nb';
import { NBText } from '../../../components/nb/NBText';
import { NBToast } from '../../../components/nb/NBToast';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCapacity } from '../../../store/slices/serviceCapacitySlice';
import { reschedulePruningRequest } from '../../../store/slices/pruningRequestsSlice';
import {
  getISOWeek,
  formatDateLong,
  getIsoWeekBounds,
} from '../../../utils/dateUtils';
import type { PruningRequest } from '../../../types/models.types';

interface RescheduleSheetProps {
  visible: boolean;
  onClose: () => void;
  request: PruningRequest;
  onSuccess?: () => void;
}

export function RescheduleSheet({
  visible,
  onClose,
  request,
  onSuccess,
}: RescheduleSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const rayonId = (request as any).rayonId ?? (request as any).rayon_id ?? null;

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
  const reschedulingId = useAppSelector(
    (state) => state.pruningRequests.reschedulingId,
  );

  const [selected, setSelected] = useState<string | null>(null);

  // Derive the admin's calendar window:
  //   • rangeStart = MIN(today, mondayOfPreferredWeek)
  //     (show the warga's requested week even when it sits in the future,
  //      and don't hide today either — past cells stay disabled).
  //   • rangeEnd   = today + 3 months
  // Falls back to "today + 8 weeks" when the request has no preferred week.
  const expectedYear = (request as any).expectedYear as number | null | undefined;
  const expectedIsoWeek = (request as any).expectedIsoWeek as number | null | undefined;
  const preferredWeek = useMemo(
    () =>
      expectedYear != null && expectedIsoWeek != null
        ? { year: expectedYear, week: expectedIsoWeek }
        : null,
    [expectedYear, expectedIsoWeek],
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setMonth(end.getMonth() + 3);
    if (!preferredWeek) {
      return { rangeStart: today, rangeEnd: end };
    }
    const { monday } = getIsoWeekBounds(preferredWeek.year, preferredWeek.week);
    const startCandidate = monday < today ? monday : today;
    return { rangeStart: startCandidate, rangeEnd: end };
  }, [preferredWeek]);

  useEffect(() => {
    if (!visible || !rayonId) {
      return;
    }
    // Fetch capacity for the entire visible range so cells past the current
    // 8-week window aren't stuck on "Belum Diatur". We page the request by
    // ISO week — 14 weeks covers the worst case (today + 3 months).
    const today = new Date();
    const { year, week } = getISOWeek(today);
    void dispatch(
      fetchCapacity({
        rayonId,
        year,
        fromWeek: week,
        toWeek: Math.min(week + 13, 53),
        serviceType: 'pruning',
      }),
    );
  }, [dispatch, rayonId, visible]);

  const submit = async () => {
    if (!selected) {
      NBToast.show({
        level: 'warning',
        title: t('pruning:actions.reschedule.selectDate'),
        body: t('pruning:actions.reschedule.selectDateHint'),
      });
      return;
    }
    try {
      await dispatch(
        reschedulePruningRequest({ id: request.id, expectedDate: selected }),
      ).unwrap();
      NBToast.show({
        level: 'success',
        title: t('pruning:actions.reschedule.successTitle'),
        body: t('pruning:actions.reschedule.successMessage', { date: formatDateLong(selected) }),
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      NBToast.show({
        level: 'danger',
        title: t('pruning:actions.reschedule.failedTitle'),
        body: e instanceof Error ? e.message : t('pruning:actions.reschedule.failedMessage'),
      });
    }
  };

  const isBusy = reschedulingId === request.id;

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={t('pruning:actions.reschedule.title')}
      type="fullscreen"
      footer={
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <NBButton
              title={t('pruning:actions.reschedule.cancel')}
              variant="secondary"
              onPress={onClose}
              disabled={isBusy}
              size="lg"
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <NBButton
              title={isBusy ? t('pruning:actions.reschedule.saving') : t('pruning:actions.reschedule.save')}
              onPress={submit}
              loading={isBusy}
              disabled={isBusy || !selected}
              size="lg"
              fullWidth
              testID="perantingan-reschedule-save"
            />
          </View>
        </View>
      }
    >
      <View style={styles.body}>
        <NBText variant="caption" style={styles.helper}>
          {t('pruning:actions.reschedule.helper', { code: (request as any).referenceCode ?? '' })}
        </NBText>
        <AvailabilityCalendar
          rows={capacityRows}
          selectedDate={selected}
          onSelect={setSelected}
          loading={capacityLoading}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          preferredWeek={preferredWeek}
        />
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  // NBModal's `fullscreenBody` wraps children in `padding: nbSpacing.lg`
  // (24 dp on every side). For the calendar that left ~48 dp of dead
  // vertical space — too much above the helper text and between the
  // calendar bottom and the footer chrome. Negative vertical margins
  // reclaim ~20 dp on each side without touching NBModal globals; the
  // 4 dp top inset keeps the helper from kissing the modal header
  // border, and the 0 dp bottom lets the calendar's last row sit
  // directly above the footer's top divider.
  body: {
    flex: 1,
    marginTop: -nbSpacing.md,
    marginBottom: -nbSpacing.lg,
    paddingTop: 4,
  },
  helper: {
    color: nbColors.gray700,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
});
