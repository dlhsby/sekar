/**
 * Location Section — Rayon & Area Selection
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
  NBSelect,
} from '../../../components/nb';
import { nbColors } from '../../../constants/nbTokens';
import type { NBSelectOption } from '../../../components/nb/NBSelect';
import { styles } from '../styles';

interface LocationSectionProps {
  rayonId: string;
  onRayonChange: (rayonId: string) => void;
  isRayonFixed: boolean;
  isLoadingRayons: boolean;
  rayonOptions: NBSelectOption[];
  userRayonId?: string;
  userRayonName?: string;

  areaId: string;
  onAreaChange: (areaId: string) => void;
  isAreaFixed: boolean;
  isLoadingAreas: boolean;
  areaOptions: NBSelectOption[];
  userAreaId?: string;
  userAreaName?: string;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  rayonId,
  onRayonChange,
  isRayonFixed,
  isLoadingRayons,
  rayonOptions,
  userRayonId,
  userRayonName,

  areaId,
  onAreaChange,
  isAreaFixed,
  isLoadingAreas,
  areaOptions,
  userAreaId,
  userAreaName,
}) => {
  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            LOKASI
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          {isRayonFixed && isAreaFixed ? 'Lokasi otomatis dari profil Anda' : 'Pilih lokasi penugasan'}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body-sm" style={styles.fieldLabel}>
          Rayon
        </NBText>
        {isLoadingRayons ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              Memuat rayon...
            </NBText>
          </View>
        ) : (
          <NBSelect
            label="Rayon"
            value={rayonId}
            onValueChange={onRayonChange}
            options={
              isRayonFixed
                ? userRayonId
                  ? [{ label: userRayonName || 'Rayon Anda', value: userRayonId }]
                  : []
                : rayonOptions
            }
            placeholder="Pilih rayon..."
            disabled={isRayonFixed}
          />
        )}

        <View style={styles.fieldSpacer} />

        <NBText variant="body-sm" style={styles.fieldLabel}>
          Area
        </NBText>
        {isLoadingAreas ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              Memuat area...
            </NBText>
          </View>
        ) : (
          <NBSelect
            label="Area"
            value={areaId}
            onValueChange={onAreaChange}
            options={
              isAreaFixed
                ? userAreaId
                  ? [{ label: userAreaName || 'Area Anda', value: userAreaId }]
                  : []
                : areaOptions
            }
            placeholder={!rayonId && !isAreaFixed ? 'Pilih rayon terlebih dahulu' : 'Pilih area...'}
            disabled={isAreaFixed || (!isAreaFixed && !rayonId)}
          />
        )}
      </NBCardContent>
    </NBCard>
  );
};
