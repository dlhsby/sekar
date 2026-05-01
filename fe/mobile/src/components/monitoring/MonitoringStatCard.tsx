import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbSpacing,
  nbShadows,
} from '../../constants/nbTokens';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MonitoringStatCardProps {
  label: string;
  value: number | string;
  accent: string;
  icon?: string;
  subtitle?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MonitoringStatCard = React.memo(function MonitoringStatCard({
  label,
  value,
  accent,
  icon,
  subtitle,
}: MonitoringStatCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.row}>
        {icon && (
          <MaterialCommunityIcons name={icon} size={16} color={accent} />
        )}
        <NBText variant="h3" style={{ color: accent }}>
          {String(value)}
        </NBText>
      </View>
      <NBText variant="caption" color="gray600">{label}</NBText>
      {subtitle && (
        <NBText variant="caption" color="gray500">{subtitle}</NBText>
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderLeftWidth: 4,
    borderRadius: nbBorderRadius.base,
    padding: nbSpacing.sm,
    gap: 2,
    ...nbShadows.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
});
