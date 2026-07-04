/**
 * AttendanceCard Component
 * Phase 4 M3 (CP3): a thin adapter over the standardized `ListItemCard` so the
 * attendance list matches the Tugas / Aktivitas / Lembur card anatomy. The
 * presence pill drives the status (warn "Tidak aktif" for not-clocked-in, ok
 * "Aktif" for clocked-in); area + clock-in time fill the meta + right slot.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListItemCard } from '../common/ListItemCard';
import { presencePill } from '../../utils/statusHelpers';

interface AttendanceCardProps {
  workerName: string;
  status: 'clocked_in' | 'not_clocked_in';
  clockInTime?: string;
  areaName?: string;
  onPress?: () => void;
  testID?: string;
}

const NOOP = () => {};

/** Format time from ISO string to HH:MM. */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function AttendanceCard({
  workerName,
  status,
  clockInTime,
  areaName,
  onPress,
  testID,
}: AttendanceCardProps): React.JSX.Element {
  const { t } = useTranslation('attendance');
  const isClockedIn = status === 'clocked_in';
  const pill = presencePill(isClockedIn ? 'active' : 'inactive');
  const rightText = isClockedIn && clockInTime ? formatTime(clockInTime) : t('shifts.notClockedIn');

  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      rightText={rightText}
      title={workerName}
      meta={[{ icon: 'map-marker', label: areaName ?? '—' }]}
      onPress={onPress ?? NOOP}
      testID={testID}
    />
  );
}
