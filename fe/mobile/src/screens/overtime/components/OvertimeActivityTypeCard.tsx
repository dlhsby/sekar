/**
 * OvertimeActivityTypeCard — Displays activity type name and description
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
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
import type { Overtime } from '../../../types/models.types';

interface OvertimeActivityTypeCardProps {
  overtime: Overtime;
}

export const OvertimeActivityTypeCard: React.FC<OvertimeActivityTypeCardProps> = ({ overtime }) => {
  const { t } = useTranslation();
  if (!overtime.activityType) return null;

  return (
    <NBCard style={[{ marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md, ...nbShadows.sm }]}>
      <NBCardHeader>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="tag-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
          <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>{t('overtime:activityTypeLabel')}</NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body" color="black">{overtime.activityType.name}</NBText>
        {overtime.activityType.description && (
          <NBText variant="body-sm" color="gray600" style={{ marginTop: nbSpacing.xs }}>
            {overtime.activityType.description}
          </NBText>
        )}
      </NBCardContent>
    </NBCard>
  );
};
