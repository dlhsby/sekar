/**
 * OvertimeGeneralInfoCard — General info tile grid (date, time, officer, area)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
} from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../../constants/nbTokens';
import {
  formatDateIndonesian,
  formatDurationHours,
} from '../../../utils/statusHelpers';
import type { Overtime } from '../../../types/models.types';

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimeShort(isoString: string): string {
  const d = new Date(isoString);
  return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`;
}

interface OvertimeGeneralInfoCardProps {
  overtime: Overtime;
}

export const OvertimeGeneralInfoCard: React.FC<OvertimeGeneralInfoCardProps> = ({ overtime }) => {
  const { t } = useTranslation();
  return (
  <NBCard style={styles.card}>
    <NBCardHeader>
      <View style={styles.sectionHeaderRow}>
        <MaterialCommunityIcons name="information-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>{t('overtime:components.generalInfoTitle')}</NBText>
      </View>
    </NBCardHeader>
    <NBCardContent>
      <View style={styles.infoTileRow}>
        <View style={styles.infoTile}>
          <NBText variant="mono-sm" color="gray500" uppercase style={{ letterSpacing: 0.6, marginBottom: 4 }}>{t('overtime:components.dateLabel')}</NBText>
          <NBText variant="body-sm" color="black">{formatDateIndonesian(overtime.start_datetime)}</NBText>
        </View>
        <View style={[styles.infoTile, styles.infoTileJam]}>
          <NBText variant="mono-sm" color="gray500" uppercase style={{ letterSpacing: 0.6, marginBottom: 4 }}>{t('overtime:components.timeLabel')}</NBText>
          <NBText variant="body-sm" color="black">
            {formatTimeShort(overtime.start_datetime)}{overtime.end_datetime ? ` — ${formatTimeShort(overtime.end_datetime)}` : ''}
          </NBText>
          {overtime.end_datetime && (
            <NBText variant="caption" color="gray600" style={{ marginTop: 2 }}>
              {formatDurationHours(overtime.start_datetime, overtime.end_datetime)}
            </NBText>
          )}
        </View>
      </View>

      {overtime.user && (
        <DetailRow
          label={t('overtime:components.staffLabel')}
          value={`${overtime.user.role} - ${overtime.user.full_name}`}
        />
      )}
      {overtime.location?.name && (
        <DetailRow
          label={t('overtime:components.areaLabel')}
          value={overtime.location.name}
          isLast={!overtime.location?.name}
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTileRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  infoTile: {
    flex: 1,
    padding: nbSpacing.sm,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  infoTileJam: {
    backgroundColor: nbColors.statusIdleBg,
  },
});
