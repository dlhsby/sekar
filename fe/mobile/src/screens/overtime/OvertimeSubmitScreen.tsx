/**
 * Overtime Submit Screen
 * Phase 2E: Clock-in/out redesign — two-state screen (start/end overtime)
 * State A: No active overtime → show "Mulai Lembur" form
 * State B: Overtime in progress → show "Selesai Lembur" form
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectOvertimeSubmitting,
  setSubmitting,
  addOvertime,
  setError,
} from '../../store/slices/overtimeSlice';
import {
  startOvertime,
  endOvertime,
  getActiveOvertime,
} from '../../services/api/overtimeApi';
import { useActivityTypes } from '../../hooks/useActivityTypes';
import { mediaService, type Photo } from '../../services/media';
import { requestCameraPermission } from '../../services/permissions';
import { getCurrentShift } from '../../services/api/shiftsApi';
import { locationTracker } from '../../services/location/locationTracker';
import { setCurrentShift, clockOutSuccess } from '../../store/slices/shiftSlice';
import { PhotoUploader } from '../../components/common';
import {
  NBButton,
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBSelect,
  NBCardTextInput,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { GPSLocationSection, ImagePreviewModal } from '../../components/common';
import type { StartOvertimeRequest, EndOvertimeRequest } from '../../types/api.types';
import type { Overtime } from '../../types/models.types';
import type { Coordinates } from '../../types/models.types';

// ─── Draft ────────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'overtime_start_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1_000; // 24 hours

interface StartDraft {
  reason: string;
  savedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatElapsed(startIso: string): string {
  const elapsed = Date.now() - new Date(startIso).getTime();
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1_000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Form Errors ──────────────────────────────────────────────────────────────

interface StartErrors {
  location?: string;
}

interface EndErrors {
  activityType?: string;
  description?: string;
  photos?: string;
  location?: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const OvertimeSubmitScreen: React.FC<
  MainTabScreenProps<'OvertimeSubmit'>
> = () => {
  const navigation =
    useNavigation<MainTabScreenProps<'OvertimeSubmit'>['navigation']>();
  const dispatch = useAppDispatch();
  const isSubmitting = useAppSelector(selectOvertimeSubmitting);
  const { activityTypes, isLoading: loadingActivityTypes } = useActivityTypes();
  const isFocused = useIsFocused();

  // ─── Screen state ───────────────────────────────────────────────────────────

  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [activeOvertime, setActiveOvertime] = useState<Overtime | null>(null);

  // ─── Image preview ───────────────────────────────────────────────────────────

  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // ─── GPS ────────────────────────────────────────────────────────────────────

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const captureLocation = useCallback(() => {
    setIsCapturingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsCapturingLocation(false);
      },
      () => {
        setIsCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
  }, []);

  // ─── Selfie (separate for start vs end to prevent carry-over) ───────────────

  const [startSelfie, setStartSelfie] = useState<Photo | null>(null);
  const [endSelfie, setEndSelfie] = useState<Photo | null>(null);

  const makeCaptureHandler = useCallback(
    (setSelfie: (photo: Photo) => void) => async () => {
      const permResult = await requestCameraPermission();
      if (!permResult.granted) {
        Alert.alert('Izin Kamera', 'Akses kamera diperlukan. Aktifkan di Pengaturan aplikasi.');
        return;
      }
      try {
        const photo = await mediaService.capturePhoto(true);
        if (photo) { setSelfie(photo); }
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Gagal mengambil foto');
      }
    },
    [],
  );

  const handleCaptureStartSelfie = useMemo(
    () => makeCaptureHandler(setStartSelfie),
    [makeCaptureHandler],
  );
  const handleCaptureEndSelfie = useMemo(
    () => makeCaptureHandler(setEndSelfie),
    [makeCaptureHandler],
  );

  // ─── State A: Start Overtime ─────────────────────────────────────────────────

  const [reason, setReason] = useState('');
  const [startErrors, setStartErrors] = useState<StartErrors>({});

  // ─── Draft: load on mount (only when no active overtime) ────────────────────

  useEffect(() => {
    if (activeOvertime !== null || isLoadingActive) { return; }

    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!raw) { return; }
        const draft = JSON.parse(raw) as StartDraft;
        const age = Date.now() - new Date(draft.savedAt).getTime();
        if (age > DRAFT_MAX_AGE_MS) {
          void AsyncStorage.removeItem(DRAFT_KEY);
          return;
        }
        if (!draft.reason) { return; }
        Alert.alert(
          'Lanjutkan Draft?',
          'Ditemukan form lembur yang belum selesai. Lanjutkan atau hapus?',
          [
            {
              text: 'Hapus Draft',
              style: 'destructive',
              onPress: () => void AsyncStorage.removeItem(DRAFT_KEY),
            },
            {
              text: 'Lanjutkan Draft',
              onPress: () => {
                setReason(draft.reason);
              },
            },
          ],
        );
      })
      .catch(() => {
        // Ignore storage read errors silently
      });
  // Run once after active-overtime check resolves
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingActive]);

  // ─── Draft: auto-save on reason / selfie change ─────────────────────────────

  useEffect(() => {
    if (activeOvertime) { return; }
    const draft: StartDraft = {
      reason,
      savedAt: new Date().toISOString(),
    };
    void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [reason, activeOvertime]);

  // ─── Draft: save on blur / unmount (capture latest via ref would be ideal,
  //     but the auto-save above already fires on each change, so on blur we
  //     only need to handle the case where the screen unmounts mid-edit) ────────

  useEffect(() => {
    if (isFocused) { return; }
    if (activeOvertime) { return; }
    const draft: StartDraft = {
      reason,
      savedAt: new Date().toISOString(),
    };
    void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  // reason is needed here for the blur snapshot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // ─── Back navigation with draft prompt (State A only) ───────────────────────

  const handleLeave = useCallback(() => {
    const hasData = Boolean(reason || startSelfie);
    if (!hasData) {
      navigation.navigate('Overtime' as any);
      return;
    }
    Alert.alert(
      'Simpan Draft?',
      'Simpan data lembur sebagai draft?',
      [
        {
          text: 'Tidak',
          style: 'destructive',
          onPress: () => {
            setReason('');
            setStartSelfie(null);
            void AsyncStorage.removeItem(DRAFT_KEY);
            navigation.navigate('Overtime' as any);
          },
        },
        {
          text: 'Ya',
          onPress: () => {
            const draft: StartDraft = {
              reason,
              savedAt: new Date().toISOString(),
            };
            void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            navigation.navigate('Overtime' as any);
          },
        },
      ],
    );
  }, [reason, startSelfie, navigation]);

  const validateStartForm = useCallback((): boolean => {
    const errs: StartErrors = {};
    if (!location) {
      errs.location = 'GPS lokasi diperlukan. Ketuk "Perbarui GPS" untuk mencoba lagi.';
    }
    setStartErrors(errs);
    return Object.keys(errs).length === 0;
  }, [location]);

  const handleStartOvertime = useCallback(async () => {
    if (!validateStartForm()) { return; }
    dispatch(setSubmitting(true));
    try {
      const selfieBase64 = startSelfie ? await mediaService.convertToBase64(startSelfie) : undefined;
      const dto: StartOvertimeRequest = {
        gps_lat: location!.latitude,
        gps_lng: location!.longitude,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        selfie_photo: selfieBase64,
      };
      const response = await startOvertime(dto);
      if (response.data) {
        dispatch(addOvertime(response.data));
        void AsyncStorage.removeItem(DRAFT_KEY);
        // Re-initialize location tracker with the new overtime shift
        if (response.data.shift_id) {
          const shiftRes = await getCurrentShift();
          if (shiftRes.data) {
            dispatch(setCurrentShift(shiftRes.data as any));
            await locationTracker.initialize(response.data.shift_id);
          }
        }
        navigation.navigate('Overtime' as any);
      } else if (response.error) {
        dispatch(setError(response.error));
        // Translate known backend errors to Indonesian
        const errMsg = response.error.includes('end normal shift')
          ? 'Anda masih memiliki shift aktif. Selesaikan Clock Out shift biasa sebelum memulai lembur.'
          : response.error;
        Alert.alert('Gagal Mulai Lembur', errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memulai lembur';
      dispatch(setError(msg));
      Alert.alert('Gagal', msg);
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [validateStartForm, startSelfie, location, reason, dispatch]);

  // ─── State B: End Overtime ───────────────────────────────────────────────────

  const [endActivityTypeId, setEndActivityTypeId] = useState('');
  const [endDescription, setEndDescription] = useState('');
  const [endPhotos, setEndPhotos] = useState<Photo[]>([]);
  const [endErrors, setEndErrors] = useState<EndErrors>({});
  const [elapsed, setElapsed] = useState('00:00:00');

  const validateEndForm = useCallback((): boolean => {
    const errs: EndErrors = {};
    if (!endActivityTypeId || !UUID_REGEX.test(endActivityTypeId)) {
      errs.activityType = 'Jenis aktivitas harus dipilih';
    }
    if (!endDescription.trim()) {
      errs.description = 'Deskripsi harus diisi';
    }
    if (endPhotos.length === 0) {
      errs.photos = 'Minimal 1 foto diperlukan';
    }
    if (!location) {
      errs.location = 'GPS lokasi diperlukan. Ketuk "Perbarui GPS" untuk mencoba lagi.';
    }
    setEndErrors(errs);
    return Object.keys(errs).length === 0;
  }, [endActivityTypeId, endDescription, endPhotos, location]);

  const handleEndOvertime = useCallback(async () => {
    if (!validateEndForm()) { return; }
    dispatch(setSubmitting(true));
    try {
      // Upload photos to S3/base64 via mediaService
      const photoUrls: string[] = [];
      for (const photo of endPhotos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoUrls.push(base64);
      }
      const selfieBase64 = endSelfie ? await mediaService.convertToBase64(endSelfie) : undefined;
      const dto: EndOvertimeRequest = {
        gps_lat: location!.latitude,
        gps_lng: location!.longitude,
        activity_type_id: endActivityTypeId,
        description: endDescription.trim(),
        photo_urls: photoUrls,
        selfie_photo: selfieBase64,
      };
      const response = await endOvertime(dto);
      if (response.data) {
        dispatch(addOvertime(response.data));
        // Shift already ended server-side — stop without uploading (avoids 400 race).
        locationTracker.stopImmediate();
        dispatch(clockOutSuccess());
        Alert.alert('Berhasil', 'Lembur berhasil diselesaikan', [
          { text: 'OK', onPress: () => navigation.navigate('Overtime' as any) },
        ]);
      } else if (response.error) {
        dispatch(setError(response.error));
        const errMsg = response.error;
        Alert.alert('Gagal Selesai Lembur', errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan lembur';
      dispatch(setError(msg));
      Alert.alert('Gagal', msg);
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [validateEndForm, endPhotos, endSelfie, location, endActivityTypeId, endDescription, dispatch, navigation]);

  // ─── Elapsed timer (State B) ─────────────────────────────────────────────────

  useEffect(() => {
    if (!activeOvertime?.start_datetime) { return; }
    const tick = () => setElapsed(formatElapsed(activeOvertime.start_datetime));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [activeOvertime?.start_datetime, activeOvertime?.id]);

  // ─── Load active overtime on focus ──────────────────────────────────────────

  const fetchActiveOvertime = useCallback(async () => {
    setIsLoadingActive(true);
    try {
      const response = await getActiveOvertime();
      const newActive = response.data ?? null;
      setActiveOvertime(newActive);
      // Reset end-form fields when active overtime clears (lembur was just ended)
      if (!newActive) {
        setEndActivityTypeId('');
        setEndDescription('');
        setEndPhotos([]);
        setEndErrors({});
        setStartSelfie(null);
        setEndSelfie(null);
      }
    } catch {
      setActiveOvertime(null);
    } finally {
      setIsLoadingActive(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActiveOvertime();
      captureLocation();
    }, [fetchActiveOvertime, captureLocation]),
  );

  // ─── Header title ────────────────────────────────────────────────────────────

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

  // ─── Derived values ──────────────────────────────────────────────────────────

  const activityTypeOptions = activityTypes
    .slice()
    .sort((a, b) => {
      if (a.name.toLowerCase() === 'lainnya') { return 1; }
      if (b.name.toLowerCase() === 'lainnya') { return -1; }
      return 0;
    })
    .map((t) => ({ label: t.name, value: t.id }));

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoadingActive) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memeriksa status lembur...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── STATE A: No active overtime ────────────────────────────────── */}
          {!activeOvertime && (
            <>
              {/* Error summary */}
              {Object.values(startErrors).some(Boolean) && (
                <View style={styles.errorSummary}>
                  <Text style={styles.errorSummaryTitle}>Mohon lengkapi data berikut:</Text>
                  {Object.values(startErrors).filter(Boolean).map((msg, i) => (
                    <Text key={i} style={styles.errorSummaryItem}>- {msg}</Text>
                  ))}
                </View>
              )}

              {/* Subtitle */}
              <View style={styles.subtitleRow}>
                <MaterialCommunityIcons
                  name="clock-plus-outline"
                  size={20}
                  color={nbColors.gray[600]}
                />
                <Text style={styles.subtitleText}>
                  Konfirmasi lokasi GPS untuk memulai lembur
                </Text>
              </View>

              {/* Alasan Lembur (optional) */}
              <NBCardTextInput
                title="ALASAN LEMBUR (OPSIONAL)"
                value={reason}
                onChangeText={setReason}
                placeholder="Contoh: Pekerjaan tambahan setelah jam kerja..."
                numberOfLines={4}
                style={styles.card}
              />

              {/* Selfie (optional) */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>SELFIE MULAI (OPSIONAL)</Text>
                </NBCardHeader>
                <NBCardContent>
                  {startSelfie ? (
                    <View>
                      <TouchableOpacity
                        onPress={() => setPreviewUri(startSelfie.uri)}
                        accessibilityRole="button"
                        accessibilityLabel="Lihat selfie penuh"
                        accessibilityHint="Ketuk untuk melihat foto dalam ukuran penuh"
                      >
                        <Image source={{ uri: startSelfie.uri }} style={styles.selfieImage} />
                      </TouchableOpacity>
                      <NBButton
                        title="Ambil Ulang"
                        onPress={handleCaptureStartSelfie}
                        variant="secondary"
                        fullWidth
                      />
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.selfiePrompt}>
                        Foto selfie untuk verifikasi mulai lembur (tidak wajib)
                      </Text>
                      <NBButton
                        title="Ambil Selfie"
                        onPress={handleCaptureStartSelfie}
                        variant="secondary"
                        fullWidth
                      />
                    </View>
                  )}
                </NBCardContent>
              </NBCard>

              {/* Lokasi GPS */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>
                    LOKASI GPS{' '}
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                </NBCardHeader>
                <NBCardContent>
                  <GPSLocationSection
                    location={location}
                    isCapturing={isCapturingLocation}
                    onRefresh={captureLocation}
                    error={startErrors.location}
                  />
                </NBCardContent>
              </NBCard>

            </>
          )}

          {/* ── STATE B: Overtime in progress ─────────────────────────────── */}
          {activeOvertime && (
            <>
              {/* Error summary */}
              {Object.values(endErrors).some(Boolean) && (
                <View style={styles.errorSummary}>
                  <Text style={styles.errorSummaryTitle}>Mohon lengkapi data berikut:</Text>
                  {Object.values(endErrors).filter(Boolean).map((msg, i) => (
                    <Text key={i} style={styles.errorSummaryItem}>- {msg}</Text>
                  ))}
                </View>
              )}

              {/* Active overtime info */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>LEMBUR BERLANGSUNG</Text>
                </NBCardHeader>
                <NBCardContent>
                  <View style={styles.timerContainer}>
                    <Text style={styles.timerLabel}>Durasi Lembur</Text>
                    <Text style={styles.timerValue}>{elapsed}</Text>
                  </View>
                  <View style={styles.startTimeRow}>
                    <Text style={styles.startTimeLabel}>Mulai:</Text>
                    <Text style={styles.startTimeValue}>
                      {formatTime(activeOvertime.start_datetime)}
                    </Text>
                  </View>
                  {activeOvertime.reason && (
                    <View style={styles.reasonRow}>
                      <Text style={styles.startTimeLabel}>Alasan:</Text>
                      <Text style={styles.reasonValue}>{activeOvertime.reason}</Text>
                    </View>
                  )}
                </NBCardContent>
              </NBCard>

              {/* Jenis Aktivitas */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>
                    JENIS AKTIVITAS{' '}
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                </NBCardHeader>
                <NBCardContent>
                  {loadingActivityTypes ? (
                    <ActivityIndicator style={styles.activityIndicator} />
                  ) : activityTypes.length === 0 ? (
                    <Text style={styles.warningText}>
                      Tidak ada jenis aktivitas tersedia. Hubungi administrator.
                    </Text>
                  ) : (
                    <NBSelect
                      value={endActivityTypeId || ''}
                      onValueChange={(v) => setEndActivityTypeId(String(v))}
                      options={activityTypeOptions}
                      placeholder="Pilih jenis aktivitas..."
                      searchable
                      searchPlaceholder="Cari jenis aktivitas..."
                    />
                  )}
                  {endErrors.activityType && (
                    <Text style={styles.errorText}>{endErrors.activityType}</Text>
                  )}
                </NBCardContent>
              </NBCard>

              {/* Deskripsi */}
              <NBCardTextInput
                title="DESKRIPSI PEKERJAAN"
                required
                value={endDescription}
                onChangeText={setEndDescription}
                placeholder="Jelaskan aktivitas lembur yang dilakukan..."
                numberOfLines={5}
                error={endErrors.description}
                style={styles.card}
              />

              {/* Foto Bukti */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>
                    FOTO BUKTI{' '}
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <Text style={styles.sectionSubtitle}>Tambahkan 1-3 foto pekerjaan lembur</Text>
                </NBCardHeader>
                <NBCardContent>
                  <PhotoUploader
                    photos={endPhotos}
                    onAdd={(photo) => setEndPhotos((prev) => [...prev, photo])}
                    onRemove={(photoId) =>
                      setEndPhotos((prev) => prev.filter((p) => p.id !== photoId))
                    }
                    error={endErrors.photos}
                  />
                </NBCardContent>
              </NBCard>

              {/* Selfie (optional for end) */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>SELFIE SELESAI (OPSIONAL)</Text>
                </NBCardHeader>
                <NBCardContent>
                  {endSelfie ? (
                    <View>
                      <TouchableOpacity
                        onPress={() => setPreviewUri(endSelfie.uri)}
                        accessibilityRole="button"
                        accessibilityLabel="Lihat selfie penuh"
                        accessibilityHint="Ketuk untuk melihat foto dalam ukuran penuh"
                      >
                        <Image source={{ uri: endSelfie.uri }} style={styles.selfieImage} />
                      </TouchableOpacity>
                      <NBButton
                        title="Ambil Ulang"
                        onPress={handleCaptureEndSelfie}
                        variant="secondary"
                        fullWidth
                      />
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.selfiePrompt}>
                        Foto selfie untuk verifikasi selesai (tidak wajib)
                      </Text>
                      <NBButton
                        title="Ambil Selfie"
                        onPress={handleCaptureEndSelfie}
                        variant="secondary"
                        fullWidth
                      />
                    </View>
                  )}
                </NBCardContent>
              </NBCard>

              {/* Lokasi GPS */}
              <NBCard style={styles.card}>
                <NBCardHeader>
                  <Text style={styles.sectionTitle}>
                    LOKASI GPS{' '}
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                </NBCardHeader>
                <NBCardContent>
                  <GPSLocationSection
                    location={location}
                    isCapturing={isCapturingLocation}
                    onRefresh={captureLocation}
                    error={endErrors.location}
                  />
                </NBCardContent>
              </NBCard>
            </>
          )}
        </ScrollView>

        {/* Image preview modal */}
        <ImagePreviewModal
          uri={previewUri}
          onClose={() => setPreviewUri(null)}
          title="Selfie"
        />

        {/* Fixed action button */}
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
      </SafeAreaView>
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
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
    fontWeight: nbTypography.fontWeight.medium,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
  },
  card: {
    marginBottom: nbSpacing.md,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.md,
  },
  subtitleText: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredAsterisk: {
    color: nbColors.danger,
    fontWeight: nbTypography.fontWeight.bold,
    fontSize: nbTypography.fontSize.lg,
    textTransform: 'none',
  },
  sectionSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
  },
  selfieImage: {
    width: '100%',
    height: 200,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.gray[200],
  },
  selfiePrompt: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: nbSpacing.sm,
  },
  timerLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
  },
  timerValue: {
    fontSize: 44,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.warning,
    letterSpacing: 1,
    textAlign: 'center',
  },
  startTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray[300],
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: nbSpacing.xs,
  },
  startTimeLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
  },
  startTimeValue: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  reasonValue: {
    flex: 1,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
    marginLeft: nbSpacing.xs,
  },
  activityIndicator: {
    marginVertical: nbSpacing.sm,
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.danger,
    marginTop: nbSpacing.xs,
  },
  warningText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.warning,
    marginVertical: nbSpacing.xs,
  },
  errorSummary: {
    backgroundColor: '#FFF5F5',
    borderWidth: nbBorders.base,
    borderColor: nbColors.danger,
    borderRadius: nbBorderRadius.base,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  errorSummaryTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.danger,
    marginBottom: nbSpacing.xs,
  },
  errorSummaryItem: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.danger,
    marginTop: 2,
  },
  submitBar: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
});
