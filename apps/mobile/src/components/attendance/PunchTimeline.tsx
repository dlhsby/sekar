import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBText, NBBadge } from '../nb';
import { getPunchLog } from '../../services/api/shiftsApi';
import { formatTime } from '../../utils/dateUtils';
import { nbColors, nbSpacing, nbBorders } from '../../constants/nbTokens';
import type { PunchLogDay, PunchSession, PunchEntry } from '../../types/api.types';

interface PunchTimelineProps {
  date: string; // YYYY-MM-DD (WIB service-day)
}

function workedLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

/**
 * PunchTimeline — the raw punch log for a service-day (ADR-055 Phase 4). Renders
 * each session (first-in / last-out / worked) with its ordered punches as a
 * clock-in/out timeline. Read-only: punches are immutable.
 */
export function PunchTimeline({ date }: PunchTimelineProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [log, setLog] = useState<PunchLogDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPunchLog(date)
      .then((res) => {
        if (active) setLog(res.data ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date]);

  if (loading) {
    return (
      <NBCard style={styles.card}>
        <ActivityIndicator color={nbColors.primary} />
      </NBCard>
    );
  }

  const sessions = log?.sessions ?? [];
  if (sessions.length === 0) return null;

  return (
    <NBCard style={styles.card}>
      <NBText variant="mono-sm" color="gray700" uppercase style={styles.header}>
        {t('attendance:detail.punchLog.title')}
      </NBText>
      {sessions.map((session, i) => (
        <SessionBlock key={`${session.shift_definition_id ?? 'none'}-${i}`} session={session} />
      ))}
    </NBCard>
  );
}

function SessionBlock({ session }: { session: PunchSession }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View style={styles.session} testID="punch-session">
      <View style={styles.sessionHead}>
        <NBText variant="body" color="black">
          {session.is_overtime
            ? t('attendance:detail.punchLog.overtime')
            : t('attendance:detail.punchLog.session')}
        </NBText>
        {session.is_open ? (
          <NBBadge text={t('attendance:detail.punchLog.open')} color="warning" size="sm" />
        ) : (
          <NBText variant="caption" color="gray500">
            {workedLabel(session.worked_minutes)}
          </NBText>
        )}
      </View>
      {session.punches.map((punch) => (
        <PunchRow key={punch.id} punch={punch} />
      ))}
    </View>
  );
}

function PunchRow({ punch }: { punch: PunchEntry }): React.JSX.Element {
  const { t } = useTranslation();
  const isIn = punch.label === 'clock_in';
  return (
    <View style={styles.punchRow} testID={`punch-row-${punch.label}`}>
      <MaterialCommunityIcons
        name={isIn ? 'login' : 'logout'}
        size={18}
        color={isIn ? nbColors.success : nbColors.danger}
      />
      <NBText variant="body-sm" color="black" style={styles.punchLabel}>
        {isIn ? t('attendance:detail.punchLog.masuk') : t('attendance:detail.punchLog.keluar')}
      </NBText>
      <NBText variant="body-sm" color="gray700">
        {formatTime(punch.punched_at)}
      </NBText>
      <NBText
        variant="caption"
        color={punch.outside_boundary ? 'danger' : 'gray500'}
        style={styles.punchArea}
      >
        {punch.outside_boundary
          ? t('attendance:detail.punchLog.outArea')
          : t('attendance:detail.punchLog.inArea')}
      </NBText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: nbSpacing.md, marginTop: nbSpacing.md },
  header: { marginBottom: nbSpacing.sm },
  session: {
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.gray200,
    paddingTop: nbSpacing.sm,
    marginTop: nbSpacing.sm,
    gap: nbSpacing.xs,
  },
  sessionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  punchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: 2,
  },
  punchLabel: { flex: 1 },
  punchArea: { marginLeft: 'auto' },
});

export default PunchTimeline;
