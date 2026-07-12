/**
 * Location Section — Rayon & Area Selection
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  userLocationId?: string;
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
  userLocationId,
  userAreaName,
}) => {
  const { t } = useTranslation();
  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            {t('tasks:locationSection.title')}
          </NBText>
        </View>
        <NBText variant="body-sm" style={styles.sectionSubtitle}>
          {isRayonFixed && isAreaFixed ? t('tasks:locationSection.autoFromProfile') : t('tasks:locationSection.selectAssignment')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body-sm" style={styles.fieldLabel}>
          {t('tasks:locationSection.rayonLabel')}
        </NBText>
        {isLoadingRayons ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              {t('tasks:locationSection.loadingRayon')}
            </NBText>
          </View>
        ) : (
          <NBSelect
            label={t('tasks:locationSection.rayonLabel')}
            value={rayonId}
            onValueChange={onRayonChange}
            options={
              isRayonFixed
                ? userRayonId
                  ? [{ label: userRayonName || t('tasks:locationSection.yourRayon'), value: userRayonId }]
                  : []
                : rayonOptions
            }
            placeholder={t('tasks:locationSection.rayonPlaceholder')}
            disabled={isRayonFixed}
          />
        )}

        <View style={styles.fieldSpacer} />

        <NBText variant="body-sm" style={styles.fieldLabel}>
          {t('tasks:locationSection.areaLabel')}
        </NBText>
        {isLoadingAreas ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              {t('tasks:locationSection.loadingArea')}
            </NBText>
          </View>
        ) : (
          <NBSelect
            label={t('tasks:locationSection.areaLabel')}
            value={areaId}
            onValueChange={onAreaChange}
            options={
              isAreaFixed
                ? userLocationId
                  ? [{ label: userAreaName || t('tasks:locationSection.yourArea'), value: userLocationId }]
                  : []
                : areaOptions
            }
            placeholder={!rayonId && !isAreaFixed ? t('location:selector.selectRayonFirst') : t('location:selector.selectArea')}
            disabled={isAreaFixed || (!isAreaFixed && !rayonId)}
          />
        )}
      </NBCardContent>
    </NBCard>
  );
};
