/**
 * Asset Card Component
 * Displays asset info in list
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBText, NBBadge } from '../../../components/nb';
import type { NBBadgeColor } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import type { Asset } from '../../../types/assets.types';

interface AssetCardProps {
  asset: Asset;
  onPress: () => void;
}

const CONDITION_COLORS: Record<string, NBBadgeColor> = {
  good: 'success',
  fair: 'warning',
  poor: 'danger',
  damaged: 'danger',
  unusable: 'danger',
};

const STATUS_COLORS: Record<string, NBBadgeColor> = {
  available: 'success',
  in_use: 'navy',
  maintenance: 'warning',
  retired: 'gray',
  lost: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Tersedia',
  in_use: 'Digunakan',
  maintenance: 'Perawatan',
  retired: 'Pensiun',
  lost: 'Hilang',
};

const CONDITION_LABELS: Record<string, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Buruk',
  damaged: 'Rusak',
  unusable: 'Tidak Layak',
};

export function AssetCard({ asset, onPress }: AssetCardProps): React.JSX.Element {
  const statusColor: NBBadgeColor = STATUS_COLORS[asset.status] || 'gray';
  const statusLabel = STATUS_LABELS[asset.status] || asset.status;
  const conditionColor: NBBadgeColor = CONDITION_COLORS[asset.condition] || 'gray';
  const conditionLabel = CONDITION_LABELS[asset.condition] || asset.condition;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <NBCard variant="default">
        <View style={styles.container}>
          <View style={styles.header}>
            <NBText variant="body-lg" style={styles.name} numberOfLines={1}>
              {asset.name}
            </NBText>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={nbColors.black}
            />
          </View>

          <View style={styles.codeRow}>
            <NBText variant="caption" style={styles.code}>
              {asset.asset_code}
            </NBText>
            <NBBadge
              text={statusLabel}
              color={statusColor}
              size="sm"
            />
          </View>

          {asset.area && (
            <NBText variant="body-sm" style={styles.area}>
              {asset.area.name}
            </NBText>
          )}

          <View style={styles.footer}>
            <NBBadge
              text={conditionLabel}
              color={conditionColor}
              size="sm"
            />
          </View>
        </View>
      </NBCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: nbSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    color: nbColors.gray600,
  },
  area: {
    color: nbColors.gray600,
  },
  footer: {
    paddingTop: nbSpacing.sm,
  },
});
