/**
 * SortModal
 * Bottom-sheet modal for sorting tasks or activities.
 * Extracted from TasksActivityScreen to keep the orchestrator file concise.
 */

import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../../../components/nb';
import { nbColors, nbBorders } from '../../../constants/nbTokens';

type TaskSortOption = 'created_at_desc' | 'created_at_asc' | 'deadline_asc' | 'priority_desc';
type ActivitySortOption = 'created_at_desc' | 'created_at_asc';
type MainTabType = 'tasks' | 'activities';

interface SortModalProps {
  visible: boolean;
  activeTab: MainTabType;
  taskSort: TaskSortOption;
  activitySort: ActivitySortOption;
  onClose: () => void;
  onSelectTaskSort: (sort: TaskSortOption) => void;
  onSelectActivitySort: (sort: ActivitySortOption) => void;
}

const TASK_SORT_OPTIONS: { value: TaskSortOption; label: string }[] = [
  { value: 'created_at_desc', label: 'Terbaru (default)' },
  { value: 'created_at_asc', label: 'Terlama' },
  { value: 'deadline_asc', label: 'Deadline Terdekat' },
  { value: 'priority_desc', label: 'Prioritas Tertinggi' },
];

const ACTIVITY_SORT_OPTIONS: { value: ActivitySortOption; label: string }[] = [
  { value: 'created_at_desc', label: 'Terbaru (default)' },
  { value: 'created_at_asc', label: 'Terlama' },
];

export function SortModal({
  visible,
  activeTab,
  taskSort,
  activitySort,
  onClose,
  onSelectTaskSort,
  onSelectActivitySort,
}: SortModalProps): React.JSX.Element {
  const isTasksTab = activeTab === 'tasks';
  const options = isTasksTab ? TASK_SORT_OPTIONS : ACTIVITY_SORT_OPTIONS;
  const activeSort = isTasksTab ? taskSort : activitySort;

  const handleSelect = (value: string) => {
    if (isTasksTab) {
      onSelectTaskSort(value as TaskSortOption);
    } else {
      onSelectActivitySort(value as ActivitySortOption);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sortModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.sortModalSheet}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sortModalHeader}>
            <NBText variant="mono-sm" uppercase style={styles.sortModalTitle}>
              {isTasksTab ? 'URUTKAN TUGAS' : 'URUTKAN AKTIVITAS'}
            </NBText>
            <TouchableOpacity
              style={styles.sortModalCloseButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal urutan"
            >
              <MaterialCommunityIcons name="close" size={20} color={nbColors.black} />
            </TouchableOpacity>
          </View>
          <View style={styles.sortModalDivider} />
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortOption, activeSort === opt.value && styles.sortOptionActive]}
              onPress={() => handleSelect(opt.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: activeSort === opt.value }}
            >
              <NBText variant="body" style={[styles.sortOptionText, activeSort === opt.value && styles.sortOptionTextActive]}>
                {opt.label}
              </NBText>
              {activeSort === opt.value && (
                <MaterialCommunityIcons name="check-bold" size={18} color={nbColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sortModalSheet: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthThick,
    borderLeftWidth: nbBorders.widthThick,
    borderRightWidth: nbBorders.widthThick,
    borderBottomWidth: 0,
    borderColor: nbColors.black,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: nbColors.gray100,
  },
  sortModalTitle: {
    flex: 1,
  },
  sortModalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sortModalDivider: {
    height: nbBorders.widthThick,
    backgroundColor: nbColors.black,
  },
  sortOption: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray200,
  },
  sortOptionActive: {
    borderLeftWidth: 4,
    borderLeftColor: nbColors.primary,
    paddingLeft: 12,
  },
  sortOptionText: {
    color: nbColors.black,
  },
  sortOptionTextActive: {
    fontWeight: '700' as const,
    color: nbColors.black,
  },
});
