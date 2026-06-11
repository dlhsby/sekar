/**
 * OvertimeDurationCard
 * Displays active overtime duration, start time, and reason (State B).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBText } from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../../constants/nbTokens';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface OvertimeDurationCardProps {
  elapsed: string;
  startTime: string;
  reason?: string;
}

const OvertimeDurationCard: React.FC<OvertimeDurationCardProps> = ({
  elapsed,
  startTime,
  reason,
}) => (
  <View style={[styles.card, styles.durasiCard]}>
    <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.8, marginBottom: nbSpacing.xs }}>
      DURASI
    </NBText>
    <NBText variant="display-xl" color="statusIdle" style={styles.timerValue}>
      {elapsed}
    </NBText>
    <View style={styles.startTimeRow}>
      <NBText variant="body-sm" color="gray600" style={styles.startTimeLabel}>
        Mulai:
      </NBText>
      <NBText variant="body-sm" color="black" style={styles.startTimeValue}>
        {formatTime(startTime)}
      </NBText>
    </View>
    {reason && (
      <View style={styles.reasonRow}>
        <NBText variant="body-sm" color="gray600" style={styles.startTimeLabel}>
          Alasan:
        </NBText>
        <NBText variant="body-sm" color="black" style={styles.reasonValue}>
          {reason}
        </NBText>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  durasiCard: {
    backgroundColor: withAlpha(nbColors.statusIdle, 0.08),
    alignItems: 'center',
  },
  timerValue: {
    letterSpacing: 1,
    textAlign: 'center',
  },
  startTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray300,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: nbSpacing.xs,
  },
  startTimeLabel: {},
  startTimeValue: {},
  reasonValue: {
    flex: 1,
    marginLeft: nbSpacing.xs,
  },
});

export default OvertimeDurationCard;
