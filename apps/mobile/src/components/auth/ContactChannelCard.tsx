/**
 * ContactChannelCard — a tappable contact row (WhatsApp / phone) used on the
 * forgot-password screen (AS-4) to reach a district admin.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';
import { NBText } from '../nb';

export interface ContactChannelCardProps {
  variant: 'whatsapp' | 'phone';
  title: string;
  value: string;
  onPress: () => void;
  testID?: string;
}

export function ContactChannelCard({
  variant,
  title,
  value,
  onPress,
  testID,
}: ContactChannelCardProps): React.JSX.Element {
  const isWhatsApp = variant === 'whatsapp';
  return (
    <Pressable
      style={[styles.card, { backgroundColor: isWhatsApp ? nbColors.statusActiveBg : nbColors.bgSurface }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      testID={testID}
    >
      <View style={[styles.icon, { backgroundColor: isWhatsApp ? nbColors.statusActive : nbColors.info }]}>
        <MaterialCommunityIcons name={isWhatsApp ? 'whatsapp' : 'phone'} size={20} color={nbColors.white} />
      </View>
      <View style={styles.body}>
        <NBText variant="body-sm" color="black" style={styles.title}>
          {title}
        </NBText>
        <NBText variant="mono-sm" color="gray600">
          {value}
        </NBText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={nbColors.gray500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.md,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    ...nbShadows.xs,
  },
  icon: {
    width: 38,
    height: 38,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontWeight: '700' },
});

export default ContactChannelCard;
