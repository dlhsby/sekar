/**
 * TaskCard
 * Extracted from TasksActivityScreen — renders a single task item in the list.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NBCard, NBBadge } from '../../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../../constants/nbTokens';
import type { Task, TaskStatus } from '../../../types/models.types';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah', medium: 'Biasa', high: 'Tinggi', urgent: 'Mendesak',
};

function getTaskStatusBadgeVariant(
  status: TaskStatus
): 'gray' | 'success' | 'warning' | 'danger' | 'primary' {
  switch (status) {
    case 'verified':
    case 'accepted':
      return 'success';
    case 'completed':
    case 'in_progress':
      return 'primary';
    case 'assigned':
    case 'revision_needed':
      return 'warning';
    case 'declined':
      return 'danger';
    default:
      return 'gray';
  }
}

function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Menunggu',
    assigned: 'Ditugaskan',
    accepted: 'Diterima',
    declined: 'Ditolak',
    in_progress: 'Dikerjakan',
    completed: 'Menunggu Verifikasi',
    verified: 'Terverifikasi',
    revision_needed: 'Perlu Revisi',
  };
  return labels[status] || status;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function TaskCard({ task, onPress }: TaskCardProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress}>
      <NBCard variant="elevated" style={styles.cardInner}>
        {/* Header: primary text + created time | status badge */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemPrimary} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.itemTimestamp}>
              {formatDate(task.created_at)} · {formatTime(task.created_at)}
            </Text>
          </View>
          <View style={styles.itemHeaderRight}>
            <NBBadge
              text={getTaskStatusLabel(task.status)}
              color={getTaskStatusBadgeVariant(task.status)}
            />
          </View>
        </View>
        {/* Description */}
        {task.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}
        {/* Meta row */}
        <View style={styles.itemMeta}>
          {task.assigned_user && (
            <Text style={styles.itemMetaChip}>👤 {task.assigned_user.full_name}</Text>
          )}
          {task.area && (
            <Text style={styles.itemMetaChip}>📍 {task.area.name}</Text>
          )}
          {!task.area && task.rayon && (
            <Text style={styles.itemMetaChip}>🗺️ {task.rayon.name}</Text>
          )}
          {task.priority && (
            <Text style={styles.itemMetaChip}>🔥 {PRIORITY_LABEL[task.priority] ?? task.priority}</Text>
          )}
          {task.deadline && (
            <Text style={styles.itemMetaChip}>
              ⏰ {new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          )}
          {task.tags && task.tags.length > 0 && (
            <Text style={styles.itemMetaChip}>🏷️ {task.tags.length} tag</Text>
          )}
        </View>
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
});
