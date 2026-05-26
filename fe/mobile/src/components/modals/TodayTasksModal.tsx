/**
 * TodayTasksModal — v2.1 bottom sheet listing today's active tasks.
 * Opened from the Home "Tugas" Ringkasan tile (mirrors TodayActivitiesModal).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { StatusPill } from '../home/StatusPill';
import { HomeListRow } from '../home/HomeListRow';
import { nbSpacing } from '../../constants/nbTokens';
import { formatTime } from '../../utils/dateUtils';
import { taskPill } from '../../utils/taskStatus';
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
  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={`Tugas Hari Ini (${tasks.length})`}
      type="sheet"
      size="lg"
      scrollable
      testID="today-tasks-modal"
    >
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" align="center">
            Tidak ada tugas aktif hari ini
          </NBText>
          <NBText variant="body-sm" color="gray500" align="center" style={styles.emptySub}>
            Tugas yang ditugaskan ke Anda akan muncul di sini.
          </NBText>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => {
            const p = taskPill(task.status);
            return (
              <HomeListRow
                key={task.id}
                pill={<StatusPill tone={p.tone} label={p.label} />}
                title={task.title}
                meta={task.deadline ? formatTime(task.deadline) : undefined}
                subMeta={task.area?.name}
                onPress={onTaskPress ? () => onTaskPress(task) : undefined}
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
