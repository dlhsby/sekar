/**
 * EmptyState Component
 * Reusable empty state with icon, title, description, and optional CTA
 * Use when lists or screens have no content to display
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../constants/theme';
import { Button } from './Button';

type EmptyStateVariant =
  | 'reports'
  | 'shifts'
  | 'workers'
  | 'locations'
  | 'notifications'
  | 'search'
  | 'error'
  | 'offline'
  | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  style?: ViewStyle;
}

/**
 * Add alpha transparency to a color
 * Works with both hex (#RRGGBB) and rgba formats
 */
function addAlpha(color: string, alpha: string): string {
  // If already rgba, extract rgb part and add new alpha
  if (color.startsWith('rgba')) {
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
    }
  }

  // If hex color, convert to rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Fallback: append alpha (may not work for all formats)
  return `${color}${alpha}`;
}

/**
 * Get default content for each variant
 */
function getVariantDefaults(variant: EmptyStateVariant): {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
} {
  switch (variant) {
    case 'reports':
      return {
        icon: 'file-document-outline',
        iconColor: theme.colors.primary,
        title: 'Belum Ada Laporan',
        description: 'Belum ada laporan kerja yang dibuat. Mulai buat laporan untuk mencatat aktivitas kerja.',
      };
    case 'shifts':
      return {
        icon: 'clock-outline',
        iconColor: theme.colors.primary,
        title: 'Belum Ada Shift',
        description: 'Belum ada riwayat shift yang tersedia. Data shift akan muncul setelah Anda melakukan clock-in.',
      };
    case 'workers':
      return {
        icon: 'account-group-outline',
        iconColor: theme.colors.secondary,
        title: 'Belum Ada Pekerja',
        description: 'Tidak ada pekerja aktif saat ini. Pekerja akan muncul setelah mereka melakukan clock-in.',
      };
    case 'locations':
      return {
        icon: 'map-marker-off-outline',
        iconColor: theme.colors.warning,
        title: 'Tidak Ada Lokasi',
        description: 'Tidak ada data lokasi yang tersedia. Pastikan GPS aktif dan izin lokasi diberikan.',
      };
    case 'notifications':
      return {
        icon: 'bell-outline',
        iconColor: theme.colors.gray500,
        title: 'Tidak Ada Notifikasi',
        description: 'Anda sudah membaca semua notifikasi. Notifikasi baru akan muncul di sini.',
      };
    case 'search':
      return {
        icon: 'magnify',
        iconColor: theme.colors.gray500,
        title: 'Tidak Ditemukan',
        description: 'Tidak ada hasil yang cocok dengan pencarian Anda. Coba gunakan kata kunci lain.',
      };
    case 'error':
      return {
        icon: 'alert-circle-outline',
        iconColor: theme.colors.error,
        title: 'Terjadi Kesalahan',
        description: 'Gagal memuat data. Silakan coba lagi atau periksa koneksi internet Anda.',
      };
    case 'offline':
      return {
        icon: 'wifi-off',
        iconColor: theme.colors.warning,
        title: 'Tidak Ada Koneksi',
        description: 'Anda sedang offline. Data akan dimuat otomatis saat koneksi tersedia kembali.',
      };
    case 'generic':
    default:
      return {
        icon: 'folder-open-outline',
        iconColor: theme.colors.gray500,
        title: 'Tidak Ada Data',
        description: 'Belum ada data untuk ditampilkan.',
      };
  }
}

/**
 * EmptyState - Displays a placeholder when content is empty
 */
export function EmptyState({
  variant = 'generic',
  title,
  description,
  icon,
  iconColor,
  ctaLabel,
  onCtaPress,
  style,
}: EmptyStateProps): React.JSX.Element {
  const defaults = getVariantDefaults(variant);

  const displayIcon = icon || defaults.icon;
  const displayIconColor = iconColor || defaults.iconColor;
  const displayTitle = title || defaults.title;
  const displayDescription = description || defaults.description;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={`${displayTitle}. ${displayDescription}`}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: addAlpha(displayIconColor, '0.1') }]}>
        <MaterialCommunityIcons
          name={displayIcon}
          size={48}
          color={displayIconColor}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>{displayTitle}</Text>

      {/* Description */}
      <Text style={styles.description}>{displayDescription}</Text>

      {/* CTA Button */}
      {ctaLabel && onCtaPress && (
        <Button
          title={ctaLabel}
          onPress={onCtaPress}
          variant="outline"
          style={styles.ctaButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.normal,
    maxWidth: 280,
    marginBottom: theme.spacing.lg,
  },
  ctaButton: {
    minWidth: 150,
  },
});

export default EmptyState;
