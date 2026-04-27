/**
 * PerantinganRequestCard
 * List-item card for `pruning_requests`. Visual structure mirrors
 * `OvertimeCard` / `TaskCard` / `ActivityCard` so all four list screens share
 * the same look-and-feel: NBCard variant="elevated" with header (primary
 * label + timestamp | status badge), optional description, meta chip row,
 * and creator footer.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NBCard, NBBadge } from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
} from '../../../constants/nbTokens';
import {
  getPruningRequestStatusColor,
  getPruningRequestStatusLabel,
  formatDateIndonesian,
} from '../../../utils/statusHelpers';
import type { PruningRequest } from '../../../types/models.types';

interface PerantinganRequestCardProps {
  request: PruningRequest;
  onPress: () => void;
}

export function PerantinganRequestCard({
  request,
  onPress,
}: PerantinganRequestCardProps): React.JSX.Element {
  const createdDate = formatDateIndonesian(request.createdAt);
  const createdTime = new Date(request.createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

  const treeCount = request.treeCount ?? request.estimatedPlantCount ?? null;
  const photoCount = request.photoUrls?.length ?? 0;

  return (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Detail permohonan ${request.referenceCode}`}
    >
      <NBCard variant="elevated" style={styles.cardInner}>
        {/* Header: reference code + created time | status badge */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemPrimary} numberOfLines={1}>
              {request.referenceCode}
            </Text>
            <Text style={styles.itemTimestamp}>
              {createdDate} · {createdTime}
            </Text>
          </View>
          <View style={styles.itemHeaderRight}>
            <NBBadge
              text={getPruningRequestStatusLabel(request.status)}
              color={getPruningRequestStatusColor(request.status)}
            />
          </View>
        </View>

        {/* Address as the descriptive line */}
        {request.address ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {request.address}
          </Text>
        ) : null}

        {/* Meta row: kecamatan, tree count, photo count */}
        <View style={styles.itemMeta}>
          {request.kecamatanName ? (
            <Text style={styles.itemMetaChip}>🏘️ {request.kecamatanName}</Text>
          ) : null}
          {treeCount != null ? (
            <Text style={styles.itemMetaChip}>🌳 {treeCount} pohon</Text>
          ) : null}
          {photoCount > 0 ? (
            <Text style={styles.itemMetaChip}>📸 {photoCount} foto</Text>
          ) : null}
        </View>

        {/* Creator row — admin views show submitter; staff_kecamatan sees their own */}
        {request.submitter ? (
          <Text style={styles.itemCreator}>
            👤 {request.submitter.role} - {request.submitter.full_name}
          </Text>
        ) : null}
      </NBCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    marginBottom: nbSpacing.sm,
  },
  cardInner: {
    padding: nbSpacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
  },
  itemPrimary: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: 2,
  },
  itemTimestamp: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  itemDescription: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
    lineHeight: 18,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.xs,
    marginTop: 2,
  },
  itemMetaChip: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  itemCreator: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
    marginTop: nbSpacing.xs,
  },
});
