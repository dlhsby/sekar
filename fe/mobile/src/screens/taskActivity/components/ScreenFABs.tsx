/**
 * ScreenFABs — FAB buttons for tasks/activities screen
 * Handles create-task and submit-activity buttons with permission checks.
 */

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBButton } from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

export interface ScreenFABsProps {
  activeTab: 'tasks' | 'activities';
  canCreateTask: boolean;
  canSubmitActivity: boolean;
  currentShift: any;
  onCreateTask: () => void;
  onSubmitActivity: () => void;
}

export function ScreenFABs({
  activeTab,
  canCreateTask,
  canSubmitActivity,
  currentShift,
  onCreateTask,
  onSubmitActivity,
}: ScreenFABsProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const showActivityFAB = activeTab === 'activities' && canSubmitActivity;
  const showTaskFAB = activeTab === 'tasks' && canCreateTask;

  if (!showActivityFAB && !showTaskFAB) {
    return null;
  }

  const handleActivityPress = () => {
    if (!currentShift) {
      Alert.alert(
        t('tasks:messages.clockInRequired'),
        t('tasks:messages.clockInRequiredMessage'),
        [{ text: 'OK' }]
      );
      return;
    }
    onSubmitActivity();
  };

  return (
    <>
      {showActivityFAB && (
        <View style={[styles.fab, !currentShift && styles.fabDisabled]}>
          <NBButton
            title={t('activities:fab.submit')}
            onPress={handleActivityPress}
            variant="primary"
            size="lg"
            disabled={!currentShift}
          />
        </View>
      )}
      {showTaskFAB && (
        <View style={styles.fab}>
          <NBButton
            title={t('tasks:fab.create')}
            onPress={onCreateTask}
            variant="primary"
            size="lg"
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    right: nbSpacing.md,
    left: nbSpacing.md,
    zIndex: 10,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
