/**
 * ActivityCard — a single activity row in the Aktivitas list, on the shared
 * ListItemCard so it reads identically to Tugas / Lembur.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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

function buildMeta(activity: Activity, t: ReturnType<typeof useTranslation>['t']): ListItemMeta[] {
  const meta: ListItemMeta[] = [];
  if (activity.location) { meta.push({ icon: 'map-marker', label: activity.location.name }); }
  if (activity.photo_urls && activity.photo_urls.length > 0) {
    meta.push({ icon: 'camera', label: t('activities:card.photoCount', { count: activity.photo_urls.length }) });
  }
  return meta;
}

function ActivityCardImpl({ activity, onPress, currentUserId }: ActivityCardProps): React.JSX.Element {
  const { t } = useTranslation();
  // ADR-038: when the activity is owned by someone else, the viewer is here via tag.
  const isTaggedIn = Boolean(
    currentUserId && activity.user_id && activity.user_id !== currentUserId,
  );
  const pill = activityPill(activity.status);

  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      extraTag={isTaggedIn ? <NBBadge text={t('activities:card.included')} color="navy" size="sm" /> : undefined}
      rightText={`${formatDate(activity.created_at)} · ${formatTime(activity.created_at)}`}
      title={activity.activityType?.name || t('activities:card.activity')}
      description={activity.description || undefined}
      meta={buildMeta(activity, t)}
      creatorText={activity.user ? `${activity.user.role} · ${activity.user.full_name}` : undefined}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={t('activities:card.accessibilityLabel', { name: activity.activityType?.name ?? '' })}
      testID="activity-card"
    />
  );
}

export const ActivityCard = React.memo(ActivityCardImpl);
ActivityCard.displayName = 'ActivityCard';

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});
