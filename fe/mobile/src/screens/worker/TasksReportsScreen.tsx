/**
 * Tasks & Reports Screen (Tabbed)
 * Worker's main screen for viewing tasks and reports
 * Replaces the old "Laporan Saya" screen with tabbed interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NBTab } from '../../components/nb';
import { colors, spacing, typography } from '../../constants/theme';
import type { WorkerTabScreenProps } from '../../types/navigation.types';

type TabType = 'tasks' | 'reports';

export function TasksReportsScreen({
  navigation,
}: WorkerTabScreenProps<'TasksReports'>): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // TODO: Implement refresh logic
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderTasksTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.placeholderText}>
          📋 Task list will be implemented here
        </Text>
        <Text style={styles.placeholderSubtext}>
          This will show assigned tasks from supervisors
        </Text>
      </View>
    );
  };

  const renderReportsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.placeholderText}>
          📊 Reports list will be implemented here
        </Text>
        <Text style={styles.placeholderSubtext}>
          This will show your submitted work reports
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tugas & Laporan</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <NBTab
          label="Tugas"
          active={activeTab === 'tasks'}
          onPress={() => setActiveTab('tasks')}
          style={styles.tab}
        />
        <NBTab
          label="Laporan"
          active={activeTab === 'reports'}
          onPress={() => setActiveTab('reports')}
          style={styles.tab}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'tasks' ? renderTasksTab() : renderReportsTab()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textHint,
    textAlign: 'center',
  },
});

export default TasksReportsScreen;
