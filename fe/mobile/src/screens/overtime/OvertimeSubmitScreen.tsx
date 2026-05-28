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
  NBBadge,
  NBButton,
  NBBackgroundPattern,
  NBSelect,
  NBCardTextInput,
  NBText,
  NBCollapsibleCard,
  NBToast,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import { GPSLocationSection, ImagePreviewModal } from '../../components/common';
import { isWithinAreaBoundary } from '../../utils/gpsUtils';
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

// ─── Time hero helpers (matches ClockInOutScreen) ────────────────────────────

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

function formatTimeHero(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateHero(d: Date): string {
  return `${DAY_NAMES_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]}`;
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
  const assignedArea = useAppSelector((state) => state.auth.assignedArea);
  const { activityTypes, isLoading: loadingActivityTypes } = useActivityTypes();
  const isFocused = useIsFocused();

  // ─── Screen state ───────────────────────────────────────────────────────────

  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [activeOvertime, setActiveOvertime] = useState<Overtime | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => clearInterval(tick);
  }, []);

  // ─── Image preview ───────────────────────────────────────────────────────────

  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // ─── GPS ────────────────────────────────────────────────────────────────────

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const isWithinBoundary = useMemo(() => {
    if (!location || !assignedArea) { return undefined; }
    return isWithinAreaBoundary(location.latitude, location.longitude, assignedArea);
  }, [location, assignedArea]);

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
        NBToast.show({ level: 'warning', title: 'Izin Kamera', body: 'Akses kamera diperlukan. Aktifkan di Pengaturan aplikasi.' });
        return;
      }
      try {
        const photo = await mediaService.capturePhoto(true);
        if (photo) { setSelfie(photo); }
      } catch (err) {
        NBToast.show({ level: 'danger', title: 'Gagal', body: err instanceof Error ? err.message : 'Gagal mengambil foto' });
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

    let isMounted = true;

    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!isMounted || !raw) { return; }
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
                if (isMounted) { setReason(draft.reason); }
              },
            },
          ],
        );
      })
      .catch(() => {});

    return () => { isMounted = false; };
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
        NBToast.show({ level: 'danger', title: 'Gagal Mulai Lembur', body: errMsg });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memulai lembur';
      dispatch(setError(msg));
      NBToast.show({ level: 'danger', title: 'Gagal', body: msg });
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
        NBToast.show({ level: 'success', title: 'Berhasil', body: 'Lembur berhasil diselesaikan.' });
        navigation.navigate('Overtime' as any);
      } else if (response.error) {
        dispatch(setError(response.error));
        NBToast.show({ level: 'danger', title: 'Gagal Selesai Lembur', body: response.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan lembur';
      dispatch(setError(msg));
      NBToast.show({ level: 'danger', title: 'Gagal', body: msg });
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
          <NBText variant="body" color="gray600" style={styles.loadingText}>Memeriksa status lembur...</NBText>
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
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── STATE A: No active overtime ────────────────────────────────── */}
          {!activeOvertime && (
            <>
              {/* Time hero — matches ClockInOutScreen */}
              <NBCollapsibleCard
                style={styles.selfieCard}
                headerLeft={
                  <NBText variant="h2" color="black" style={styles.timeHeroTime}>
                    {formatTimeHero(currentTime)}
                  </NBText>
                }
                headerRight={
                  <NBText variant="mono-sm" color="gray600">{formatDateHero(currentTime)}</NBText>
                }
                accessibilityLabel="Detail waktu"
              >
                <NBText variant="body-sm" color="gray600" style={styles.centerText}>
                  Konfirmasi lokasi GPS untuk memulai lembur
                </NBText>
              </NBCollapsibleCard>

              {/* Error summary */}
              {Object.values(startErrors).some(Boolean) && (
                <View style={[styles.errorSummary, styles.card]}>
                  <NBText variant="body-sm" color="danger" style={styles.errorSummaryTitle}>Mohon lengkapi data berikut:</NBText>
                  {Object.values(startErrors).filter(Boolean).map((msg, i) => (
                    <NBText key={i} variant="body-sm" color="black" style={styles.errorSummaryItem}>- {msg}</NBText>
                  ))}
                </View>
              )}

              {/* Alasan Lembur (optional) */}
              <NBCardTextInput
                title="ALASAN LEMBUR (OPSIONAL)"
                value={reason}
                onChangeText={setReason}
                placeholder="Contoh: Pekerjaan tambahan setelah jam kerja..."
                numberOfLines={4}
                style={styles.textInputCard}
              />

              {/* Selfie (optional) - Collapsible, default closed */}
              <NBCollapsibleCard
                style={styles.selfieCard}
                accessibilityLabel="Selfie mulai lembur"
                headerLeft={
                  <View>
                    <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>
                      SELFIE MULAI (OPSIONAL)
                    </NBText>
                    {startSelfie ? (
                      <NBText variant="body-sm" color="success">Sudah diambil ✓</NBText>
                    ) : (
                      <NBText variant="body-sm" color="gray600">Opsional</NBText>
                    )}
                  </View>
                }
              >
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
                    <NBText variant="body-sm" color="gray600" style={styles.selfiePrompt}>
                      Foto selfie untuk verifikasi mulai lembur (tidak wajib)
                    </NBText>
                    <NBButton
                      title="Ambil Selfie"
                      onPress={handleCaptureStartSelfie}
                      variant="secondary"
                      fullWidth
                    />
                  </View>
                )}
              </NBCollapsibleCard>

              {/* Lokasi GPS */}
              <NBCollapsibleCard
                style={[styles.selfieCard, styles.gpsCard]}
                defaultExpanded
                accessibilityLabel="Lokasi GPS"
                headerLeft={
                  <View>
                    <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
                      {'LOKASI GPS '}
                      <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
                    </NBText>
                  </View>
                }
                headerRight={location != null
                  ? <NBBadge
                      text={isWithinBoundary ? 'DI AREA' : 'LUAR AREA'}
                      color={isWithinBoundary ? 'success' : 'danger'}
                      size="sm"
                    />
                  : undefined
                }
              >
                <GPSLocationSection
                  latitude={location?.latitude ?? null}
                  longitude={location?.longitude ?? null}
                  accuracy={location?.accuracy ?? null}
                  isCapturing={isCapturingLocation}
                  onRefresh={captureLocation}
                  error={startErrors.location}
                  isWithinBoundary={isWithinBoundary}
                  areaName={assignedArea?.name}
                />
              </NBCollapsibleCard>

            </>
          )}

          {/* ── STATE B: Overtime in progress ─────────────────────────────── */}
          {activeOvertime && (
            <>
              {/* Error summary */}
              {Object.values(endErrors).some(Boolean) && (
                <View style={styles.errorSummary}>
                  <NBText variant="body-sm" color="danger" style={styles.errorSummaryTitle}>Mohon lengkapi data berikut:</NBText>
                  {Object.values(endErrors).filter(Boolean).map((msg, i) => (
                    <NBText key={i} variant="body-sm" color="black" style={styles.errorSummaryItem}>- {msg}</NBText>
                  ))}
                </View>
              )}

              {/* Active overtime info — DURASI tinted card */}
              <View style={[styles.card, styles.durasiCard]}>
                <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.8, marginBottom: nbSpacing.xs }}>DURASI</NBText>
                <NBText variant="display-xl" color="statusIdle" style={styles.timerValue}>{elapsed}</NBText>
                <View style={styles.startTimeRow}>
                  <NBText variant="body-sm" color="gray600" style={styles.startTimeLabel}>Mulai:</NBText>
                  <NBText variant="body-sm" color="black" style={styles.startTimeValue}>
                    {formatTime(activeOvertime.start_datetime)}
                  </NBText>
                </View>
                {activeOvertime.reason && (
                  <View style={styles.reasonRow}>
                    <NBText variant="body-sm" color="gray600" style={styles.startTimeLabel}>Alasan:</NBText>
                    <NBText variant="body-sm" color="black" style={styles.reasonValue}>{activeOvertime.reason}</NBText>
                  </View>
                )}
              </View>

              {/* Jenis Aktivitas */}
              <View style={styles.card}>
                <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.sm }}>
                  JENIS AKTIVITAS{' '}
                  <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
                </NBText>
                {loadingActivityTypes ? (
                  <ActivityIndicator style={styles.activityIndicator} />
                ) : activityTypes.length === 0 ? (
                  <NBText variant="body-sm" color="warning" style={styles.warningText}>
                    Tidak ada jenis aktivitas tersedia. Hubungi administrator.
                  </NBText>
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
                  <NBText variant="body-sm" color="danger" style={styles.errorText}>{endErrors.activityType}</NBText>
                )}
              </View>

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
              <View style={styles.card}>
                <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6, marginBottom: nbSpacing.xs }}>
                  FOTO BUKTI{' '}
                  <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
                </NBText>
                <NBText variant="body-sm" color="gray600" style={{ marginBottom: nbSpacing.sm }}>Tambahkan 1-3 foto pekerjaan lembur</NBText>
                <PhotoUploader
                  photos={endPhotos}
                  onAdd={(photo) => setEndPhotos((prev) => [...prev, photo])}
                  onRemove={(photoId) =>
                    setEndPhotos((prev) => prev.filter((p) => p.id !== photoId))
                  }
                  error={endErrors.photos}
                />
              </View>

              {/* Selfie (optional for end) - Collapsible, default closed */}
              <NBCollapsibleCard
                style={styles.selfieCard}
                accessibilityLabel="Selfie selesai lembur"
                headerLeft={
                  <View>
                    <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>
                      SELFIE SELESAI (OPSIONAL)
                    </NBText>
                    {endSelfie ? (
                      <NBText variant="body-sm" color="success">Sudah diambil ✓</NBText>
                    ) : (
                      <NBText variant="body-sm" color="gray600">Opsional</NBText>
                    )}
                  </View>
                }
              >
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
                    <NBText variant="body-sm" color="gray600" style={styles.selfiePrompt}>
                      Foto selfie untuk verifikasi selesai (tidak wajib)
                    </NBText>
                    <NBButton
                      title="Ambil Selfie"
                      onPress={handleCaptureEndSelfie}
                      variant="secondary"
                      fullWidth
                    />
                  </View>
                )}
              </NBCollapsibleCard>

              {/* Lokasi GPS */}
              <NBCollapsibleCard
                style={[styles.selfieCard, styles.gpsCard]}
                defaultExpanded
                accessibilityLabel="Lokasi GPS"
                headerLeft={
                  <View>
                    <NBText variant="mono-sm" color="gray700" uppercase style={styles.cardLabel}>
                      {'LOKASI GPS '}
                      <NBText variant="mono-sm" color="danger" style={{ textTransform: 'none' }}>*</NBText>
                    </NBText>
                  </View>
                }
                headerRight={location != null
                  ? <NBBadge
                      text={isWithinBoundary ? 'DI AREA' : 'LUAR AREA'}
                      color={isWithinBoundary ? 'success' : 'danger'}
                      size="sm"
                    />
                  : undefined
                }
              >
                <GPSLocationSection
                  latitude={location?.latitude ?? null}
                  longitude={location?.longitude ?? null}
                  accuracy={location?.accuracy ?? null}
                  isCapturing={isCapturingLocation}
                  onRefresh={captureLocation}
                  error={endErrors.location}
                  isWithinBoundary={isWithinBoundary}
                  areaName={assignedArea?.name}
                />
              </NBCollapsibleCard>
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
    // Typography handled by NBText variant="body" color="gray600"
  },
  scrollContent: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
  },
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  textInputCard: {
    marginBottom: nbSpacing.md,
  },
  selfieCard: {
    marginHorizontal: 0,
  },
  gpsCard: {
    backgroundColor: nbColors.statusIdleBg,
  },
  selfieImage: {
    width: '100%',
    height: 200,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.gray200,
  },
  selfiePrompt: {
    // Typography handled by NBText variant="body-sm" color="gray600"
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  timeHeroTime: {
    letterSpacing: 0.5,
  },
  centerText: {
    textAlign: 'center',
  },
  cardLabel: {
    letterSpacing: 0.6,
  },
  durasiCard: {
    backgroundColor: withAlpha(nbColors.statusIdle, 0.08),
    alignItems: 'center',
  },
  timerValue: {
    // Typography handled by NBText variant="display-xl" color="warning"
    letterSpacing: 1,
    textAlign: 'center',
  },
  startTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray300,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: nbSpacing.xs,
  },
  startTimeLabel: {
    // Typography handled by NBText variant="body-sm" color="gray600"
  },
  startTimeValue: {
    // Typography handled by NBText variant="body-sm" color="black"
  },
  reasonValue: {
    flex: 1,
    // Typography handled by NBText variant="body-sm" color="black"
    marginLeft: nbSpacing.xs,
  },
  activityIndicator: {
    marginVertical: nbSpacing.sm,
  },
  errorText: {
    // Typography handled by NBText variant="body-sm" color="danger"
    marginTop: nbSpacing.xs,
  },
  warningText: {
    // Typography handled by NBText variant="body-sm" color="warning"
    marginVertical: nbSpacing.xs,
  },
  errorSummary: {
    backgroundColor: withAlpha(nbColors.danger, 0.05),
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.danger,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  errorSummaryTitle: {
    // Typography handled by NBText variant="body-sm" color="danger"
    marginBottom: nbSpacing.xs,
  },
  errorSummaryItem: {
    // Typography handled by NBText variant="body-sm" color="black"
    color: nbColors.danger,
    marginTop: 2,
  },
  submitBar: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
  },
});
