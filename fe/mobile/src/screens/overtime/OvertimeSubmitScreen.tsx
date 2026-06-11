/**
 * Overtime Submit Screen
 * Phase 2E: Clock-in/out redesign — two-state screen (start/end overtime)
 * State A: No active overtime → show "Mulai Lembur" form
 * State B: Overtime in progress → show "Selesai Lembur" form
 */

import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppSelector } from '../../store/hooks';
import { selectOvertimeSubmitting } from '../../store/slices/overtimeSlice';
import { useActivityTypes } from '../../hooks/useActivityTypes';
import { requestCameraPermission } from '../../services/permissions';
import { mediaService, type Photo } from '../../services/media';
import {
  NBButton,
  NBBackgroundPattern,
  NBText,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
} from '../../constants/nbTokens';
import { ImagePreviewModal } from '../../components/common';
import { useOvertimeStartForm, useOvertimeEndForm, useOvertimeSession } from './hooks';
import OvertimeTimeHero from './components/OvertimeTimeHero';
import OvertimeStartForm from './components/OvertimeStartForm';
import OvertimeSelfieSection from './components/OvertimeSelfieSection';
import OvertimeDurationCard from './components/OvertimeDurationCard';
import OvertimeEndForm from './components/OvertimeEndForm';

// ─── Screen ───────────────────────────────────────────────────────────────────

export const OvertimeSubmitScreen: React.FC<
  MainTabScreenProps<'OvertimeSubmit'>
> = () => {
  const navigation = useNavigation<MainTabScreenProps<'OvertimeSubmit'>['navigation']>();
  const isSubmitting = useAppSelector(selectOvertimeSubmitting);
  const assignedArea = useAppSelector((state) => state.auth.assignedArea);
  const { activityTypes, isLoading: loadingActivityTypes } = useActivityTypes();
  const isFocused = useIsFocused();

  // ─── Session: Active overtime, GPS, elapsed time ────────────────────────

  const {
    isLoadingActive,
    activeOvertime,
    location,
    isCapturingLocation,
    captureLocation,
    elapsed,
    isWithinBoundary,
  } = useOvertimeSession(assignedArea);

  // ─── State A: Start Overtime ─────────────────────────────────────────────

  const {
    reason,
    setReason,
    startSelfie,
    setStartSelfie,
    startErrors,
    handleSubmit: handleStartOvertime,
    handleLeave,
  } = useOvertimeStartForm(location, activeOvertime, isFocused);

  // ─── State B: End Overtime ───────────────────────────────────────────────

  const {
    endActivityTypeId,
    setEndActivityTypeId,
    endDescription,
    setEndDescription,
    endPhotos,
    setEndPhotos,
    endSelfie,
    setEndSelfie,
    endErrors,
    handleSubmit: handleEndOvertime,
    resetForm: resetEndForm,
  } = useOvertimeEndForm(location);

  // ─── Image preview ───────────────────────────────────────────────────────

  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // ─── Current time (for hero display) ─────────────────────────────────────

  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => clearInterval(tick);
  }, []);

  // ─── Selfie capture handlers ─────────────────────────────────────────────

  const makeCaptureHandler = useCallback(
    (setSelfie: (photo: Photo) => void) => async () => {
      const permResult = await requestCameraPermission();
      if (!permResult.granted) {
        return;
      }
      try {
        const photo = await mediaService.capturePhoto(true);
        if (photo) { setSelfie(photo); }
      } catch {
        // Error handled in components via props
      }
    },
    [],
  );

  const handleCaptureStartSelfie = useMemo(
    () => makeCaptureHandler(setStartSelfie),
    [makeCaptureHandler, setStartSelfie],
  );
  const handleCaptureEndSelfie = useMemo(
    () => makeCaptureHandler(setEndSelfie),
    [makeCaptureHandler, setEndSelfie],
  );

  // ─── Reset end form when active overtime clears ──────────────────────────

  useEffect(() => {
    if (!activeOvertime) {
      resetEndForm();
      setStartSelfie(null);
      setEndSelfie(null);
    }
  }, [activeOvertime, resetEndForm, setStartSelfie, setEndSelfie]);

  // ─── Activity type dropdown options ──────────────────────────────────────

  const activityTypeOptions = useMemo(
    () => activityTypes
      .slice()
      .sort((a, b) => {
        if (a.name.toLowerCase() === 'lainnya') { return 1; }
        if (b.name.toLowerCase() === 'lainnya') { return -1; }
        return 0;
      })
      .map((t) => ({ label: t.name, value: t.id })),
    [activityTypes],
  );

  // ─── Header title ────────────────────────────────────────────────────────

  const screenTitle = activeOvertime ? 'Lembur Aktif' : 'Mulai Lembur';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader
          title={screenTitle}
          onBack={activeOvertime ? () => navigation.navigate('Overtime' as any) : handleLeave}
        />
      ),
    });
  }, [navigation, screenTitle, activeOvertime, handleLeave]);

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (isLoadingActive) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600" style={styles.loadingText}>
            Memeriksa status lembur...
          </NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!activeOvertime && (
            <>
              <OvertimeTimeHero currentTime={currentTime} />

              <OvertimeStartForm
                reason={reason}
                onReasonChange={setReason}
                location={location}
                isCapturingLocation={isCapturingLocation}
                onRefreshLocation={captureLocation}
                error={startErrors.location}
                isWithinBoundary={isWithinBoundary}
                areaName={assignedArea?.name}
              />

              <OvertimeSelfieSection
                label="SELFIE MULAI (OPSIONAL)"
                selfie={startSelfie}
                onCapture={handleCaptureStartSelfie}
                onPreview={setPreviewUri}
              />
            </>
          )}

          {activeOvertime && (
            <>
              <OvertimeDurationCard
                elapsed={elapsed}
                startTime={activeOvertime.start_datetime}
                reason={activeOvertime.reason}
              />

              <OvertimeEndForm
                endActivityTypeId={endActivityTypeId}
                onActivityTypeChange={setEndActivityTypeId}
                endDescription={endDescription}
                onDescriptionChange={setEndDescription}
                endPhotos={endPhotos}
                onAddPhoto={(photo) => setEndPhotos((prev) => [...prev, photo])}
                onRemovePhoto={(photoId) => setEndPhotos((prev) => prev.filter((p) => p.id !== photoId))}
                location={location}
                isCapturingLocation={isCapturingLocation}
                onRefreshLocation={captureLocation}
                errors={endErrors}
                activityTypeOptions={activityTypeOptions}
                loadingActivityTypes={loadingActivityTypes}
                isWithinBoundary={isWithinBoundary}
                areaName={assignedArea?.name}
              />

              <OvertimeSelfieSection
                label="SELFIE SELESAI (OPSIONAL)"
                selfie={endSelfie}
                onCapture={handleCaptureEndSelfie}
                onPreview={setPreviewUri}
              />
            </>
          )}
        </ScrollView>

        <ImagePreviewModal
          uri={previewUri}
          onClose={() => setPreviewUri(null)}
          title="Selfie"
        />

        <View style={styles.submitBar}>
          {!activeOvertime ? (
            <NBButton
              title={isSubmitting ? 'Memulai...' : 'Mulai Lembur'}
              onPress={handleStartOvertime}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting || isCapturingLocation}
            />
          ) : (
            <NBButton
              title={isSubmitting ? 'Menyelesaikan...' : 'Selesai Lembur'}
              onPress={handleEndOvertime}
              variant="danger"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting || isCapturingLocation}
            />
          )}
        </View>
      </View>
    </NBBackgroundPattern>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
  },
  submitBar: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
  },
});
