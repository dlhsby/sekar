/**
 * OvertimeReasonCard — Displays the overtime reason
 */

import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
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

interface OvertimeReasonCardProps {
  reason?: string;
}

export const OvertimeReasonCard: React.FC<OvertimeReasonCardProps> = ({ reason }) => (
  <NBCard style={[{ marginHorizontal: nbSpacing.md, marginBottom: nbSpacing.md, ...nbShadows.sm }]}>
    <NBCardHeader>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="message-text-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>ALASAN LEMBUR</NBText>
      </View>
    </NBCardHeader>
    <NBCardContent>
      <NBText
        variant="body"
        color={!reason ? 'gray400' : 'black'}
        style={[!reason && { fontStyle: 'italic' }]}
      >
        {reason || '(Tidak ada alasan)'}
      </NBText>
    </NBCardContent>
  </NBCard>
);
