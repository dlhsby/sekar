/**
 * ActivityCard — a single activity row in the Aktivitas list, on the shared
 * ListItemCard so it reads identically to Tugas / Lembur.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { NBBadge } from '../../../components/nb';
import { ListItemCard, type ListItemMeta } from '../../../components/common';
import { nbSpacing } from '../../../constants/nbTokens';
import { activityPill, formatDate, formatTime } from '../../../utils/statusHelpers';
import type { Activity } from '../../../types/models.types';

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
  /** Current user id — used to flag activities the viewer is tagged on (ADR-038). */
  currentUserId?: string;
}

function buildMeta(activity: Activity): ListItemMeta[] {
  const meta: ListItemMeta[] = [];
  if (activity.area) { meta.push({ icon: 'map-marker', label: activity.area.name }); }
  if (activity.photo_urls && activity.photo_urls.length > 0) {
    meta.push({ icon: 'camera', label: `${activity.photo_urls.length} foto` });
  }
  return meta;
}

export function ActivityCard({ activity, onPress, currentUserId }: ActivityCardProps): React.JSX.Element {
  // ADR-038: when the activity is owned by someone else, the viewer is here via tag.
  const isTaggedIn = Boolean(
    currentUserId && activity.user_id && activity.user_id !== currentUserId,
  );
  const pill = activityPill(activity.status);

  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      extraTag={isTaggedIn ? <NBBadge text="Diikutsertakan" color="navy" size="sm" /> : undefined}
      rightText={`${formatDate(activity.created_at)} · ${formatTime(activity.created_at)}`}
      title={activity.activityType?.name || 'Aktivitas'}
      description={activity.description || undefined}
      meta={buildMeta(activity)}
      creatorText={activity.user ? `${activity.user.role} · ${activity.user.full_name}` : undefined}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={`Detail aktivitas ${activity.activityType?.name ?? ''}`}
      testID="activity-card"
    />
  );
}

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});
