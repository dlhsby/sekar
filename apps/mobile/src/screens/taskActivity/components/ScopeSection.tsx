/**
 * Scope Section — Area Scope Selector (City, District, Region, Location, None)
 * Phase 3: Scope-aware task assignment
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

interface ScopeSectionProps {
  scope: string; // 'auto' | AssignmentScope
  onScopeChange: (scope: string) => void;
  regionId: string;
  onRegionChange: (regionId: string) => void;
  isLoadingRegions: boolean;
  regionOptions: NBSelectOption[];
  isDistrictFixed: boolean;
  isAreaFixed: boolean;
}

export const ScopeSection: React.FC<ScopeSectionProps> = ({
  scope,
  onScopeChange,
  regionId,
  onRegionChange,
  isLoadingRegions,
  regionOptions,
  isDistrictFixed,
  isAreaFixed,
}) => {
  const { t } = useTranslation();

  // Don't show scope section for fixed-scope roles
  if (isDistrictFixed && isAreaFixed) {
    return null;
  }

  const scopeOptions: NBSelectOption[] = [
    { label: t('tasks:scope.auto'), value: 'auto' },
    { label: t('tasks:scope.city'), value: 'city' },
    { label: t('tasks:scope.district'), value: 'district' },
    { label: t('tasks:scope.region'), value: 'region' },
    { label: t('tasks:scope.location'), value: 'location' },
    { label: t('tasks:scope.none'), value: 'none' },
  ];

  // Determine which id picker to show
  const showRegionPicker = scope === 'region';

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="map-outline" size={16} color={nbColors.black} />
          <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}>
            {' '}
            {t('tasks:scope.title')}
          </NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        {/* Scope selector */}
        <NBText variant="body-sm" style={styles.fieldLabel}>
          {t('tasks:scope.title')}
        </NBText>
        <NBSelect
          label={t('tasks:scope.title')}
          value={scope}
          onValueChange={onScopeChange}
          options={scopeOptions}
          placeholder={t('tasks:scope.title')}
        />

        {/* Region picker — only show when scope is 'region' */}
        {showRegionPicker && (
          <>
            <View style={styles.fieldSpacer} />
            <NBText variant="body-sm" style={styles.fieldLabel}>
              {t('tasks:locationSection.regionLabel')}
            </NBText>
            {isLoadingRegions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={nbColors.primary} />
                <NBText variant="body-sm" color="gray600" style={styles.loadingText}>
                  {t('tasks:locationSection.loadingRegion')}
                </NBText>
              </View>
            ) : (
              <NBSelect
                label={t('tasks:locationSection.regionLabel')}
                value={regionId}
                onValueChange={onRegionChange}
                options={regionOptions}
                placeholder={t('tasks:locationSection.regionPlaceholder')}
              />
            )}
          </>
        )}
      </NBCardContent>
    </NBCard>
  );
};
