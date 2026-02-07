/**
 * NBEmptyState - Neo Brutalism Empty State Component
 *
 * Displays empty state messages with bold Neo Brutalism styling.
 * Used when there's no data to display or an error occurred.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbTypography,
} from '../../constants/nbTokens';
import { NBButton } from './NBButton';

export type NBEmptyStateVariant =
  | 'noData'
  | 'noResults'
  | 'offline'
  | 'error'
  | 'maintenance'
  | 'permission'
  | 'empty'
  | 'complete'
  | 'search';

export interface NBEmptyStateProps {
  /** Visual variant that determines icon and messaging */
  variant?: NBEmptyStateVariant;
  /** Primary message title */
  title: string;
  /** Optional descriptive text */
  description?: string;
  /** Custom icon component */
  icon?: React.ReactNode;
  /** Optional call-to-action button label */
  ctaLabel?: string;
  /** CTA button press handler */
  onCTA?: () => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom title style */
  titleStyle?: TextStyle;
  /** Custom description style */
  descriptionStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

// Default icons for each variant (using emoji for simplicity)
const variantIcons: Record<NBEmptyStateVariant, string> = {
  noData: '📭',
  noResults: '🔍',
  offline: '📡',
  error: '⚠️',
  maintenance: '🔧',
  permission: '🔒',
  empty: '📂',
  complete: '✅',
  search: '🔎',
};

// Default descriptions for each variant
const variantDescriptions: Record<NBEmptyStateVariant, string> = {
  noData: 'Belum ada data tersedia',
  noResults: 'Tidak ada hasil yang sesuai',
  offline: 'Tidak ada koneksi internet',
  error: 'Terjadi kesalahan',
  maintenance: 'Sedang dalam pemeliharaan',
  permission: 'Izin akses diperlukan',
  empty: 'Folder kosong',
  complete: 'Semua tugas selesai',
  search: 'Mulai pencarian',
};

/**
 * Neo Brutalism styled empty state component
 *
 * @example
 * // No data state
 * <NBEmptyState
 *   variant="noData"
 *   title="Belum Ada Laporan"
 *   description="Laporan akan muncul setelah pekerja mengirim data"
 * />
 *
 * @example
 * // With CTA button
 * <NBEmptyState
 *   variant="error"
 *   title="Gagal Memuat Data"
 *   description="Terjadi kesalahan saat memuat data"
 *   ctaLabel="Coba Lagi"
 *   onCTA={handleRetry}
 * />
 *
 * @example
 * // Custom icon
 * <NBEmptyState
 *   title="Tidak Ada Tugas"
 *   description="Semua tugas sudah selesai!"
 *   icon={<CustomIcon />}
 * />
 */
export const NBEmptyState: React.FC<NBEmptyStateProps> = ({
  variant = 'noData',
  title,
  description,
  icon,
  ctaLabel,
  onCTA,
  style,
  titleStyle,
  descriptionStyle,
  testID,
}) => {
  // Use custom icon if provided, otherwise use variant default
  const displayIcon = icon !== undefined ? icon : variantIcons[variant];
  const displayDescription =
    description !== undefined ? description : variantDescriptions[variant];

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${displayDescription || ''}`}
    >
      <View style={styles.card}>
        {/* Icon */}
        <View
          style={styles.iconContainer}
          testID={`${testID}-icon-container`}
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
        >
          {typeof displayIcon === 'string' ? (
            <Text style={styles.iconText}>{displayIcon}</Text>
          ) : (
            displayIcon
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.title, titleStyle]}
          testID={`${testID}-title`}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {/* Description */}
        {displayDescription && (
          <Text
            style={[styles.description, descriptionStyle]}
            testID={`${testID}-description`}
          >
            {displayDescription}
          </Text>
        )}

        {/* CTA Button */}
        {ctaLabel && onCTA && (
          <NBButton
            title={ctaLabel}
            onPress={onCTA}
            variant="primary"
            style={styles.ctaButton}
            testID={`${testID}-cta`}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.xl,
  },
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base, // 2px - softened NB
    paddingHorizontal: nbSpacing.xl,
    paddingVertical: nbSpacing['2xl'],
    alignItems: 'center',
    maxWidth: 400,
    ...nbShadows.md,
  },
  iconContainer: {
    marginBottom: nbSpacing.lg,
    padding: nbSpacing.md,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base, // 2px - softened NB
    backgroundColor: nbColors.gray[50],
    ...nbShadows.sm,
  },
  iconText: {
    fontSize: 48,
    lineHeight: 56,
  },
  title: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  description: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    textAlign: 'center',
    lineHeight: nbTypography.fontSize.base * 1.5,
    marginBottom: nbSpacing.md,
  },
  ctaButton: {
    marginTop: nbSpacing.md,
    minWidth: 120,
  },
});

export default NBEmptyState;
