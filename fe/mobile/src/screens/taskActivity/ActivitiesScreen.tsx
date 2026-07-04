/**
 * Activities Screen — standalone activities list (split from the former Tugas/Aktivitas tabs).
 * Reuses the shared ActivitiesTab body + filter/sort chrome; no NBTab switcher.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { NBBackgroundPattern } from '../../components/nb';
import { ActivityFilterModal } from '../../components/modals';
import { SortModal } from '../../components/modals/SortModal';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { ACTIVITY_SUBMITTERS } from '../../constants/roles';
import type { MainTabParamList } from '../../types/navigation.types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { FilterBar } from '../../components/common';
import { ScreenFABs } from './components/ScreenFABs';
import { useActivitiesActivityFilters, useActivitiesFetching, type ActivitySortOption } from './hooks';
import { buildActivityFilterChips } from './utils/filterChips';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Activities'>;
};

export function ActivitiesScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  const ACTIVITY_SORT_OPTIONS = [
    { key: 'created_at_desc', label: t('activities:sort.newest') },
    { key: 'created_at_asc', label: t('activities:sort.oldest') },
  ];

  const initialAreaId = user?.area_id ?? currentShift?.area_id ?? null;

  const [activitySort, setActivitySort] = useState<ActivitySortOption>('created_at_desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isActivityFilterOpen, setIsActivityFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activityFilters = useActivitiesActivityFilters({ initialAreaId });
  const activitiesFetching = useActivitiesFetching({
    activityFilters: activityFilters.activityFilters,
    activitySort,
    user,
  });

  const canSubmitActivity = user?.role ? ACTIVITY_SUBMITTERS.includes(user.role) : false;

  useFocusEffect(
    useCallback(() => {
      activitiesFetching.fetchActivities(1, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchActivities is a stable callback
    }, []),
  );

  const isFirstActivityRender = useRef(true);
  useEffect(() => {
    if (isFirstActivityRender.current) {
      isFirstActivityRender.current = false;
      return;
    }
    activitiesFetching.fetchActivities(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchActivities is a stable callback
  }, [activityFilters.activityFilters, activitySort]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await activitiesFetching.fetchActivities(1, true);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchActivities is a stable callback
  }, []);

  const activityChips = buildActivityFilterChips(activityFilters.activityFilters, initialAreaId);

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <View style={[styles.contentWrapper, { paddingBottom: canSubmitActivity ? 80 : nbSpacing.sm }]}>
          {/* Title lives in the navigator header (top bar) — not repeated here. */}
          <FilterBar
            label={t('activities:filter.label')}
            filterCount={activityFilters.activeActivityFilterCount}
            chips={activityChips}
            isSortActive={activitySort !== 'created_at_desc'}
            onSortPress={() => setIsSortModalOpen(true)}
            onFilterPress={() => setIsActivityFilterOpen(true)}
            onReset={activityFilters.handleResetActivityFilters}
          />

          <View style={styles.content}>
            <ActivitiesTab
              activities={activitiesFetching.allActivities}
              loadingActivities={activitiesFetching.loadingActivities}
              isLoadingMore={activitiesFetching.isLoadingMoreActivities}
              hasMore={activitiesFetching.hasMoreActivities}
              activitiesError={activitiesFetching.activitiesError}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onRetry={() => activitiesFetching.fetchActivities(1, true)}
              onLoadMore={activitiesFetching.loadMoreActivities}
              onNavigateToActivity={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
              currentUserId={user?.id}
            />
          </View>
        </View>

        <ScreenFABs
          activeTab="activities"
          canCreateTask={false}
          canSubmitActivity={canSubmitActivity}
          currentShift={currentShift}
          onCreateTask={() => {}}
          onSubmitActivity={() => navigation.navigate('ActivitySubmission')}
        />

        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title={t('activities:header.sort')}
          options={ACTIVITY_SORT_OPTIONS}
          selectedOption={activitySort}
          onSelect={(key) => {
            setActivitySort(key as ActivitySortOption);
            activitiesFetching.fetchActivities(1, true);
          }}
        />

        <ActivityFilterModal
          visible={isActivityFilterOpen}
          onClose={() => setIsActivityFilterOpen(false)}
          filters={activityFilters.activityFilters}
          onApplyFilters={activityFilters.handleApplyActivityFilters}
          onResetFilters={activityFilters.handleResetActivityFilters}
          userRole={user?.role}
          userRayonId={user?.rayon_id}
          userAreaId={user?.area_id ?? currentShift?.area_id ?? undefined}
          userId={user?.id}
        />
      </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentWrapper: { flex: 1, paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.md },
  header: { marginBottom: nbSpacing.sm },
  content: { flex: 1 },
});

export default ActivitiesScreen;
