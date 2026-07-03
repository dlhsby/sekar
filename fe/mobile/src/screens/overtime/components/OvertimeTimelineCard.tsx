/**
 * OvertimeTimelineCard — Timeline of approval/rejection workflow
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbShadows,
} from '../../../constants/nbTokens';
import { formatDateTimeIndonesian } from '../../../utils/statusHelpers';
import type { Overtime } from '../../../types/models.types';

interface TimelineStepProps {
  done: boolean;
  label: string;
  timestamp?: string;
  note?: string;
  isLast: boolean;
}

function TimelineStep({ done, label, timestamp, note, isLast }: TimelineStepProps): React.JSX.Element {
  return (
    <View style={tlStyles.step}>
      <View style={tlStyles.iconCol}>
        <MaterialCommunityIcons
          name={done ? 'circle' : 'circle-outline'}
          size={16}
          color={done ? nbColors.primary : nbColors.gray400}
        />
        {!isLast && <View style={tlStyles.connector} />}
      </View>
      <View style={tlStyles.content}>
        <NBText variant="body-sm" color={done ? 'black' : 'gray400'}>{label}</NBText>
        {timestamp ? (
          <NBText variant="caption" color="gray500" style={{ marginTop: 1 }}>{timestamp}</NBText>
        ) : null}
        {note ? (
          <NBText variant="caption" color="gray600" style={{ marginTop: 2 }}>{note}</NBText>
        ) : null}
        {!isLast && <View style={tlStyles.contentSpacer} />}
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCol: {
    alignItems: 'center',
    width: 24,
    marginRight: nbSpacing.sm,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: nbColors.gray300,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingBottom: nbSpacing.sm,
  },
  contentSpacer: {
    height: nbSpacing.xs,
  },
});

interface OvertimeTimelineCardProps {
  overtime: Overtime;
}

export const OvertimeTimelineCard: React.FC<OvertimeTimelineCardProps> = ({ overtime }) => {
  const { t } = useTranslation();
  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>RIWAYAT PENGAJUAN</NBText>
      </NBCardHeader>
      <NBCardContent>
        <TimelineStep
          done
          label="Diajukan"
          timestamp={formatDateTimeIndonesian(overtime.created_at)}
          note={overtime.user?.full_name}
          isLast={overtime.status === 'pending' && !overtime.approved_at}
        />
        {(overtime.status === 'approved' || overtime.status === 'rejected') && (
          <TimelineStep
            done
            label={overtime.status === 'approved' ? t('status:approved') : t('status:rejected')}
            timestamp={overtime.approved_at ? formatDateTimeIndonesian(overtime.approved_at) : formatDateTimeIndonesian(overtime.updated_at)}
            note={overtime.approver?.full_name}
            isLast={overtime.status === 'rejected'}
          />
        )}
        {overtime.status === 'approved' && (
          <TimelineStep
            done={false}
            label="Akan dijalankan"
            timestamp={formatDateTimeIndonesian(overtime.start_datetime)}
            isLast
          />
        )}
      </NBCardContent>
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
});
