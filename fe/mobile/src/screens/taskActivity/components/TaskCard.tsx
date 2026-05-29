/**
 * TaskCard — single task row in the Tugas list (hi-fi TUG-1).
 * Built on the canonical HomeListRow + StatusPill, mirroring TodayTasksModal:
 * dotted status pill + right-aligned mono meta (elapsed/deadline/created) + title
 * + one meta line (area · assignee).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeListRow } from '../../../components/home/HomeListRow';
import { StatusPill } from '../../../components/home/StatusPill';
import { nbSpacing } from '../../../constants/nbTokens';
import { taskPill } from '../../../utils/taskStatus';
import { formatDate, formatTime, formatElapsed } from '../../../utils/statusHelpers';
import type { Task } from '../../../types/models.types';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

function rightMeta(task: Task): string | undefined {
  if (task.status === 'in_progress' && task.started_at) {
    const elapsed = formatElapsed(task.started_at);
    if (elapsed) { return `⏱ ${elapsed}`; }
  }
  if (task.deadline) { return `${formatDate(task.deadline)} · ${formatTime(task.deadline)}`; }
  return formatDate(task.created_at);
}

export function TaskCard({ task, onPress }: TaskCardProps): React.JSX.Element {
  const pill = taskPill(task.status);
  const location = task.area?.name ?? task.rayon?.name;
  const subMeta = [location, task.assignee?.full_name].filter(Boolean).join(' · ') || undefined;

  return (
    <View style={styles.wrapper}>
      <HomeListRow
        pill={<StatusPill dot tone={pill.tone} label={pill.label} />}
        title={task.title}
        meta={rightMeta(task)}
        subMeta={subMeta}
        onPress={onPress}
        testID="task-card"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: nbSpacing.sm,
  },
});
