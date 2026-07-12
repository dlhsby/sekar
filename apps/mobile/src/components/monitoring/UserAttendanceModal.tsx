/**
 * UserAttendanceModal — per-user attendance detail for a selected date (Phase 4
 * M3 / CP3). Opened from a row in the AttendanceDetailModal. Fetches
 * `/supervisor/attendance/:userId?date=` and shows clock-in/out, duration, and
 * geofence flags (or a "belum clock in" state).
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { NBSkeleton } from '../nb/NBSkeleton';
import { StatusPill } from '../home/StatusPill';
import { getUserAttendanceDetail } from '../../services/api/monitoringApi';
import { ROLE_LABELS } from '../../constants/roles';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../constants/nbTokens';
import type { UserAttendanceDetail } from '../../types/api.types';
import type { UserRole } from '../../types/models.types';

interface UserAttendanceModalProps {
  visible: boolean;
  userId: string | null;
  /** Fallback name shown in the header while the detail loads. */
  userName?: string;
  /** Date (YYYY-MM-DD) to fetch the attendance for. */
  date: string;
  onClose: () => void;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(minutes: number | null, t: any): string {
  if (minutes == null) { return t('monitoring:userAttendance.running'); }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}j ${m}m`;
}

export function UserAttendanceModal({
  visible,
  userId,
  userName,
  date,
  onClose,
}: UserAttendanceModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<UserAttendanceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible || !userId) { return; }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setDetail(null);
    getUserAttendanceDetail(userId, date)
      .then((res) => {
        if (cancelled) { return; }
        if (res.data) { setDetail(res.data); } else { setError(true); }
      })
      .catch(() => { if (!cancelled) { setError(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [visible, userId, date]);

  const clockedIn = detail?.clocked_in ?? false;
  const headerName = detail?.user.full_name ?? userName ?? t('monitoring:userAttendance.defaultName');
  const roleArea = detail
    ? `${ROLE_LABELS[detail.user.role as UserRole] ?? detail.user.role}${detail.user.location ? ` · ${detail.user.location.name}` : ''}`
    : null;

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      type="sheet"
      title={t('monitoring:userAttendance.title')}
      testID="user-attendance-modal"
    >
      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <NBText variant="h3" color="black" numberOfLines={2}>{headerName}</NBText>
            {roleArea ? (
              <NBText variant="mono-sm" color="gray600">{roleArea}</NBText>
            ) : null}
          </View>
          {detail ? (
            <StatusPill
              dot
              tone={clockedIn ? 'ok' : 'warn'}
              label={clockedIn ? t('monitoring:userAttendance.clockedIn') : t('monitoring:userAttendance.notClockedIn')}
            />
          ) : null}
        </View>

        {loading ? (
          <NBSkeleton variant="card" height={120} />
        ) : error ? (
          <NBText variant="body-sm" color="gray500" align="center" style={styles.msg}>
            {t('monitoring:userAttendance.loadError')}
          </NBText>
        ) : detail && clockedIn && detail.shift ? (
          <View style={styles.detailCard}>
            <DetailRow icon="login" label={t('monitoring:userAttendance.clockIn')} value={fmtTime(detail.shift.clock_in_time)} />
            <DetailRow
              icon="logout"
              label={t('monitoring:userAttendance.clockOut')}
              value={detail.shift.clock_out_time ? fmtTime(detail.shift.clock_out_time) : t('monitoring:userAttendance.notClockedOut')}
            />
            <DetailRow
              icon="timer-outline"
              label={t('monitoring:userAttendance.duration')}
              value={fmtDuration(detail.shift.duration_minutes, t)}
            />
            {(detail.shift.clock_in_outside_boundary || detail.shift.clock_out_outside_boundary) ? (
              <DetailRow
                icon="map-marker-alert"
                label={t('monitoring:userAttendance.outsideBoundary')}
                value={t('monitoring:userAttendance.yes')}
                valueColor={nbColors.statusMissing}
                isLast
              />
            ) : null}
          </View>
        ) : detail ? (
          <NBText variant="body-sm" color="gray500" align="center" style={styles.msg}>
            {t('monitoring:userAttendance.notClockedInDate')}
          </NBText>
        ) : null}
      </View>
    </NBModal>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      <MaterialCommunityIcons name={icon} size={16} color={nbColors.gray500} />
      <NBText variant="body-sm" color="gray700" style={styles.detailLabel}>{label}</NBText>
      <NBText
        variant="body-sm"
        style={[styles.detailValue, valueColor ? { color: valueColor } : undefined]}
      >
        {value}
      </NBText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: nbSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  msg: {
    paddingVertical: nbSpacing.lg,
  },
  detailCard: {
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
  },
  detailRowBorder: {
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    fontWeight: '600',
    color: nbColors.black,
  },
});

export default UserAttendanceModal;
