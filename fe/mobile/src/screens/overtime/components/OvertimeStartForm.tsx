/**
 * OvertimeStartForm
 * State A: Renders the "Mulai Lembur" form with reason and GPS sections.
 */

import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
}) => {
  const { t } = useTranslation();
  return (
    <>
      {error && (
        <View style={styles.errorSummary}>
          <NBText variant="body-sm" color="danger" style={styles.errorSummaryTitle}>
            {t('overtime:forms.errorSummaryTitle')}
          </NBText>
          <NBText variant="body-sm" color="black" style={styles.errorSummaryItem}>
            - {error}
          </NBText>
        </View>
      )}

      <NBCardTextInput
        title={t('overtime:forms.reasonTitle')}
        value={reason}
        onChangeText={onReasonChange}
        placeholder={t('overtime:forms.reasonPlaceholder')}
        numberOfLines={4}
        style={styles.textInputCard}
      />

      <NBCollapsibleCard
        style={[styles.selfieCard, styles.gpsCard]}
        defaultExpanded
        accessibilityLabel={t('overtime:forms.gpsLabel')}
        headerLeft={
          <View>
            <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
              {`${t('overtime:forms.gpsLabel')} `}
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
        error={error}
        isWithinBoundary={isWithinBoundary}
        areaName={areaName}
      />
    </NBCollapsibleCard>
    </>
  );
};

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
