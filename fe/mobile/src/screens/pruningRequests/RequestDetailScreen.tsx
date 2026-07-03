/**
 * Pruning Request Detail Screen
 * Phase 3 — read-only view of a submitted permohonan, redesigned in Round 6
 * to mirror ActivityDetailScreen's NBCardHeader / sectionTitle / infoRow
 * pattern so the staff_kecamatan flow visually matches aktivitas/tugas.
 *
 * Orchestration screen that composes extracted hooks + components.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Linking,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useAppDispatch } from '../../store/hooks';
import { fetchPruningRequestById } from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import { NBBackgroundPattern, NBAlert, NBModal } from '../../components/nb';
import { AssignToTaskSheet } from '../../components/admin/AssignToTaskSheet';
import { RescheduleSheet } from './components/RescheduleSheet';
import { LocationMapModal } from '../../components/modals/LocationMapModal';
import { nbSpacing, nbColors } from '../../constants/nbTokens';
import {
  getPruningRequestStatusColor,
  getPruningRequestStatusLabel,
} from '../../utils/statusHelpers';

import { usePruningRequestDetail } from './hooks/usePruningRequestDetail';
import { usePruningRequestActions } from './hooks/usePruningRequestActions';
import { StatusCard } from './components/StatusCard';
import { LocationCard } from './components/LocationCard';
import { DetailCard } from './components/DetailCard';
import { ContactSection } from './components/ContactSection';
import { NotesCard } from './components/NotesCard';
import { PhotosSection } from './components/PhotosSection';
import { ReviewResultsCard } from './components/ReviewResultsCard';
import { RelatedTaskCard } from './components/RelatedTaskCard';
import { ActionBar } from './components/ActionBar';

type DetailScreenProps = NativeStackScreenProps<any, 'PruningDetail'>;

export function RequestDetailScreen(props: DetailScreenProps): React.JSX.Element {
  const { t: tPruning } = useTranslation('pruning');
  const { t } = useTranslation('common');
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { requestId, adminMode = false } = (props.route.params ?? {}) as {
    requestId: string;
    adminMode?: boolean;
  };

  // Data + permissions
  const {
    request,
    isLoading,
    error,
    reviewingId,
    canAdmin,
    canCancel,
    isReschedulable,
    needsSchedule,
    canActApprove,
    canReject,
    canConvert,
    showAdminBar,
  } = usePruningRequestDetail(requestId, adminMode);

  // Add the pruning translation reference for compatibility with component usage
  React.useMemo(() => tPruning, [tPruning]);

  // Action handlers
  const scrollViewRef = useRef<ScrollView>(null);
  const { handleApprove, handleRejectPress, handleRejectSubmit, handleCancel } =
    usePruningRequestActions({
      requestId,
      request,
      scrollViewRef,
    });

  // Local UI state
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [convertSheetVisible, setConvertSheetVisible] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handlePhotoPress = useCallback((photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setPhotoModalVisible(true);
  }, []);

  const handleViewTask = useCallback(() => {
    if (request?.assignedTaskId) {
      navigation.navigate('TaskDetail', {
        taskId: request.assignedTaskId,
        from: 'PruningDetail',
        fromParams: { requestId: request.id, adminMode },
      });
    }
  }, [request?.assignedTaskId, request?.id, adminMode, navigation]);

  const handleRejectPressWrapper = useCallback(() => {
    setShowRejectInput(true);
    handleRejectPress();
  }, [handleRejectPress]);

  const handleRejectSubmitWrapper = useCallback(async () => {
    const success = await handleRejectSubmit(rejectReason);
    if (success) {
      setShowRejectInput(false);
      setRejectReason('');
    }
  }, [handleRejectSubmit, rejectReason]);

  const handleRejectCancelWrapper = useCallback(() => {
    setShowRejectInput(false);
    setRejectReason('');
  }, []);

  if (isLoading && !request) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorWrap}>
          <NBAlert
            variant="danger"
            title={t('detail.notFoundMessage')}
            message={t('errors.notFound') || 'Permohonan yang Anda cari tidak tersedia.'}
          />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getPruningRequestStatusColor(request.status);
  const statusLabel = getPruningRequestStatusLabel(request.status);

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <StatusCard request={request} statusLabel={statusLabel} statusColor={statusColor} />
          <LocationCard request={request} onMapPress={() => setLocationModalVisible(true)} />
          <DetailCard request={request} />
          <ContactSection request={request} />
          <NotesCard request={request} />
          <PhotosSection request={request} onPhotoPress={handlePhotoPress} />
          <ReviewResultsCard request={request} />
          <RelatedTaskCard request={request} onViewTask={handleViewTask} />

          {error ? (
            <View style={styles.errorBanner}>
              <NBAlert variant="danger" title={t('ui.errorOccurred')} message={error} />
            </View>
          ) : null}
        </ScrollView>

        <ActionBar
          request={request}
          canAdmin={canAdmin}
          canCancel={canCancel}
          showAdminBar={showAdminBar}
          isReschedulable={isReschedulable}
          needsSchedule={needsSchedule}
          canActApprove={canActApprove}
          canReject={canReject}
          canConvert={canConvert}
          showRejectInput={showRejectInput}
          rejectReason={rejectReason}
          reviewingId={reviewingId}
          requestId={requestId}
          onReschedule={() => setRescheduleVisible(true)}
          onApprove={handleApprove}
          onRejectPress={handleRejectPressWrapper}
          onRejectSubmit={handleRejectSubmitWrapper}
          onRejectCancel={handleRejectCancelWrapper}
          onRejectReasonChange={setRejectReason}
          onConvert={() => setConvertSheetVisible(true)}
          onCancel={handleCancel}
        />

        <NBModal
          visible={photoModalVisible}
          onClose={() => setPhotoModalVisible(false)}
          type="fullscreen"
          title="Foto Lokasi"
        >
          <View style={styles.photoViewerWrap}>
            {selectedPhoto ? (
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.photoLarge}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </NBModal>

        <AssignToTaskSheet
          visible={convertSheetVisible}
          onClose={() => setConvertSheetVisible(false)}
          request={request}
          onSuccess={() => {
            dispatch(fetchPruningRequestById(requestId));
          }}
        />

        <RescheduleSheet
          visible={rescheduleVisible}
          onClose={() => setRescheduleVisible(false)}
          request={request}
          onSuccess={() => {
            dispatch(fetchPruningRequestById(requestId));
          }}
        />

        <LocationMapModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
          title="Lokasi Perantingan"
          markerTitle="Lokasi Perantingan"
          hideAreaStatus
          hideUpdatedAt
          location={{
            latitude: request.gpsLat == null ? null : Number(request.gpsLat),
            longitude: request.gpsLng == null ? null : Number(request.gpsLng),
            accuracy: null,
            isWithinArea: false,
            updatedAt: request.createdAt ? new Date(request.createdAt) : null,
          }}
          footerActionLabel="Buka di Google Maps"
          onFooterAction={() => {
            if (request.gpsLat != null && request.gpsLng != null) {
              const url = `https://www.google.com/maps/search/?api=1&query=${request.gpsLat},${request.gpsLng}`;
              void Linking.openURL(url);
            }
          }}
        />
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.md,
  },
  photoViewerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.black,
    margin: -nbSpacing.lg,
  },
  photoLarge: {
    width: '100%',
    height: '100%',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: nbSpacing.md,
  },
  errorBanner: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
});
