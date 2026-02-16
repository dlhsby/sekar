/**
 * AssignedAreaCard Component
 * Displays the user's assigned work area
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { nbColors, nbTypography, nbSpacing, nbBorderRadius, nbBorders, nbShadows } from '../../constants/nbTokens';
import { NBCard } from '../nb';

interface AssignedAreaCardProps {
  area: {
    name?: string;
    area_type?: { name?: string };
    radius_meters?: number;
    address?: string;
  } | null;
  testID?: string;
}

export const AssignedAreaCard: React.FC<AssignedAreaCardProps> = ({
  area,
  testID = 'assigned-area-card',
}) => {
  return (
    <NBCard variant="elevated" style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>Area Ditugaskan</Text>
      {area ? (
        <View style={styles.areaInfo}>
          <Text style={styles.areaName}>{area.name}</Text>
          <Text style={styles.areaType}>
            {area.area_type?.name} - {area.radius_meters}m radius
          </Text>
          {area.address && (
            <Text style={styles.areaAddress} numberOfLines={2}>
              {area.address}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.noArea}>Tidak ada area ditugaskan</Text>
      )}
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
  },
  areaInfo: {
    paddingTop: nbSpacing.xs,
  },
  areaName: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  areaType: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginBottom: nbSpacing.xs,
  },
  areaAddress: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    lineHeight: nbTypography.fontSize.sm * nbTypography.lineHeight.normal,
  },
  noArea: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: nbSpacing.md,
  },
});
