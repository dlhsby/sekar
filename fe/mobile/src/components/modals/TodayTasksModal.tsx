/**
 * TodayTasksModal — v2.1 bottom sheet listing today's active tasks.
 * Opened from the Home "Tugas" Ringkasan tile (mirrors TodayActivitiesModal).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { ListItemCard, type ListItemMeta } from '../common';
import { nbSpacing } from '../../constants/nbTokens';
import { taskPill } from '../../utils/taskStatus';
import { formatDate, formatTime } from '../../utils/statusHelpers';
import type { Task } from '../../types/models.types';

interface TodayTasksModalProps {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  onTaskPress?: (task: Task) => void;
}

export function TodayTasksModal({
  visible,
  onClose,
  tasks,
  onTaskPress,
}: TodayTasksModalProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={t('tasks:modal.todayTasks', { count: tasks.length })}
      type="sheet"
      testID="today-tasks-modal"
    >
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" align="center">
            {t('common:ui.noActiveTasksToday')}
          </NBText>
          <NBText variant="body-sm" color="gray500" align="center" style={styles.emptySub}>
            {t('tasks:modal.todayTasksEmptyMessage')}
          </NBText>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => {
            const p = taskPill(task.status);
            const meta: ListItemMeta[] = [];
            if (task.area?.name) { meta.push({ icon: 'map-marker', label: task.area.name }); }
            if (task.deadline) { meta.push({ icon: 'clock-outline', label: formatDate(task.deadline) }); }
            return (
              <ListItemCard
                key={task.id}
                statusTone={p.tone}
                statusLabel={p.label}
                rightText={`${formatDate(task.created_at)} · ${formatTime(task.created_at)}`}
                title={task.title}
                description={task.description || undefined}
                meta={meta}
                onPress={() => onTaskPress?.(task)}
                accessibilityLabel={t('tasks:todayModal.taskDetailAria', { title: task.title })}
                testID={`today-task-${task.id}`}
              />
            );
          })}
        </View>
      )}
    </NBModal>
  );
}

const styles = StyleSheet.create({
  list: { gap: nbSpacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: nbSpacing.xl },
  emptySub: { marginTop: nbSpacing.xs },
});

export default TodayTasksModal;
