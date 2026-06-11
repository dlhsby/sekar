/**
 * OvertimeEndForm
 * State B: Renders the "Selesai Lembur" form with activity type, description, photos, and GPS.
 */

import React from 'react';
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
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <>
      {hasErrors && (
        <View style={styles.errorSummary}>
          <NBText variant="body-sm" color="danger" style={styles.errorSummaryTitle}>
            Mohon lengkapi data berikut:
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
          JENIS AKTIVITAS{' '}
          <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
        </NBText>
        {loadingActivityTypes ? (
          <ActivityIndicator style={styles.activityIndicator} />
        ) : activityTypeOptions.length === 0 ? (
          <NBText variant="body-sm" color="warning" style={styles.warningText}>
            Tidak ada jenis aktivitas tersedia. Hubungi administrator.
          </NBText>
        ) : (
          <NBSelect
            value={endActivityTypeId || ''}
            onValueChange={(v) => onActivityTypeChange(String(v))}
            options={activityTypeOptions}
            placeholder="Pilih jenis aktivitas..."
            searchable
            searchPlaceholder="Cari jenis aktivitas..."
          />
        )}
        {errors.activityType && (
          <NBText variant="body-sm" color="danger" style={styles.errorText}>
            {errors.activityType}
          </NBText>
        )}
      </View>

      <NBCardTextInput
        title="DESKRIPSI PEKERJAAN"
        required
        value={endDescription}
        onChangeText={onDescriptionChange}
        placeholder="Jelaskan aktivitas lembur yang dilakukan..."
        numberOfLines={5}
        error={errors.description}
        style={styles.card}
      />

      <View style={styles.card}>
        <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.xs }}>
          FOTO BUKTI{' '}
          <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
        </NBText>
        <NBText variant="body-sm" color="gray600" style={{ marginBottom: nbSpacing.sm }}>
          Tambahkan 1-3 foto pekerjaan lembur
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
        accessibilityLabel="Lokasi GPS"
        headerLeft={
          <View>
            <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
              {'LOKASI GPS '}
              <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
            </NBText>
          </View>
        }
        headerRight={location != null
          ? <NBBadge
              text={isWithinBoundary ? 'DI AREA' : 'LUAR AREA'}
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
