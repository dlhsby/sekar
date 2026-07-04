/**
 * OvertimeTrailCard — Route location view button (for authorized roles)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBButton,
  NBText,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbShadows,
} from '../../../constants/nbTokens';

interface OvertimeTrailCardProps {
  onPress: () => void;
}

export const OvertimeTrailCard: React.FC<OvertimeTrailCardProps> = ({ onPress }) => {
  const { t } = useTranslation();
  return (
    <NBCard style={[{ marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md, ...nbShadows.sm }]}>
      <NBCardHeader>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="map-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
          <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>{t('overtime:components.trailTitle')}</NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        <NBButton
          title={t('overtime:components.viewTrailButtonLabel')}
          variant="secondary"
          fullWidth
          onPress={onPress}
        />
      </NBCardContent>
    </NBCard>
  );
};
