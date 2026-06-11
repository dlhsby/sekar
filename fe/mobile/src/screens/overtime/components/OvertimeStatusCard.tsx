/**
 * OvertimeStatusCard — Displays status badge and rejection reason
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBadge,
  NBText,
} from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import {
  nbSpacing,
  nbShadows,
} from '../../../constants/nbTokens';
import {
  getOvertimeStatusColor,
  getOvertimeStatusLabel,
} from '../../../utils/statusHelpers';
import type { Overtime } from '../../../types/models.types';

function overtimeCode(id: string): string {
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

interface OvertimeStatusCardProps {
  overtime: Overtime;
}

export const OvertimeStatusCard: React.FC<OvertimeStatusCardProps> = ({ overtime }) => (
  <NBCard style={styles.card}>
    <NBCardHeader>
      <View style={styles.statusRow}>
        <View>
          <NBText variant="mono-sm" color="gray500" style={{ letterSpacing: 0.6 }}>{overtimeCode(overtime.id)}</NBText>
          <NBText variant="body-sm" color="gray600" style={{ marginTop: 1 }}>ID Pengajuan</NBText>
        </View>
        <NBBadge
          text={getOvertimeStatusLabel(overtime.status)}
          color={getOvertimeStatusColor(overtime.status)}
        />
      </View>
    </NBCardHeader>
    <NBCardContent>
      {overtime.status === 'rejected' && overtime.rejection_reason && (
        <DetailRow
          label="Alasan Penolakan"
          value={overtime.rejection_reason}
          variant="description"
          labelColor="danger"
        />
      )}
    </NBCardContent>
  </NBCard>
);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
