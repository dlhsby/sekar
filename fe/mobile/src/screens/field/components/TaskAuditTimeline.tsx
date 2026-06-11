/**
 * TaskAuditTimeline Component
 * Renders audit trail events in a timeline view
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbRadius } from '../../../constants/nbTokens';
import { formatDateTime } from '../../../utils/dateUtils';
import { buildAuditEvents } from '../hooks/taskHelpers';
import type { Task } from '../../../types/models.types';

interface TaskAuditTimelineProps {
  task: Task | null;
}

export function TaskAuditTimeline({ task }: TaskAuditTimelineProps): React.JSX.Element {
  const events = buildAuditEvents(task);

  return (
    <FlatList
      scrollEnabled={false}
      data={events}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.timelineContainer}
      renderItem={({ item, index }) => (
        <View style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
            {index < events.length - 1 && (
              <View style={styles.timelineLine} />
            )}
          </View>
          <View style={styles.timelineContent}>
            <View style={styles.timelineEventRow}>
              <Icon name={item.icon} size={14} color={item.color} />
              <NBText variant="body-sm" style={[styles.timelineEvent, { color: item.color }]}>{item.event}</NBText>
            </View>
            <NBText variant="caption" style={styles.timelineTime}>{formatDateTime(item.timestamp)}</NBText>
            {item.actor ? (
              <NBText variant="caption" style={styles.timelineActor}>{item.actor}</NBText>
            ) : null}
            {item.note ? (
              <NBText variant="caption" style={styles.timelineNote}>{item.note}</NBText>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  timelineContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: nbColors.white,
    marginTop: 2,
    zIndex: 1,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: nbColors.gray200,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: nbSpacing.sm,
    paddingBottom: nbSpacing.md,
  },
  timelineEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  timelineEvent: {},
  timelineTime: {
    marginTop: 2,
  },
  timelineActor: {
    marginTop: 2,
  },
  timelineNote: {
    fontStyle: 'italic',
    marginTop: 4,
    backgroundColor: nbColors.gray100,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: nbColors.gray300,
  },
});
