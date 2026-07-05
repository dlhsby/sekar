/**
 * OvertimeEndForm
 * State B: Renders the "Selesai Lembur" form with activity type, description, photos, and GPS.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  NBCardTextInput,
  NBCollapsibleCard,
  NBText,
  NBSelect,
  NBBadge,
} from '../../../components/nb';
import { PhotoUploader, GPSLocationSection } from '../../../components/common';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../../constants/nbTokens';
import type { Photo } from '../../../services/media';
import type { Coordinates } from '../../../types/geo.types';

interface ActivityTypeOption {
  label: string;
  value: string;
}

interface OvertimeEndFormProps {
  endActivityTypeId: string;
  onActivityTypeChange: (id: string) => void;
  endDescription: string;
  onDescriptionChange: (text: string) => void;
  endPhotos: Photo[];
  onAddPhoto: (photo: Photo) => void;
  onRemovePhoto: (photoId: string) => void;
  location: Coordinates | null;
  isCapturingLocation: boolean;
  onRefreshLocation: () => void;
  errors: {
    activityType?: string;
    description?: string;
    photos?: string;
    location?: string;
  };
  activityTypeOptions: ActivityTypeOption[];
  loadingActivityTypes: boolean;
  isWithinBoundary?: boolean;
  areaName?: string;
}

const OvertimeEndForm: React.FC<OvertimeEndFormProps> = ({
  endActivityTypeId,
  onActivityTypeChange,
  endDescription,
  onDescriptionChange,
  endPhotos,
  onAddPhoto,
  onRemovePhoto,
  location,
  isCapturingLocation,
  onRefreshLocation,
  errors,
  activityTypeOptions,
  loadingActivityTypes,
  isWithinBoundary,
  areaName,
}) => {
  const { t } = useTranslation();
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <>
      {hasErrors && (
        <View style={styles.errorSummary}>
          <NBText variant="body-sm" color="danger" style={styles.errorSummaryTitle}>
            {t('overtime:forms.errorSummaryTitle')}
          </NBText>
          {Object.values(errors).filter(Boolean).map((msg, i) => (
            <NBText key={i} variant="body-sm" color="black" style={styles.errorSummaryItem}>
              - {msg}
            </NBText>
          ))}
        </View>
      )}

      <View style={[styles.card, styles.durasiCard]} />

      <View style={styles.card}>
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.sm }}>
          {t('overtime:forms.activityTypeLabel')}{' '}
          <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
        </NBText>
        {loadingActivityTypes ? (
          <ActivityIndicator style={styles.activityIndicator} />
        ) : activityTypeOptions.length === 0 ? (
          <NBText variant="body-sm" color="warning" style={styles.warningText}>
            {t('overtime:forms.noActivityTypesWarning')}
          </NBText>
        ) : (
          <NBSelect
            value={endActivityTypeId || ''}
            onValueChange={(v) => onActivityTypeChange(String(v))}
            options={activityTypeOptions}
            placeholder={t('overtime:forms.activityTypePlaceholder')}
            searchable
            searchPlaceholder={t('overtime:forms.activityTypeSearchPlaceholder')}
          />
        )}
        {errors.activityType && (
          <NBText variant="body-sm" color="danger" style={styles.errorText}>
            {errors.activityType}
          </NBText>
        )}
      </View>

      <NBCardTextInput
        title={t('overtime:forms.descriptionTitle')}
        required
        value={endDescription}
        onChangeText={onDescriptionChange}
        placeholder={t('overtime:forms.descriptionPlaceholder')}
        numberOfLines={5}
        error={errors.description}
        style={styles.card}
      />

      <View style={styles.card}>
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.xs }}>
          {t('overtime:forms.photosTitle')}{' '}
          <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
        </NBText>
        <NBText variant="body-sm" color="gray600" style={{ marginBottom: nbSpacing.sm }}>
          {t('overtime:forms.photosSubtitleText')}
        </NBText>
        <PhotoUploader
          photos={endPhotos}
          onAdd={onAddPhoto}
          onRemove={onRemovePhoto}
          error={errors.photos}
        />
      </View>

      <NBCollapsibleCard
        style={[styles.selfieCard, styles.gpsCard]}
        defaultExpanded
        accessibilityLabel={t('overtime:forms.gpsLabel')}
        headerLeft={
          <View>
            <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
              {t('overtime:forms.gpsLabel')}{' '}
              <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
            </NBText>
          </View>
        }
        headerRight={location != null
          ? <NBBadge
              text={isWithinBoundary ? t('overtime:components.withinAreaBadge') : t('overtime:components.outsideAreaBadge')}
              color={isWithinBoundary ? 'success' : 'danger'}
              size="sm"
            />
          : undefined
        }
      >
        <GPSLocationSection
          latitude={location?.latitude ?? null}
          longitude={location?.longitude ?? null}
          accuracy={location?.accuracy ?? null}
          isCapturing={isCapturingLocation}
          onRefresh={onRefreshLocation}
          error={errors.location}
          isWithinBoundary={isWithinBoundary}
          areaName={areaName}
        />
      </NBCollapsibleCard>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  selfieCard: {
    marginHorizontal: 0,
  },
  gpsCard: {
    backgroundColor: nbColors.statusIdleBg,
  },
  durasiCard: {
    backgroundColor: withAlpha(nbColors.statusIdle, 0.08),
    alignItems: 'center',
  },
  errorSummary: {
    backgroundColor: withAlpha(nbColors.danger, 0.05),
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.danger,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  errorSummaryTitle: {
    marginBottom: nbSpacing.xs,
  },
  errorSummaryItem: {
    color: nbColors.danger,
    marginTop: 2,
  },
  activityIndicator: {
    marginVertical: nbSpacing.sm,
  },
  errorText: {
    marginTop: nbSpacing.xs,
  },
  warningText: {
    marginVertical: nbSpacing.xs,
  },
  cardLabel: {
    letterSpacing: 0.6,
  },
});

export default OvertimeEndForm;
