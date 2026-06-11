/**
 * Submit Pruning Request Screen — staff_kecamatan redesigned form.
 * Phase 3 Apr 27 redesign: scrollable card-based form orchestrating
 * extracted hooks and components.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearError } from '../../store/slices/pruningRequestsSlice';
import { NBBackgroundPattern } from '../../components/nb';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';

import { usePruningSubmitForm } from './hooks/usePruningSubmitForm';
import { usePruningDraftPersistence, type DraftShape } from './hooks/usePruningDraftPersistence';
import { usePruningGpsCapture } from './hooks/usePruningGpsCapture';
import { usePruningPhotoManagement } from './hooks/usePruningPhotoManagement';
import { usePruningSubmitMutation } from './hooks/usePruningSubmitMutation';
import { usePruningRayons } from './hooks/usePruningRayons';
import { usePruningCapacityCalendar } from './hooks/usePruningCapacityCalendar';
import { usePruningNavigationHandlers } from './hooks/usePruningNavigationHandlers';

import { SubmitLocationCard } from './components/SubmitLocationCard';
import { SubmitPhotoCard } from './components/SubmitPhotoCard';
import { SubmitTreeDetailsCard } from './components/SubmitTreeDetailsCard';
import { SubmitWeekCard } from './components/SubmitWeekCard';
import { SubmitContactCard } from './components/SubmitContactCard';
import { SubmitNotesCard } from './components/SubmitNotesCard';
import { SubmitActionBar } from './components/SubmitActionBar';

import {
  nbColors,
  nbSpacing,
} from '../../constants/nbTokens';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SubmitScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const rayonIdInitial = user?.rayon_id ?? '';
  const kecamatanNameInitial = user?.kecamatan_name ?? '';

  // Compose hooks
  const { formState, formSetters, validate, resetForm } = usePruningSubmitForm(
    rayonIdInitial,
    kecamatanNameInitial,
  );

  const { gpsLat, setGpsLat, gpsLng, setGpsLng, gpsAccuracy, setGpsAccuracy, gpsError, setGpsError, gpsLoading, captureLocation } =
    usePruningGpsCapture();

  const { photos, handlePickFromCamera, handlePickFromGallery, handleRemovePhoto } =
    usePruningPhotoManagement();

  const { rayons } = usePruningRayons();

  const { capacityRows, capacityLoading } = usePruningCapacityCalendar(
    formState.rayonId,
  );

  // Draft persistence
  const formRef = useRef<DraftShape>({
    rayonId: '',
    kecamatanName: '',
    address: '',
    treeCount: '',
    treeHeight: '',
    treeDiameter: '',
    requesterName: '',
    requesterPhone: '',
    rtLeaderName: '',
    rtLeaderPhone: '',
    notes: '',
    gpsLat: null,
    gpsLng: null,
    expectedWeek: null,
    timestamp: 0,
  });

  useEffect(() => {
    formRef.current = {
      rayonId: formState.rayonId,
      kecamatanName: formState.kecamatanName,
      address: formState.address,
      treeCount: formState.treeCount,
      treeHeight: formState.treeHeight,
      treeDiameter: formState.treeDiameter,
      requesterName: formState.requesterName,
      requesterPhone: formState.requesterPhone,
      rtLeaderName: formState.rtLeaderName,
      rtLeaderPhone: formState.rtLeaderPhone,
      notes: formState.notes,
      gpsLat,
      gpsLng,
      expectedWeek: formState.expectedWeek,
      timestamp: Date.now(),
    };
  }, [formState, gpsLat, gpsLng]);

  const { saveDraft, clearDraft, restoreDraft, hasContent } =
    usePruningDraftPersistence({
      formRef,
      photosLength: photos.length,
      onRestoreCallback: (draft) => {
        if (draft.rayonId) formSetters.setRayonId(draft.rayonId);
        if (draft.kecamatanName) formSetters.setKecamatanName(draft.kecamatanName);
        formSetters.setAddress(draft.address ?? '');
        formSetters.setTreeCount(draft.treeCount ?? '');
        formSetters.setTreeHeight(draft.treeHeight ?? '');
        formSetters.setTreeDiameter(draft.treeDiameter ?? '');
        formSetters.setRequesterName(draft.requesterName ?? '');
        formSetters.setRequesterPhone(draft.requesterPhone ?? '');
        formSetters.setRtLeaderName(draft.rtLeaderName ?? '');
        formSetters.setRtLeaderPhone(draft.rtLeaderPhone ?? '');
        formSetters.setNotes(draft.notes ?? '');
        if (draft.gpsLat != null && draft.gpsLng != null) {
          setGpsLat(draft.gpsLat);
          setGpsLng(draft.gpsLng);
        }
        if (draft.expectedWeek) {
          formSetters.setExpectedWeek(draft.expectedWeek);
        }
      },
    });

  const saveDraftRef = useRef(saveDraft);
  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  // Submit mutation
  const { handleSubmit, isBusy } = usePruningSubmitMutation({
    formState,
    gpsLat,
    gpsLng,
    photos,
    validate,
    clearDraft,
    resetForm,
    navigation,
  });

  // Navigation handlers (leave confirmation)
  const { handleLeave } = usePruningNavigationHandlers({
    navigation,
    hasContent,
    clearDraft,
    resetForm,
  });

  // Set up header with leave handler
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader title="Buat Permohonan Perantingan" onBack={handleLeave} />
      ),
    });
  }, [navigation, handleLeave]);

  // Clear error + restore draft on focus
  useFocusEffect(
    useCallback(() => {
      dispatch(clearError());
      void restoreDraft();
    }, [dispatch, restoreDraft]),
  );

  // Modal state for location/week picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NBBackgroundPattern>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SubmitLocationCard
            user={user}
            gpsLat={gpsLat}
            gpsLng={gpsLng}
            gpsAccuracy={gpsAccuracy}
            gpsError={gpsError}
            gpsLoading={gpsLoading}
            captureLocation={captureLocation}
            address={formState.address}
            setAddress={formSetters.setAddress}
            rayons={rayons}
            rayonId={formState.rayonId}
            setRayonId={formSetters.setRayonId}
            kecamatanName={formState.kecamatanName}
            setKecamatanName={formSetters.setKecamatanName}
            pickerOpen={pickerOpen}
            setPickerOpen={setPickerOpen}
            setGpsLat={setGpsLat}
            setGpsLng={setGpsLng}
            setGpsError={setGpsError}
            setGpsAccuracy={setGpsAccuracy}
          />

          <SubmitPhotoCard
            photos={photos}
            handlePickFromCamera={handlePickFromCamera}
            handlePickFromGallery={handlePickFromGallery}
            handleRemovePhoto={handleRemovePhoto}
            isBusy={isBusy}
          />

          <SubmitTreeDetailsCard
            treeCount={formState.treeCount}
            setTreeCount={formSetters.setTreeCount}
            treeHeight={formState.treeHeight}
            setTreeHeight={formSetters.setTreeHeight}
            treeDiameter={formState.treeDiameter}
            setTreeDiameter={formSetters.setTreeDiameter}
          />

          <SubmitWeekCard
            expectedWeek={formState.expectedWeek}
            setExpectedWeek={formSetters.setExpectedWeek}
            weekPickerOpen={weekPickerOpen}
            setWeekPickerOpen={setWeekPickerOpen}
            capacityRows={capacityRows}
            capacityLoading={capacityLoading}
          />

          <SubmitContactCard
            requesterName={formState.requesterName}
            setRequesterName={formSetters.setRequesterName}
            requesterPhone={formState.requesterPhone}
            setRequesterPhone={formSetters.setRequesterPhone}
            rtLeaderName={formState.rtLeaderName}
            setRtLeaderName={formSetters.setRtLeaderName}
            rtLeaderPhone={formState.rtLeaderPhone}
            setRtLeaderPhone={formSetters.setRtLeaderPhone}
          />

          <SubmitNotesCard
            notes={formState.notes}
            setNotes={formSetters.setNotes}
          />
        </ScrollView>

        <SubmitActionBar
          isBusy={isBusy}
          handleSubmit={handleSubmit}
          handleLeave={handleLeave}
        />
      </NBBackgroundPattern>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  scrollContent: {
    padding: nbSpacing[4],
    paddingBottom: nbSpacing[6],
  },
});
