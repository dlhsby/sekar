/**
 * Asset Card Component
 * Displays asset info in list
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
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

export function AssetCard({ asset, onPress }: AssetCardProps): React.JSX.Element {
  const { t } = useTranslation('assets');
  const statusColor: NBBadgeColor = STATUS_COLORS[asset.status] || 'gray';
  const statusLabel = t(`status.${asset.status}`, asset.status);
  const conditionColor: NBBadgeColor = CONDITION_COLORS[asset.condition] || 'gray';
  const conditionLabel = t(`condition.${asset.condition}`, asset.condition);

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

          {asset.location && (
            <NBText variant="body-sm" style={styles.location}>
              {asset.location.name}
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
  location: {
    color: nbColors.gray600,
  },
  footer: {
    paddingTop: nbSpacing.sm,
  },
});
