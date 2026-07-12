/**
 * AssignedLocationCard Component
 * Compact display of the user's assigned work location (PRF-1).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbRadius, nbBorders, nbShadows } from '../../constants/nbTokens';

interface AssignedLocationCardProps {
  location: {
    name?: string;
    locationType?: { name?: string };
    radius_meters?: number;
    address?: string;
  } | null;
  testID?: string;
}

export const AssignedLocationCard: React.FC<AssignedLocationCardProps> = ({
  location,
  testID = 'assigned-location-card',
}) => {
  const { t } = useTranslation();
  const metaParts = [location?.locationType?.name, location?.radius_meters ? `${location.radius_meters}m ${t('profile:assignedLocation.radiusSuffix')}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.wrapper} testID={testID}>
      <NBText variant="mono-sm" color="gray600" uppercase style={styles.title}>
        {t('profile:assignedLocation.title')}
      </NBText>
      <View style={styles.card}>
        {location ? (
          <View style={styles.row}>
            <View style={styles.iconChip}>
              <MaterialCommunityIcons name="map-marker-radius" size={16} color={nbColors.black} />
            </View>
            <View style={styles.body}>
              <NBText variant="body-sm" color="black" style={styles.locationName} numberOfLines={1}>
                {location.name ?? '—'}
              </NBText>
              {metaParts ? (
                <NBText variant="mono-sm" color="gray600" numberOfLines={1}>
                  {metaParts}
                </NBText>
              ) : null}
              {location.address ? (
                <NBText variant="mono-sm" color="gray500" numberOfLines={2} style={styles.address}>
                  {location.address}
                </NBText>
              ) : null}
            </View>
          </View>
        ) : (
          <NBText variant="body-sm" color="gray500" align="center" style={styles.noLocation}>
            {t('profile:assignedLocation.noLocation')}
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
  locationName: {
    fontWeight: '700',
  },
  address: {
    marginTop: 2,
  },
  noLocation: {
    fontStyle: 'italic',
  },
});
