/**
 * PerantinganRequestCard — a single pruning-request row on the shared
 * ListItemCard so Perantingan reads identically to Tugas / Aktivitas / Lembur
 * (status pill · created date · title · description · meta · creator).
 *
 * `extraTag` is forwarded straight through so the admin Review Queue can hang an
 * SLA-urgency pill after the status pill; the staff_kecamatan list omits it.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { ListItemCard, type ListItemMeta } from '../../../components/common';
import { nbSpacing } from '../../../constants/nbTokens';
import { pruningPill, formatDate, formatTime } from '../../../utils/statusHelpers';
import type { PruningRequest } from '../../../types/models.types';

interface PerantinganRequestCardProps {
  request: PruningRequest;
  onPress: () => void;
  /** Optional chip after the status pill (Review Queue passes an SLA pill). */
  extraTag?: React.ReactNode;
}

// Tree-detail summary line, e.g. "12 pohon · ±5 m · ⌀30 cm" (null parts skipped).
function buildDescription(request: PruningRequest): string | undefined {
  const treeCount = request.treeCount ?? request.estimatedPlantCount ?? null;
  const parts: string[] = [];
  if (treeCount != null) { parts.push(`${treeCount} pohon`); }
  if (request.treeHeightEstimate) { parts.push(`±${request.treeHeightEstimate}`); }
  if (request.treeDiameterEstimate) { parts.push(`⌀${request.treeDiameterEstimate}`); }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

// Meta chips carry the scannable context: reference code (how the citizen cites
// the request to support), kecamatan (where), and attachment count. The tree
// count lives in the description line, not here, to avoid duplicating it.
function buildMeta(request: PruningRequest): ListItemMeta[] {
  const meta: ListItemMeta[] = [];
  if (request.referenceCode) { meta.push({ icon: 'bookmark-outline', label: request.referenceCode }); }
  if (request.kecamatanName) { meta.push({ icon: 'map-marker', label: request.kecamatanName }); }
  const photoCount = request.photoUrls?.length ?? 0;
  if (photoCount > 0) { meta.push({ icon: 'camera', label: `${photoCount} foto` }); }
  return meta;
}

export function PerantinganRequestCard({
  request,
  onPress,
  extraTag,
}: PerantinganRequestCardProps): React.JSX.Element {
  const pill = pruningPill(request.status);
  // Address is the most scannable title; fall back to kecamatan, then ref code.
  const title = request.address || request.kecamatanName || request.referenceCode;
  const creatorText = request.submitter?.full_name ?? request.requesterName ?? undefined;

  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      extraTag={extraTag}
      rightText={`${formatDate(request.createdAt)} · ${formatTime(request.createdAt)}`}
      title={title}
      description={buildDescription(request)}
      meta={buildMeta(request)}
      creatorText={creatorText}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={`Detail permohonan ${request.referenceCode}`}
      testID="pruning-request-card"
    />
  );
}

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});
