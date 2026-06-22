/**
 * Overtime Detail Screen
 * Phase 2C: Read-only view with inline approval/rejection — matches ActivityDetailScreen pattern
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { ImagePreviewModal } from '../../components/common';
import { useRoute, useFocusEffect, useNavigation, type RouteProp } from '@react-navigation/native';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import { OvertimeTrailModal } from '../../components/modals/OvertimeTrailModal';
import {
  NBBackgroundPattern,
  NBText,
  NBButton,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
} from '../../constants/nbTokens';
import { useAppSelector } from '../../store/hooks';
import { useOvertimeDetail } from './hooks/useOvertimeDetail';
import { useOvertimeActions } from './hooks/useOvertimeActions';
import { OvertimeGeneralInfoCard } from './components/OvertimeGeneralInfoCard';
import { OvertimeReasonCard } from './components/OvertimeReasonCard';
import { OvertimeStatusCard } from './components/OvertimeStatusCard';
import { OvertimeTimelineCard } from './components/OvertimeTimelineCard';
import { OvertimeActivityTypeCard } from './components/OvertimeActivityTypeCard';
import { OvertimeDescriptionCard } from './components/OvertimeDescriptionCard';
import { OvertimePhotosSection } from './components/OvertimePhotosSection';
import { OvertimeSelfiePhotosSection } from './components/OvertimeSelfiePhotosSection';
import { OvertimeGpsCard } from './components/OvertimeGpsCard';
import { OvertimeTrailCard } from './components/OvertimeTrailCard';
import { OvertimeClockOutBar } from './components/OvertimeClockOutBar';
import { OvertimeApprovalBar } from './components/OvertimeApprovalBar';

type RouteParams = { overtimeId: string };

export function OvertimeDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<MainTabParamList, 'OvertimeDetail'>>();
  const navigation = useNavigation<MainTabScreenProps<'OvertimeDetail'>['navigation']>();
  const { overtimeId } = route.params as RouteParams;

  const user = useAppSelector((state) => state.auth.user);
  const { overtime, isLoading, isRefreshing, fetchDetail, handleRefresh, scrollViewRef, setOvertime } = useOvertimeDetail(overtimeId);

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showTrailModal, setShowTrailModal] = useState(false);

  const actions = useOvertimeActions(overtime, user, scrollViewRef, setOvertime);

  const canViewTrail = useMemo(
    () => !!(overtime?.shift_id && user?.role && !['satgas', 'linmas'].includes(user.role)),
    [overtime, user],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchDetail(false);
    }, [fetchDetail]),
  );

  if (isLoading) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600">Memuat data...</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!overtime) {
    return (
      <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
        <View style={styles.loadingContainer}>
          <NBText variant="body" color="gray600">Lembur tidak ditemukan</NBText>
          <NBButton title="Kembali" variant="secondary" onPress={() => navigation.navigate('Absensi' as any, { initialTab: 'lembur' })} />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            (actions.canApprove || actions.canClockOut) && styles.contentContainerWithFooter,
            actions.showRejectInput && styles.contentContainerWithReject,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} tintColor={nbColors.primary} />}
        >
          <OvertimeGeneralInfoCard overtime={overtime} />
          <OvertimeReasonCard reason={overtime.reason} />
          <OvertimeStatusCard overtime={overtime} />
          <OvertimeTimelineCard overtime={overtime} />
          <OvertimeActivityTypeCard overtime={overtime} />
          <OvertimeDescriptionCard description={overtime.description} />
          <OvertimePhotosSection photoUrls={overtime.photo_urls} onPhotoPress={setPreviewUri} />
          <OvertimeSelfiePhotosSection shift={overtime.shift} onPhotoPress={setPreviewUri} />
          <OvertimeGpsCard gpsLat={overtime.gps_lat} gpsLng={overtime.gps_lng} />
          {canViewTrail && <OvertimeTrailCard onPress={() => setShowTrailModal(true)} />}

          {showTrailModal && overtime.shift_id && overtime.user_id && (
            <OvertimeTrailModal
              visible={showTrailModal}
              onClose={() => setShowTrailModal(false)}
              userId={overtime.user_id}
              shiftId={overtime.shift_id}
              startDatetime={overtime.start_datetime}
              userName={overtime.user?.full_name || 'Petugas'}
              areaName={overtime.area?.name}
            />
          )}
        </ScrollView>

        {actions.canClockOut && <OvertimeClockOutBar onPress={() => navigation.navigate('OvertimeSubmit' as any)} />}

        <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} title="Foto Lembur" />

        {actions.canApprove && (
          <OvertimeApprovalBar
            showRejectInput={actions.showRejectInput}
            rejectReason={actions.rejectReason}
            isSubmitting={actions.isSubmitting}
            onTolakPress={actions.handleTolakPress}
            onApprovePress={actions.handleApprove}
            onBatalPress={actions.handleRejectCancel}
            onRejectSubmitPress={actions.handleRejectSubmit}
            onRejectReasonChange={actions.setRejectReason}
          />
        )}
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: nbSpacing.md,
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  contentContainerWithFooter: {
    paddingBottom: nbSpacing.md,
  },
  contentContainerWithReject: {
    paddingBottom: nbSpacing['3xl'],
  },
});
