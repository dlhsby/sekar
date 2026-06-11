/**
 * OvertimeStartForm
 * State A: Renders the "Mulai Lembur" form with reason and GPS sections.
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {
  NBCardTextInput,
  NBCollapsibleCard,
  NBText,
  NBBadge,
} from '../../../components/nb';
import { GPSLocationSection } from '../../../components/common';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../../constants/nbTokens';
import type { Coordinates } from '../../../types/geo.types';

interface OvertimeStartFormProps {
  reason: string;
  onReasonChange: (text: string) => void;
  location: Coordinates | null;
  isCapturingLocation: boolean;
  onRefreshLocation: () => void;
  error?: string;
  isWithinBoundary?: boolean;
  areaName?: string;
}

const OvertimeStartForm: React.FC<OvertimeStartFormProps> = ({
  reason,
  onReasonChange,
  location,
  isCapturingLocation,
  onRefreshLocation,
  error,
  isWithinBoundary,
  areaName,
}) => (
  <>
    {error && (
      <View style={styles.errorSummary}>
        <NBText variant="body-sm" color="danger" style={styles.errorSummaryTitle}>
          Mohon lengkapi data berikut:
        </NBText>
        <NBText variant="body-sm" color="black" style={styles.errorSummaryItem}>
          - {error}
        </NBText>
      </View>
    )}

    <NBCardTextInput
      title="ALASAN LEMBUR (OPSIONAL)"
      value={reason}
      onChangeText={onReasonChange}
      placeholder="Contoh: Pekerjaan tambahan setelah jam kerja..."
      numberOfLines={4}
      style={styles.textInputCard}
    />

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
        error={error}
        isWithinBoundary={isWithinBoundary}
        areaName={areaName}
      />
    </NBCollapsibleCard>
  </>
);

const styles = StyleSheet.create({
  textInputCard: {
    marginBottom: nbSpacing.md,
  },
  selfieCard: {
    marginHorizontal: 0,
  },
  gpsCard: {
    backgroundColor: nbColors.statusIdleBg,
  },
  cardLabel: {
    letterSpacing: 0.6,
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
});

export default OvertimeStartForm;
