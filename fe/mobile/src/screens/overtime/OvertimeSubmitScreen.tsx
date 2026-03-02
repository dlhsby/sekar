/**
 * Overtime Submit Screen
 * Phase 2C: Submit overtime with draft/discard, start_datetime/end_datetime, back button
 */

import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOvertimeSubmitting, setSubmitting, addOvertime, setError } from '../../store/slices/overtimeSlice';
import { submitOvertime } from '../../services/api/overtimeApi';
import { useActivityTypes } from '../../hooks/useActivityTypes';
import { mediaService, type Photo } from '../../services/media';
import { PhotoUploader } from '../../components/common';
import {
  NBButton,
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBDatePicker,
  NBSelect,
  NBCardTextInput,
} from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import { GPSLocationSection } from '../../components/common';
import type { CreateOvertimeRequest } from '../../types/api.types';
import type { Coordinates } from '../../types/models.types';

// ─── Draft ────────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'overtime_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SAVE_INTERVAL = 30 * 1000;   // 30 seconds

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DraftData {
  startDate: string;
  startHour: string;
  startMinute: string;
  endDate: string;
  endHour: string;
  endMinute: string;
  activityTypeId: string;
  description: string;
  photos: Photo[];
  savedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function combineDatetime(dateStr: string, hour: string, minute: string): Date {
  return new Date(`${dateStr}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`);
}

function toIso(dateStr: string, hour: string, minute: string): string {
  return combineDatetime(dateStr, hour, minute).toISOString();
}

function crossesMidnight(startDate: string, endDate: string): boolean {
  return startDate !== endDate;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: i.toString().padStart(2, '0'),
  value: i.toString().padStart(2, '0'),
}));

const MINUTE_OPTIONS = ['00', '15', '30', '45'].map((m) => ({ label: m, value: m }));

// ─── FormErrors ───────────────────────────────────────────────────────────────

interface FormErrors {
  time?: string;
  photos?: string;
  activityType?: string;
  description?: string;
  location?: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export const OvertimeSubmitScreen: React.FC<MainTabScreenProps<'OvertimeSubmit'>> = () => {
  const navigation = useNavigation<MainTabScreenProps<'OvertimeSubmit'>['navigation']>();
  const dispatch = useAppDispatch();
  const isSubmitting = useAppSelector(selectOvertimeSubmitting);
  const { activityTypes, isLoading: loadingActivityTypes } = useActivityTypes();

  // Datetime state
  const today = toDateOnly(new Date());
  const [startDate, setStartDate] = useState(today);
  const [startHour, setStartHour] = useState('17');
  const [startMinute, setStartMinute] = useState('00');
  const [endDate, setEndDate] = useState(today);
  const [endHour, setEndHour] = useState('20');
  const [endMinute, setEndMinute] = useState('00');

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activityTypeId, setActivityTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveDraftRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const hasRestoredOnMount = useRef(false);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const navigateToList = useCallback(() => {
    navigation.navigate('Overtime' as any);
  }, [navigation]);

  // ─── Reset form to initial state ─────────────────────────────────────────────

  const resetForm = useCallback(() => {
    const todayStr = toDateOnly(new Date());
    setStartDate(todayStr);
    setStartHour('17');
    setStartMinute('00');
    setEndDate(todayStr);
    setEndHour('20');
    setEndMinute('00');
    setPhotos([]);
    setActivityTypeId('');
    setDescription('');
    setLocation(null);
    setErrors({});
    setIsDirty(false);
  }, []);

  // ─── Draft: restore on focus ──────────────────────────────────────────────────
  // useFocusEffect fires on every re-focus (tab navigation keeps component mounted),
  // so the draft prompt appears whenever the screen is revisited.

  const checkDraft = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) { return; }
      const draft: DraftData = JSON.parse(raw);
      if (Date.now() - draft.savedAt > DRAFT_TTL) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        return;
      }
      Alert.alert(
        'Draft Tersimpan',
        'Anda memiliki draft pengajuan lembur. Lanjutkan draft?',
        [
          {
            text: 'Buang',
            style: 'destructive',
            onPress: () => AsyncStorage.removeItem(DRAFT_KEY),
          },
          {
            text: 'Lanjut',
            onPress: () => {
              setStartDate(draft.startDate);
              setStartHour(draft.startHour);
              setStartMinute(draft.startMinute);
              setEndDate(draft.endDate);
              setEndHour(draft.endHour);
              setEndMinute(draft.endMinute);
              setActivityTypeId(draft.activityTypeId);
              setDescription(draft.description);
              setPhotos(draft.photos ?? []);
              setIsDirty(true);
            },
          },
        ],
      );
    } catch {
      // non-critical
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (hasRestoredOnMount.current) { return; }
      hasRestoredOnMount.current = true;
      checkDraft();
      captureLocation();
    }, [checkDraft, captureLocation]),
  );

  // ─── Auto-save ───────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async () => {
    const draft: DraftData = {
      startDate, startHour, startMinute,
      endDate, endHour, endMinute,
      activityTypeId, description,
      photos,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [startDate, startHour, startMinute, endDate, endHour, endMinute, activityTypeId, description, photos]);

  useEffect(() => { saveDraftRef.current = saveDraft; }, [saveDraft]);

  useEffect(() => {
    if (!isDirty) { return; }
    autoSaveIntervalRef.current = setInterval(() => {
      saveDraftRef.current();
    }, AUTO_SAVE_INTERVAL);
    return () => {
      if (autoSaveIntervalRef.current) { clearInterval(autoSaveIntervalRef.current); }
    };
  }, [isDirty]);

  const clearDraft = useCallback(() => {
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  }, []);

  const markDirty = useCallback(() => {
    if (!isDirty) { setIsDirty(true); }
  }, [isDirty]);

  // ─── Leave (Batal) — prompt to save draft, reset form, then navigate ─────────

  const handleLeave = useCallback(() => {
    if (!isDirty) {
      resetForm();
      navigateToList();
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
            clearDraft();
            resetForm();
            navigateToList();
          },
        },
        {
          text: 'Ya',
          onPress: async () => {
            await saveDraft();
            resetForm();
            navigateToList();
          },
        },
      ],
    );
  }, [isDirty, clearDraft, saveDraft, resetForm, navigateToList]);

  // Override header with FieldHomeHeader — standard pattern matching ActivitySubmissionScreen
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader title="Ajukan Lembur" onBack={handleLeave} />
      ),
    });
  }, [navigation, handleLeave]);

  // ─── Discard (trash icon) — confirm, reset form, navigate ────────────────────

  const handleDiscard = useCallback(() => {
    Alert.alert('Buang Draft?', 'Form akan dikosongkan dan draft dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Buang',
        style: 'destructive',
        onPress: () => {
          clearDraft();
          resetForm();
          navigateToList();
        },
      },
    ]);
  }, [clearDraft, resetForm, navigateToList]);

  // ─── Location ────────────────────────────────────────────────────────────────

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
      () => { setIsCapturingLocation(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, []);

  // ─── Photos ──────────────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => [...prev, photo]);
    markDirty();
  }, [markDirty]);

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const startDt = combineDatetime(startDate, startHour, startMinute);
    const endDt = combineDatetime(endDate, endHour, endMinute);

    if (endDt <= startDt) {
      newErrors.time = 'Waktu selesai harus lebih besar dari waktu mulai';
    }
    if (!activityTypeId || !UUID_REGEX.test(activityTypeId)) {
      newErrors.activityType = 'Jenis aktivitas harus dipilih';
    }
    if (!description.trim()) {
      newErrors.description = 'Deskripsi harus diisi';
    }
    if (photos.length === 0) {
      newErrors.photos = 'Minimal 1 foto diperlukan';
    }
    if (!location) {
      newErrors.location = 'GPS lokasi diperlukan. Ketuk "Perbarui GPS" untuk mencoba lagi.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [startDate, startHour, startMinute, endDate, endHour, endMinute, activityTypeId, description, photos, location]);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      // Scroll to top so the user can see the error summary
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    // Belt-and-suspenders: ensure activityTypeId is a valid UUID before sending.
    // This guard also catches stale-Metro-bundle edge-cases.
    if (!UUID_REGEX.test(activityTypeId)) {
      setErrors((prev) => ({ ...prev, activityType: 'Jenis aktivitas harus dipilih' }));
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    dispatch(setSubmitting(true));
    try {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const base64 = await mediaService.convertToBase64(photo);
        photoUrls.push(base64);
      }
      const request: CreateOvertimeRequest = {
        start_datetime: toIso(startDate, startHour, startMinute),
        end_datetime: toIso(endDate, endHour, endMinute),
        activity_type_id: activityTypeId,
        description: description.trim(),
        photo_urls: photoUrls,
        gps_lat: location?.latitude,
        gps_lng: location?.longitude,
      };
      const response = await submitOvertime(request);
      if (response.data) {
        dispatch(addOvertime(response.data));
        clearDraft();
        resetForm();
        Alert.alert('Berhasil', 'Pengajuan lembur berhasil disimpan', [
          { text: 'OK', onPress: navigateToList },
        ]);
      } else if (response.error) {
        dispatch(setError(response.error));
        Alert.alert('Gagal', response.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengirim data';
      dispatch(setError(message));
      Alert.alert('Gagal', message);
    } finally {
      dispatch(setSubmitting(false));
    }
  }, [validateForm, activityTypeId, photos, startDate, startHour, startMinute, endDate, endHour, endMinute, description, location, dispatch, clearDraft, resetForm, navigateToList]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const overnight = crossesMidnight(startDate, endDate);
  const startDateObj = new Date(startDate + 'T00:00:00');
  const endDateObj = new Date(endDate + 'T00:00:00');

  const allActivityTypeOptions = activityTypes
    .slice()
    .sort((a, b) => {
      if (a.name.toLowerCase() === 'lainnya') { return 1; }
      if (b.name.toLowerCase() === 'lainnya') { return -1; }
      return 0;
    })
    .map((t) => ({ label: t.name, value: t.id }));

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
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error summary — visible after a failed submit attempt */}
          {Object.values(errors).some(Boolean) && (
            <View style={styles.errorSummary}>
              <Text style={styles.errorSummaryTitle}>⚠️ Mohon lengkapi data berikut:</Text>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <Text key={i} style={styles.errorSummaryItem}>• {msg}</Text>
              ))}
            </View>
          )}

          {/* Waktu Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>
                📅 WAKTU LEMBUR{' '}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </NBCardHeader>
            <NBCardContent>
              <Text style={styles.label}>Tanggal & Waktu Mulai</Text>
              <NBDatePicker
                value={startDateObj}
                onChange={(date) => { setStartDate(toDateOnly(date)); markDirty(); }}
                mode="date"
              />
              <View style={styles.timeRow}>
                <View style={styles.timeHalf}>
                  <Text style={styles.sublabel}>Jam</Text>
                  <NBSelect
                    value={startHour}
                    onValueChange={(v) => { setStartHour(String(v)); markDirty(); }}
                    options={HOUR_OPTIONS}
                  />
                </View>
                <View style={styles.timeHalf}>
                  <Text style={styles.sublabel}>Menit</Text>
                  <NBSelect
                    value={startMinute}
                    onValueChange={(v) => { setStartMinute(String(v)); markDirty(); }}
                    options={MINUTE_OPTIONS}
                  />
                </View>
              </View>

              <Text style={[styles.label, styles.labelSpacedTop]}>Tanggal & Waktu Selesai</Text>
              <NBDatePicker
                value={endDateObj}
                onChange={(date) => { setEndDate(toDateOnly(date)); markDirty(); }}
                mode="date"
                minimumDate={startDateObj}
              />
              <View style={styles.timeRow}>
                <View style={styles.timeHalf}>
                  <Text style={styles.sublabel}>Jam</Text>
                  <NBSelect
                    value={endHour}
                    onValueChange={(v) => { setEndHour(String(v)); markDirty(); }}
                    options={HOUR_OPTIONS}
                  />
                </View>
                <View style={styles.timeHalf}>
                  <Text style={styles.sublabel}>Menit</Text>
                  <NBSelect
                    value={endMinute}
                    onValueChange={(v) => { setEndMinute(String(v)); markDirty(); }}
                    options={MINUTE_OPTIONS}
                  />
                </View>
              </View>

              {overnight && (
                <View style={styles.overnightBadge}>
                  <MaterialCommunityIcons name="weather-night" size={14} color={nbColors.primary} />
                  <Text style={styles.overnightText}>Lembur melewati tengah malam</Text>
                </View>
              )}
              {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
            </NBCardContent>
          </NBCard>

          {/* Jenis Aktivitas Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>
                🏷️ JENIS AKTIVITAS{' '}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </NBCardHeader>
            <NBCardContent>
              {loadingActivityTypes ? (
                <ActivityIndicator style={styles.activityIndicator} />
              ) : activityTypes.length === 0 ? (
                <Text style={styles.warningText}>
                  ⚠️ Tidak ada jenis aktivitas tersedia untuk peran Anda. Hubungi administrator.
                </Text>
              ) : (
                <NBSelect
                  value={activityTypeId || ''}
                  onValueChange={(v) => { setActivityTypeId(String(v)); markDirty(); }}
                  options={allActivityTypeOptions}
                  placeholder="Pilih jenis aktivitas..."
                  searchable
                  searchPlaceholder="Cari jenis aktivitas..."
                />
              )}
              {errors.activityType && (
                <Text style={styles.errorText}>{errors.activityType}</Text>
              )}
            </NBCardContent>
          </NBCard>

          {/* Deskripsi Card */}
          <NBCardTextInput
            title="📝 Deskripsi"
            required
            value={description}
            onChangeText={(text) => { setDescription(text); markDirty(); }}
            placeholder="Jelaskan aktivitas lembur yang dilakukan..."
            numberOfLines={5}
            error={errors.description}
            style={styles.card}
          />

          {/* Foto Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>
                📸 FOTO BUKTI{' '}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <Text style={styles.sectionSubtitle}>Tambahkan 1-3 foto pekerjaan lembur</Text>
            </NBCardHeader>
            <NBCardContent>
              <PhotoUploader
                photos={photos}
                onAdd={handleAddPhoto}
                onRemove={handleRemovePhoto}
                error={errors.photos}
              />
            </NBCardContent>
          </NBCard>

          {/* Lokasi GPS Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>
                📍 LOKASI GPS{' '}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
            </NBCardHeader>
            <NBCardContent>
              <GPSLocationSection
                location={location}
                isCapturing={isCapturingLocation}
                onRefresh={captureLocation}
                error={errors.location}
              />
            </NBCardContent>
          </NBCard>
        </ScrollView>

        {/* Fixed FAB: Batal | Kirim — matches ActivitySubmissionScreen pattern */}
        <View style={styles.fab}>
          <View style={styles.fabButtonRow}>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title="Batal"
                variant="secondary"
                onPress={handleLeave}
                disabled={isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title={isSubmitting ? 'Mengirim...' : 'Kirim'}
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
          </View>
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
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.md,
  },
  card: {
    marginBottom: nbSpacing.md,
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
  label: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  labelSpacedTop: {
    marginTop: nbSpacing.md,
  },
  sublabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.xs,
  },
  timeHalf: {
    flex: 1,
  },
  overnightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
    marginTop: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.gray[100],
    borderWidth: nbBorders.base,
    borderColor: nbColors.primary,
    borderRadius: nbBorderRadius.sm,
  },
  overnightText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
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
  warningText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.warning,
    marginVertical: nbSpacing.xs,
  },
  fab: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
  fabButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  fabButtonHalf: {
    flex: 1,
  },
});
