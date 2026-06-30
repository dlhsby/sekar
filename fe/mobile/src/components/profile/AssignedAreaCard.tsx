/**
 * AssignedAreaCard Component
 * Compact display of the user's assigned work area (PRF-1).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbRadius, nbBorders, nbShadows } from '../../constants/nbTokens';

interface AssignedAreaCardProps {
  area: {
    name?: string;
    areaType?: { name?: string };
    radius_meters?: number;
    address?: string;
  } | null;
  testID?: string;
}

export const AssignedAreaCard: React.FC<AssignedAreaCardProps> = ({
  area,
  testID = 'assigned-area-card',
}) => {
  const metaParts = [area?.areaType?.name, area?.radius_meters ? `${area.radius_meters}m radius` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.wrapper} testID={testID}>
      <NBText variant="mono-sm" color="gray600" uppercase style={styles.title}>
        Area Ditugaskan
      </NBText>
      <View style={styles.card}>
        {area ? (
          <View style={styles.row}>
            <View style={styles.iconChip}>
              <MaterialCommunityIcons name="map-marker-radius" size={16} color={nbColors.black} />
            </View>
            <View style={styles.body}>
              <NBText variant="body-sm" color="black" style={styles.areaName} numberOfLines={1}>
                {area.name ?? '—'}
              </NBText>
              {metaParts ? (
                <NBText variant="mono-sm" color="gray600" numberOfLines={1}>
                  {metaParts}
                </NBText>
              ) : null}
              {area.address ? (
                <NBText variant="mono-sm" color="gray500" numberOfLines={2} style={styles.address}>
                  {area.address}
                </NBText>
              ) : null}
            </View>
          </View>
        ) : (
          <NBText variant="body-sm" color="gray500" align="center" style={styles.noArea}>
            Tidak ada area ditugaskan
          </NBText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  title: {
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
    marginLeft: nbSpacing.xs,
  },
  card: {
    backgroundColor: nbColors.white,
    padding: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nbSpacing.sm,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.bgAccentMint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  areaName: {
    fontWeight: '700',
  },
  address: {
    marginTop: 2,
  },
  noArea: {
    fontStyle: 'italic',
  },
});
