/**
 * OvertimeDescriptionCard — Displays description field
 */

import React from 'react';
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

interface OvertimeDescriptionCardProps {
  description?: string;
}

export const OvertimeDescriptionCard: React.FC<OvertimeDescriptionCardProps> = ({ description }) => (
  <NBCard style={[{ marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md, ...nbShadows.sm }]}>
    <NBCardHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="text-box-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>DESKRIPSI</NBText>
      </View>
    </NBCardHeader>
    <NBCardContent>
      <NBText
        variant="body"
        color={!description ? 'gray400' : 'black'}
        style={[!description && { fontStyle: 'italic' }]}
      >
        {description || '(Belum diisi)'}
      </NBText>
    </NBCardContent>
  </NBCard>
);
