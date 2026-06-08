/**
 * Submit Pruning Request Screen — staff_kecamatan redesigned form.
 * Phase 3 Apr 27 redesign: replaces the previous 5-step wizard with a single
 * scrollable card-based form, mirroring TaskCreateScreen's visual rhythm.
 *
 * Cards rendered top-to-bottom:
 *   1. Lokasi — auto-fetched GPS (with refresh button), preset rayon + kecamatan
 *      from the logged-in user profile, free-text street address.
 *   2. Foto — camera + gallery, min 1 max 5.
 *   3. Detail Pohon — jumlah pohon (number), tinggi pohon (free text),
 *      diameter pohon (free text).
 *   4. Kontak — pemohon name + phone, ketua RT name + phone (all free text).
 *   5. Catatan (optional) — free-text notes for the admin reviewer.
 *
 * On submit the mobile validates that GPS, ≥1 photo, address, and tree_count are
 * present and dispatches `submitPruningRequest`. The backend auto-derives
 * kecamatan_name + rayon_id from the submitter's profile.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { FieldHomeHeader } from '../../components/navigation/FieldHomeHeader';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  submitPruningRequest,
  clearError,
} from '../../store/slices/pruningRequestsSlice';
import { fetchCapacity } from '../../store/slices/serviceCapacitySlice';
import { WeekPickerModal } from './components/WeekPickerModal';
import type { PickedWeek } from './components/WeekPicker';
import { getISOWeek } from '../../utils/dateUtils';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBTextInput,
  NBSelect,
  NBButton,
  NBBackgroundPattern,
  NBToast,
} from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { LocationPickerModal } from '../../components/modals/LocationPickerModal';
import { mediaService, type Photo } from '../../services/media/mediaService';
import { getRayons } from '../../services/api';
import {
  requestLocationPermission,
  requestCameraPermission,
} from '../../services/permissions/permissionService';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;
const DRAFT_KEY = 'pruning_request_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SAVE_INTERVAL = 30000; // 30 s

interface DraftShape {
  rayonId: string;
  kecamatanName: string;
  address: string;
  treeCount: string;
  treeHeight: string;
  treeDiameter: string;
  requesterName: string;
  requesterPhone: string;
  rtLeaderName: string;
  rtLeaderPhone: string;
  notes: string;
  gpsLat: number | null;
  gpsLng: number | null;
  expectedWeek: PickedWeek | null;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

// Indonesian mobile format: starts with 08, total 10–14 digits.
function isValidIndoPhone(s: string): boolean {
  const d = digitsOnly(s);
  return /^08\d{8,12}$/.test(d);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SubmitScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const { isSubmitting } = useAppSelector((state) => state.pruningRequests);

  // ── Form state ──────────────────────────────────────────────────────────
  const [rayonId, setRayonId] = useState<string>(user?.rayon_id ?? '');
  const [kecamatanName, setKecamatanName] = useState<string>(
    user?.kecamatan_name ?? '',
  );
  const [rayons, setRayons] = useState<Array<{ id: string; name: string }>>([]);
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [treeCount, setTreeCount] = useState('');
  const [treeHeight, setTreeHeight] = useState('');
  const [treeDiameter, setTreeDiameter] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [rtLeaderName, setRtLeaderName] = useState('');
  const [rtLeaderPhone, setRtLeaderPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ADR-035 amendment 2026-05-01: kecamatan picks an ISO week, not a day.
  // The concrete day is decided later by admin_data at assign-to-task.
  const [expectedWeek, setExpectedWeek] = useState<PickedWeek | null>(null);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Capacity calendar state — populated by fetchCapacity for the user's rayon.
  // Defensive against test stores that don't register the serviceCapacity slice.
  const capacityRows = useAppSelector((state) => {
    const slice = (state as any).serviceCapacity;
    if (!slice || !rayonId) {
      return [];
    }
    return slice.calendarByRayon?.[rayonId] ?? [];
  });
  const capacityLoading = useAppSelector(
    (state) => Boolean((state as any).serviceCapacity?.loading),
  );

  // Load all rayons so the user can override their default in the form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRayons();
        if (!cancelled && res.data) {
          setRayons(res.data.map((r: any) => ({ id: r.id, name: r.name })));
        }
      } catch {
        /* non-critical — fall back to user.rayon only */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Draft persistence ───────────────────────────────────────────────────
  const formRef = useRef<DraftShape>({
    rayonId: '', kecamatanName: '',
    address: '', treeCount: '', treeHeight: '', treeDiameter: '',
    requesterName: '', requesterPhone: '', rtLeaderName: '', rtLeaderPhone: '',
    notes: '', gpsLat: null, gpsLng: null, expectedWeek: null, timestamp: 0,
  });
  useEffect(() => {
    formRef.current = {
      rayonId, kecamatanName,
      address, treeCount, treeHeight, treeDiameter,
      requesterName, requesterPhone, rtLeaderName, rtLeaderPhone, notes,
      gpsLat, gpsLng, expectedWeek, timestamp: Date.now(),
    };
  }, [rayonId, kecamatanName, address, treeCount, treeHeight, treeDiameter,
      requesterName, requesterPhone, rtLeaderName, rtLeaderPhone, notes,
      gpsLat, gpsLng, expectedWeek]);

  const saveDraft = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(formRef.current));
    } catch {
      /* silent — draft is best-effort */
    }
  }, []);
  const saveDraftRef = useRef(saveDraft);
  useEffect(() => { saveDraftRef.current = saveDraft; }, [saveDraft]);

  const clearDraft = useCallback(async () => {
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch { /* silent */ }
  }, []);

  const hasContent = useCallback((): boolean => {
    const f = formRef.current;
    return !!(f.address.trim() || f.treeCount.trim() || f.treeHeight.trim() ||
      f.treeDiameter.trim() || f.requesterName.trim() || f.requesterPhone.trim() ||
      f.rtLeaderName.trim() || f.rtLeaderPhone.trim() || f.notes.trim() ||
      !!f.expectedWeek || photos.length > 0);
    // Note: rayonId/kecamatanName are pre-filled from the user profile and
    // intentionally don't count as "content" — leaving the screen with only
    // those defaults shouldn't trigger the draft prompt.
  }, [photos.length]);

  const restoreDraft = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DraftShape;
      if (!draft.timestamp || Date.now() - draft.timestamp >= DRAFT_TTL) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        return;
      }
      Alert.alert(
        'Draft Ditemukan',
        'Anda memiliki draft permohonan yang belum terkirim. Lanjutkan?',
        [
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: () => { void AsyncStorage.removeItem(DRAFT_KEY); },
          },
          {
            text: 'Lanjutkan',
            onPress: () => {
              if (draft.rayonId) { setRayonId(draft.rayonId); }
              if (draft.kecamatanName) { setKecamatanName(draft.kecamatanName); }
              setAddress(draft.address ?? '');
              setTreeCount(draft.treeCount ?? '');
              setTreeHeight(draft.treeHeight ?? '');
              setTreeDiameter(draft.treeDiameter ?? '');
              setRequesterName(draft.requesterName ?? '');
              setRequesterPhone(draft.requesterPhone ?? '');
              setRtLeaderName(draft.rtLeaderName ?? '');
              setRtLeaderPhone(draft.rtLeaderPhone ?? '');
              setNotes(draft.notes ?? '');
              if (draft.gpsLat != null && draft.gpsLng != null) {
                setGpsLat(draft.gpsLat);
                setGpsLng(draft.gpsLng);
              }
              if (draft.expectedWeek) {
                setExpectedWeek(draft.expectedWeek);
              }
              void AsyncStorage.removeItem(DRAFT_KEY);
            },
          },
        ],
      );
    } catch {
      /* silent */
    }
  }, []);

  // ── GPS capture ─────────────────────────────────────────────────────────
  const captureLocation = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const perm = await requestLocationPermission();
      if (perm.status !== 'granted') {
        setGpsError(
          'Izin lokasi ditolak. Aktifkan izin lokasi di Pengaturan untuk menangkap koordinat GPS otomatis.',
        );
        setGpsLoading(false);
        return;
      }
      Geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
          setGpsAccuracy(pos.coords.accuracy);
          setGpsLoading(false);
        },
        (err) => {
          setGpsError(`Gagal mendapatkan lokasi: ${err.message}`);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'Gagal menangkap lokasi GPS');
      setGpsLoading(false);
    }
  }, []);

  // Auto-capture on mount.
  useEffect(() => {
    void captureLocation();
  }, [captureLocation]);

  // Reset form to a clean baseline (used after submit + after Batal/discard).
  const resetForm = useCallback(() => {
    setAddress('');
    setTreeCount('');
    setTreeHeight('');
    setTreeDiameter('');
    setRequesterName('');
    setRequesterPhone('');
    setRtLeaderName('');
    setRtLeaderPhone('');
    setNotes('');
    setPhotos([]);
    setExpectedWeek(null);
  }, []);

  // Fetch the rayon's 8-week capacity calendar once rayonId is known. The slice
  // is keyed by rayonId so revisits hit cached data; the AvailabilityModal
  // reads `calendarByRayon[rayonId]`.
  useEffect(() => {
    if (!rayonId) {
      return;
    }
    const today = new Date();
    const { year, week } = getISOWeek(today);
    void dispatch(
      fetchCapacity({
        rayonId,
        year,
        fromWeek: week,
        toWeek: Math.min(week + 7, 53),
        serviceType: 'pruning',
      }),
    );
  }, [dispatch, rayonId]);

  // SubmitScreen is registered as a Tab.Screen (hidden tab) — `beforeRemove`
  // does NOT fire on tab navigators, so we mirror TaskCreate's manual
  // `handleLeave` pattern. Wired to both the FieldHomeHeader back arrow
  // (via navigation.setOptions) and the Batal button.
  const handleLeave = useCallback(() => {
    if (!hasContent()) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Simpan Draft?',
      'Anda memiliki perubahan yang belum dikirim.',
      [
        {
          text: 'Tidak',
          style: 'destructive',
          onPress: async () => {
            await clearDraft();
            resetForm();
            navigation.goBack();
          },
        },
        {
          text: 'Ya',
          onPress: async () => {
            await saveDraftRef.current();
            resetForm();
            navigation.goBack();
          },
        },
      ],
    );
  }, [hasContent, clearDraft, resetForm, navigation]);

  // Override the header back arrow to route through handleLeave.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <FieldHomeHeader title="Buat Permohonan Perantingan" onBack={handleLeave} />
      ),
    });
  }, [navigation, handleLeave]);

  // Clear stale Redux error + restore draft on every focus. Mirrors
  // TaskCreate so the prompt fires whenever the user returns to a saved draft
  // (which is also why we no longer save-on-blur — that re-trigged the prompt
  // after every camera intent).
  useFocusEffect(
    useCallback(() => {
      dispatch(clearError());
      void restoreDraft();
    }, [dispatch, restoreDraft]),
  );

  // Auto-save draft every 30s while there's content.
  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current.address.trim() || formRef.current.treeCount.trim()) {
        void saveDraftRef.current();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ── Photo capture ───────────────────────────────────────────────────────
  const handlePickFromCamera = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      NBToast.show({ level: 'warning', title: 'Batas foto', body: `Maksimal ${MAX_PHOTOS} foto.` });
      return;
    }
    const perm = await requestCameraPermission();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Izin kamera ditolak',
        'Aktifkan izin kamera di Pengaturan untuk mengambil foto.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Pengaturan', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    try {
      const photo = await mediaService.capturePhoto();
      if (photo) {
        setPhotos((prev) => [...prev, photo]);
      }
    } catch (e) {
      NBToast.show({ level: 'danger', title: 'Gagal mengambil foto', body: e instanceof Error ? e.message : 'Unknown error' });
    }
  }, [photos.length]);

  const handlePickFromGallery = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      NBToast.show({ level: 'warning', title: 'Batas foto', body: `Maksimal ${MAX_PHOTOS} foto.` });
      return;
    }
    try {
      const newPhotos = await mediaService.pickFromGallery(remaining);
      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      }
    } catch (e) {
      NBToast.show({ level: 'danger', title: 'Gagal memilih foto', body: e instanceof Error ? e.message : 'Unknown error' });
    }
  }, [photos.length]);

  const handleRemovePhoto = useCallback((idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!address.trim()) {
      return 'Alamat (jalan) wajib diisi.';
    }
    // Mirror backend @MinLength(5) on address so the user gets feedback
    // BEFORE submit instead of a generic 400 from the server.
    if (address.trim().length < 5) {
      return 'Alamat minimal 5 karakter.';
    }
    if (address.trim().length > 500) {
      return 'Alamat maksimal 500 karakter.';
    }
    if (gpsLat == null || gpsLng == null) {
      return 'Koordinat GPS belum terdeteksi. Tekan tombol perbarui pada kartu Lokasi.';
    }
    if (photos.length < MIN_PHOTOS) {
      return `Minimal ${MIN_PHOTOS} foto diperlukan.`;
    }
    const tc = parseInt(treeCount, 10);
    if (!treeCount || isNaN(tc) || tc < 1) {
      return 'Jumlah pohon harus diisi dengan angka minimal 1.';
    }
    if (!treeHeight.trim()) {
      return 'Tinggi pohon (perkiraan) wajib diisi.';
    }
    if (!treeDiameter.trim()) {
      return 'Diameter pohon (perkiraan) wajib diisi.';
    }
    if (!requesterName.trim() || !requesterPhone.trim()) {
      return 'Nama dan nomor HP pemohon wajib diisi.';
    }
    if (!isValidIndoPhone(requesterPhone)) {
      return 'Nomor HP pemohon harus diawali 08 dan 10–14 digit.';
    }
    if (!rtLeaderName.trim() || !rtLeaderPhone.trim()) {
      return 'Nama dan nomor HP ketua RT/RW wajib diisi.';
    }
    if (!isValidIndoPhone(rtLeaderPhone)) {
      return 'Nomor HP ketua RT/RW harus diawali 08 dan 10–14 digit.';
    }
    return null;
  }, [address, gpsLat, gpsLng, photos.length, treeCount, treeHeight, treeDiameter, requesterName, requesterPhone, rtLeaderName, rtLeaderPhone]);

  const handleSubmit = useCallback(async () => {
    dispatch(clearError());

    const errMsg = validate();
    if (errMsg) {
      NBToast.show({
        level: 'warning',
        title: 'Periksa kembali',
        body: errMsg,
      });
      return;
    }

    setSubmitting(true);
    try {
      // May 9, 2026 — switch to base64 data-URI strings (mirrors
      // TaskCompleteScreen / OvertimeSubmitScreen / ClockInOutScreen).
      // Local `file://` URIs from the previous implementation were unreadable
      // on any other device, so admin_data reviewers couldn't see the photos.
      // The S3 pipeline still lands in Phase 4 polish; until then base64
      // payloads round-trip safely through the `photo_urls` text[] column and
      // RN's <Image source={{uri: dataUri}}> renders them transparently.
      const photoKeys: string[] = [];
      for (const photo of photos) {
        photoKeys.push(await mediaService.convertToBase64(photo));
      }
      const tc = parseInt(treeCount, 10);
      await dispatch(
        submitPruningRequest({
          address: address.trim(),
          lat: gpsLat as number,
          lng: gpsLng as number,
          photo_keys: photoKeys,
          rayon_id: rayonId || undefined,
          kecamatan_name: kecamatanName.trim() || undefined,
          tree_count: tc,
          target_count: tc,
          tree_height_estimate: treeHeight.trim(),
          tree_diameter_estimate: treeDiameter.trim(),
          requester_name: requesterName.trim(),
          requester_phone: digitsOnly(requesterPhone),
          rt_leader_name: rtLeaderName.trim(),
          rt_leader_phone: digitsOnly(rtLeaderPhone),
          notes: notes.trim() || undefined,
          // ADR-035 amendment 2026-05-01 + ADR-038: send the week pair, not a
          // specific date. Backend stores the week and admin_data picks the
          // concrete day at assign-to-task.
          expected_year: expectedWeek?.year,
          expected_iso_week: expectedWeek?.isoWeek,
        }),
      ).unwrap();

      await clearDraft();
      NBToast.show({
        level: 'success',
        title: 'Permohonan terkirim',
        body: 'Anda akan diberitahu setelah ditinjau.',
      });
      // Reset form so re-entering the screen starts clean (no draft prompt).
      resetForm();
      navigation.navigate('Perantingan');
    } catch (e) {
      // The thunk rejects with rejectWithValue, so `.unwrap()` re-throws
      // the payload directly (not an Error). Accept multiple shapes so
      // backend validation messages surface instead of "Coba lagi".
      const body =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : (e as { message?: string; error?: string })?.message ??
              (e as { error?: string })?.error ??
              'Coba lagi.';
      NBToast.show({
        level: 'danger',
        title: 'Gagal mengirim permohonan',
        body,
        persistent: true,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    validate, photos, dispatch, address, gpsLat, gpsLng, rayonId, kecamatanName,
    treeCount, treeHeight, treeDiameter, requesterName, requesterPhone,
    rtLeaderName, rtLeaderPhone, notes, expectedWeek, navigation, clearDraft, resetForm,
  ]);

  const isBusy = submitting || isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <NBBackgroundPattern>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Lokasi ─────────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3">Lokasi *</NBText>
            </NBCardHeader>
            <NBCardContent>
              {/* Rayon + Kecamatan — pre-filled from logged-in user, rendered
                  as disabled NBSelects (matches the "Area Saya" pattern in the
                  tugas filter). Stacked vertically per UX review May 9, 2026.
                  staff_kecamatan users are pinned to a single kecamatan; admin
                  callers keep the selectable behavior. Wrapped in <NBText> for
                  typography consistency (Phase 4 M3c Stage 5). */}
              {user?.role === 'staff_kecamatan' ? (
                <>
                  <View style={styles.fieldGroup} testID="perantingan-rayon-readonly">
                    <NBSelect
                      label="Rayon"
                      value={rayonId || 'unset'}
                      onValueChange={() => {}}
                      options={[{
                        label: rayons.find((r) => r.id === rayonId)?.name ?? 'Belum diatur',
                        value: rayonId || 'unset',
                      }]}
                      disabled
                    />
                  </View>
                  <View style={styles.fieldGroup} testID="perantingan-kecamatan-readonly">
                    <NBSelect
                      label="Kecamatan"
                      value={kecamatanName || 'unset'}
                      onValueChange={() => {}}
                      options={[{
                        label: kecamatanName || 'Belum diatur',
                        value: kecamatanName || 'unset',
                      }]}
                      disabled
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.fieldGroup}>
                    <NBSelect
                      label="Rayon"
                      value={rayonId || (rayons[0]?.id ?? '')}
                      onValueChange={(v) => setRayonId(String(v))}
                      options={rayons.map((r) => ({ label: r.name, value: r.id }))}
                      searchable
                      disabled={rayons.length === 0}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <NBTextInput
                      label="Kecamatan"
                      placeholder="Contoh: Tegalsari"
                      value={kecamatanName}
                      onChangeText={setKecamatanName}
                    />
                  </View>
                </>
              )}

              {/* Alamat / Jalan — multiline text-area (matches deskripsi style) */}
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Alamat Lengkap *"
                  placeholder="Contoh: Jl. Raya Darmo No. 123, RT 02 / RW 05"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={5}
                  inputStyle={styles.addressTextArea}
                />
              </View>

              {/* GPS auto-capture display + refresh */}
              <View style={styles.gpsRow}>
                <View style={styles.gpsValues}>
                  <NBText variant="caption" style={styles.presetLabel}>Koordinat GPS</NBText>
                  {gpsLat != null && gpsLng != null ? (
                    <NBText variant="body-sm">{gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
                      {gpsAccuracy ? ` (±${Math.round(gpsAccuracy)} m)` : ''}</NBText>
                  ) : (
                    <NBText variant="body-sm" style={{ color: nbColors.gray600 }}>{gpsLoading ? 'Mendeteksi…' : 'Belum tersedia'}</NBText>
                  )}
                </View>
                <TouchableOpacity
                  onPress={captureLocation}
                  disabled={gpsLoading}
                  style={styles.gpsRefresh}
                  accessibilityRole="button"
                  accessibilityLabel="Perbarui lokasi GPS"
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color={nbColors.black} />
                  ) : (
                    <MaterialCommunityIcons name="refresh" size={22} color={nbColors.black} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Map-pick — drop or drag pin like WhatsApp share-location */}
              <View style={{ marginTop: nbSpacing[2] }}>
                <NBButton
                  title="Pilih di Peta"
                  leftIcon="map-marker-radius"
                  variant="secondary"
                  onPress={() => setPickerOpen(true)}
                  testID="perantingan-pick-on-map"
                />
              </View>
              {gpsError ? (
                <NBText variant="body-sm" style={{ color: nbColors.danger, marginTop: nbSpacing[2] }}>
                  {gpsError}
                </NBText>
              ) : null}
            </NBCardContent>
          </NBCard>

          {/* ── Foto ───────────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3">Foto Pohon *</NBText>
              <NBText variant="body-sm" style={styles.helper}>Minimal {MIN_PHOTOS}, maksimal {MAX_PHOTOS} foto.</NBText>
            </NBCardHeader>
            <NBCardContent>
              {photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.map((p, idx) => (
                    <View key={`${p.uri}-${idx}`} style={styles.photoWrap}>
                      <Image source={{ uri: p.uri }} style={styles.photo} />
                      <TouchableOpacity
                        onPress={() => handleRemovePhoto(idx)}
                        style={styles.photoRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`Hapus foto ${idx + 1}`}
                      >
                        <MaterialCommunityIcons name="close" size={16} color={nbColors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <NBText variant="body-sm" style={{ color: nbColors.gray600, marginBottom: nbSpacing[3] }}>
                  Belum ada foto. Ambil dari kamera atau pilih dari galeri.
                </NBText>
              )}

              <View style={styles.photoActions}>
                <NBButton
                  label="Kamera"
                  leftIcon="camera"
                  variant="secondary"
                  onPress={handlePickFromCamera}
                  disabled={photos.length >= MAX_PHOTOS || isBusy}
                  style={{ flex: 1 }}
                />
                <NBButton
                  label="Galeri"
                  leftIcon="image-multiple"
                  variant="secondary"
                  onPress={handlePickFromGallery}
                  disabled={photos.length >= MAX_PHOTOS || isBusy}
                  style={{ flex: 1 }}
                />
              </View>
            </NBCardContent>
          </NBCard>

          {/* ── Detail Pohon ───────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3">Detail Pohon</NBText>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Jumlah Pohon *"
                  placeholder="Contoh: 3"
                  value={treeCount}
                  onChangeText={(v) => setTreeCount(digitsOnly(v))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Tinggi Pohon (tertinggi atau rata-rata, meter) *"
                  placeholder="Contoh: 5"
                  value={treeHeight}
                  onChangeText={(v) => setTreeHeight(digitsOnly(v))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Diameter Pohon (tertinggi atau rata-rata, cm) *"
                  placeholder="Contoh: 30"
                  value={treeDiameter}
                  onChangeText={(v) => setTreeDiameter(digitsOnly(v))}
                  keyboardType="number-pad"
                />
              </View>
            </NBCardContent>
          </NBCard>

          {/* ── Minggu Preferensi ─────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3">Minggu Preferensi (Opsional)</NBText>
              <NBText variant="body-sm" style={styles.helper}>
                Pilih minggu yang Anda inginkan. Admin Rayon akan menentukan tanggal pasti sesuai kapasitas tim. Indikator hari pada setiap kartu hanya gambaran ketersediaan minggu tersebut.
              </NBText>
            </NBCardHeader>
            <NBCardContent>
              <TouchableOpacity
                onPress={() => setWeekPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Pilih minggu preferensi"
                style={styles.dateRow}
                testID="perantingan-pick-week"
              >
                <View style={{ flex: 1 }}>
                  <NBText variant="caption" style={styles.presetLabel}>Minggu</NBText>
                  <NBText variant="body">
                    {expectedWeek
                      ? `Minggu ke-${expectedWeek.isoWeek}, ${expectedWeek.year}`
                      : 'Pilih minggu…'}
                  </NBText>
                </View>
                <MaterialCommunityIcons name="calendar-week" size={22} color={nbColors.black} />
              </TouchableOpacity>
              <NBText
                variant="body-sm"
                style={[styles.helper, { marginTop: nbSpacing[2] }] as any}
              >
                🟢 tersedia · 🟡 hampir penuh · 🔴 penuh · ⚪ belum diatur
              </NBText>
            </NBCardContent>
          </NBCard>

          {/* ── Kontak ─────────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3">Kontak</NBText>
              <NBText variant="body-sm" style={styles.helper}>Pemohon dan ketua RT setempat (untuk verifikasi lapangan).</NBText>
            </NBCardHeader>
            <NBCardContent>
              <NBText variant="body-sm" style={styles.subHeading}>Pemohon</NBText>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nama Pemohon *"
                  placeholder="Nama lengkap"
                  value={requesterName}
                  onChangeText={setRequesterName}
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nomor HP Pemohon *"
                  placeholder="08xxxxxxxxxx"
                  value={requesterPhone}
                  onChangeText={(v) => setRequesterPhone(digitsOnly(v))}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.divider} />

              <NBText variant="body-sm" style={styles.subHeading}>Ketua RT/RW</NBText>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nama Ketua RT/RW *"
                  placeholder="Nama lengkap"
                  value={rtLeaderName}
                  onChangeText={setRtLeaderName}
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nomor HP Ketua RT/RW *"
                  placeholder="08xxxxxxxxxx"
                  value={rtLeaderPhone}
                  onChangeText={(v) => setRtLeaderPhone(digitsOnly(v))}
                  keyboardType="phone-pad"
                />
              </View>
            </NBCardContent>
          </NBCard>

          {/* ── Catatan ────────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="h3">Catatan (Opsional)</NBText>
            </NBCardHeader>
            <NBCardContent>
              <NBTextInput
                placeholder="Catatan tambahan untuk admin reviewer"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={5}
                inputStyle={styles.addressTextArea}
              />
            </NBCardContent>
          </NBCard>

          {/* Validation + API errors are surfaced via NBToast — no inline alert. */}
        </ScrollView>

        {/* Fixed footer — mirrors TaskCreate / ActivitySubmission pattern */}
        <View style={styles.fab}>
          <View style={styles.fabButtonRow}>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title="Batal"
                variant="secondary"
                onPress={handleLeave}
                disabled={isBusy}
                fullWidth
                size="lg"
              />
            </View>
            <View style={styles.fabButtonHalf}>
              <NBButton
                title={isBusy ? 'Mengirim…' : 'Kirim'}
                onPress={handleSubmit}
                loading={isBusy}
                disabled={isBusy}
                fullWidth
                size="lg"
                testID="perantingan-submit-cta"
              />
            </View>
          </View>
        </View>
      </NBBackgroundPattern>

      <LocationPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initial={gpsLat != null && gpsLng != null ? { lat: gpsLat, lng: gpsLng } : null}
        onConfirm={({ lat, lng }) => {
          setGpsLat(lat);
          setGpsLng(lng);
          // Picked manually — clear any GPS error from earlier auto-capture.
          setGpsError(null);
          setGpsAccuracy(null);
        }}
      />

      <WeekPickerModal
        visible={weekPickerOpen}
        onClose={() => setWeekPickerOpen(false)}
        rows={capacityRows}
        selected={expectedWeek}
        onSelect={(w) => setExpectedWeek(w)}
        loading={capacityLoading}
      />
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
  fab: {
    paddingHorizontal: nbSpacing[4],
    paddingVertical: nbSpacing[3],
  },
  fabButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing[2],
  },
  fabButtonHalf: {
    flex: 1,
  },
  card: {
    marginBottom: nbSpacing[4],
  },
  presetRow: {
    flexDirection: 'row',
    gap: nbSpacing[3],
    marginBottom: nbSpacing[3],
  },
  presetItem: {
    flex: 1,
    padding: nbSpacing[3],
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.bgSurface,
  },
  presetLabel: {
    color: nbColors.gray600,
    textTransform: 'uppercase',
    marginBottom: nbSpacing[1],
  },
  fieldGroup: {
    marginBottom: nbSpacing[3],
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing[2],
  },
  gpsValues: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing[3],
    paddingHorizontal: nbSpacing[3],
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    gap: nbSpacing[2],
  },
  gpsRefresh: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
    marginLeft: nbSpacing[2],
  },
  helper: {
    color: nbColors.gray600,
    marginTop: nbSpacing[1],
  },
  subHeading: {
    color: nbColors.black,
    fontWeight: '600',
    marginTop: nbSpacing[2],
    marginBottom: nbSpacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: nbColors.gray300,
    marginVertical: nbSpacing[3],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing[2],
    marginBottom: nbSpacing[3],
  },
  photoWrap: {
    width: 80,
    height: 80,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.gray200,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: nbSpacing[3],
  },
  addressTextArea: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: nbSpacing[2],
  },
});
