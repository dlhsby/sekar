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
  districtId: string;
  onDistrictChange: (districtId: string) => void;
  isDistrictFixed: boolean;
  isLoadingDistricts: boolean;
  districtOptions: NBSelectOption[];
  userDistrictId?: string;
  userDistrictName?: string;

  areaId: string;
  onAreaChange: (areaId: string) => void;
  isAreaFixed: boolean;
  isLoadingAreas: boolean;
  areaOptions: NBSelectOption[];
  userAreaId?: string;
  userAreaName?: string;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  districtId,
  onDistrictChange,
  isDistrictFixed,
  isLoadingDistricts,
  districtOptions,
  userDistrictId,
  userDistrictName,

  areaId,
  onAreaChange,
  isAreaFixed,
  isLoadingAreas,
  areaOptions,
  userAreaId,
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
          {isDistrictFixed && isAreaFixed ? t('tasks:locationSection.autoFromProfile') : t('tasks:locationSection.selectAssignment')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <NBText variant="body-sm" style={styles.fieldLabel}>
          {t('tasks:locationSection.districtLabel')}
        </NBText>
        {isLoadingDistricts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={nbColors.primary} />
            <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
              {t('tasks:locationSection.loadingDistrict')}
            </NBText>
          </View>
        ) : (
          <NBSelect
            label={t('tasks:locationSection.districtLabel')}
            value={districtId}
            onValueChange={onDistrictChange}
            options={
              isDistrictFixed
                ? userDistrictId
                  ? [{ label: userDistrictName || t('tasks:locationSection.yourDistrict'), value: userDistrictId }]
                  : []
                : districtOptions
            }
            placeholder={t('tasks:locationSection.districtPlaceholder')}
            disabled={isDistrictFixed}
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
                ? userAreaId
                  ? [{ label: userAreaName || t('tasks:locationSection.yourArea'), value: userAreaId }]
                  : []
                : areaOptions
            }
            placeholder={!districtId && !isAreaFixed ? t('location:selector.selectDistrictFirst') : t('location:selector.selectArea')}
            disabled={isAreaFixed || (!isAreaFixed && !districtId)}
          />
        )}
      </NBCardContent>
    </NBCard>
  );
};
