/**
 * RescheduleSheet — admin reschedule entry point.
 *
 * Renders an `NBModal` sheet hosting `AvailabilityCalendar` so admin_data /
 * top_management can adjust a request's `expected_date` independent of the
 * convert-to-task flow. On confirm dispatches `reschedulePruningRequest`.
 *
 * Round 4 (Apr 28).
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NBModal, NBButton } from '../../../components/nb';
import { NBText } from '../../../components/nb/NBText';
import { NBToast } from '../../../components/nb/NBToast';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCapacity } from '../../../store/slices/serviceCapacitySlice';
import { reschedulePruningRequest } from '../../../store/slices/pruningRequestsSlice';
import { getISOWeek, formatDateLong } from '../../../utils/dateUtils';
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

  useEffect(() => {
    if (!visible || !rayonId) {
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
  }, [dispatch, rayonId, visible]);

  const submit = async () => {
    if (!selected) {
      NBToast.show({
        level: 'warning',
        title: 'Pilih tanggal',
        body: 'Tap salah satu tanggal yang tersedia di kalender.',
      });
      return;
    }
    try {
      await dispatch(
        reschedulePruningRequest({ id: request.id, expectedDate: selected }),
      ).unwrap();
      NBToast.show({
        level: 'success',
        title: 'Jadwal diperbarui',
        body: `Tanggal diharapkan: ${formatDateLong(selected)}`,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      NBToast.show({
        level: 'danger',
        title: 'Gagal menyimpan',
        body: e instanceof Error ? e.message : 'Coba lagi.',
      });
    }
  };

  const isBusy = reschedulingId === request.id;

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Atur Jadwal"
      type="sheet"
      size="lg"
      footer={
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <NBButton title="Batal" variant="secondary" onPress={onClose} disabled={isBusy} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <NBButton
              title={isBusy ? 'Menyimpan…' : 'Simpan'}
              onPress={submit}
              loading={isBusy}
              disabled={isBusy || !selected}
              fullWidth
              testID="perantingan-reschedule-save"
            />
          </View>
        </View>
      }
    >
      <View style={styles.body}>
        <NBText variant="body-sm" style={styles.helper}>
          Pilih tanggal baru untuk permohonan {(request as any).referenceCode ?? ''}.
        </NBText>
        <AvailabilityCalendar
          rows={capacityRows}
          selectedDate={selected}
          onSelect={setSelected}
          loading={capacityLoading}
        />
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  helper: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    padding: nbSpacing.md,
  },
});
