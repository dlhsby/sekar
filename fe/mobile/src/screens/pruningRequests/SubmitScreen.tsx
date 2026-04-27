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
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  submitPruningRequest,
  clearError,
} from '../../store/slices/pruningRequestsSlice';
import {
  NBCard,
  NBCardContent,
  NBCardHeader,
  NBTextInput,
  NBButton,
  NBAlert,
  NBBackgroundPattern,
} from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { LocationPickerModal } from '../../components/modals/LocationPickerModal';
import { mediaService, type Photo } from '../../services/media/mediaService';
import {
  requestLocationPermission,
  requestCameraPermission,
} from '../../services/permissions/permissionService';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
} from '../../constants/nbTokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PHOTOS = 1;
const MAX_PHOTOS = 5;
const DRAFT_KEY = 'pruning_request_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SAVE_INTERVAL = 30000; // 30 s

interface DraftShape {
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
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SubmitScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const { isSubmitting, submitStatus, error: pruningError } = useAppSelector(
    (state) => state.pruningRequests,
  );

  // ── Form state ──────────────────────────────────────────────────────────
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

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const rayonName = user?.rayon?.name ?? null;
  const kecamatanName = user?.kecamatan_name ?? null;

  // ── Draft persistence ───────────────────────────────────────────────────
  const formRef = useRef<DraftShape>({
    address: '', treeCount: '', treeHeight: '', treeDiameter: '',
    requesterName: '', requesterPhone: '', rtLeaderName: '', rtLeaderPhone: '',
    notes: '', gpsLat: null, gpsLng: null, timestamp: 0,
  });
  useEffect(() => {
    formRef.current = {
      address, treeCount, treeHeight, treeDiameter,
      requesterName, requesterPhone, rtLeaderName, rtLeaderPhone, notes,
      gpsLat, gpsLng, timestamp: Date.now(),
    };
  }, [address, treeCount, treeHeight, treeDiameter, requesterName,
      requesterPhone, rtLeaderName, rtLeaderPhone, notes, gpsLat, gpsLng]);

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
      photos.length > 0);
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

  // Clear stale Redux error + restore draft whenever the screen gains focus.
  // Prevents the prior session's "Gagal mengirim permohonan" alert from
  // showing before the user has even tapped submit.
  useFocusEffect(
    useCallback(() => {
      dispatch(clearError());
      void restoreDraft();
      return () => {
        // Best-effort save when the screen blurs (back/navigate away).
        if (formRef.current.address.trim() || photos.length > 0) {
          void saveDraftRef.current();
        }
      };
    }, [dispatch, restoreDraft, photos.length]),
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

  // Back-button / header back: prompt to save or discard the draft.
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
            navigation.goBack();
          },
        },
        {
          text: 'Ya',
          onPress: async () => {
            await saveDraftRef.current();
            navigation.goBack();
          },
        },
      ],
    );
  }, [hasContent, navigation, clearDraft]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleLeave}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={{ paddingHorizontal: nbSpacing[3], paddingVertical: nbSpacing[2] }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={nbColors.black} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleLeave]);

  // ── Photo capture ───────────────────────────────────────────────────────
  const handlePickFromCamera = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Batas foto', `Maksimal ${MAX_PHOTOS} foto.`);
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
      Alert.alert('Gagal mengambil foto', e instanceof Error ? e.message : 'Unknown error');
    }
  }, [photos.length]);

  const handlePickFromGallery = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert('Batas foto', `Maksimal ${MAX_PHOTOS} foto.`);
      return;
    }
    try {
      const newPhotos = await mediaService.pickFromGallery(remaining);
      if (newPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      }
    } catch (e) {
      Alert.alert('Gagal memilih foto', e instanceof Error ? e.message : 'Unknown error');
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
    if (!rtLeaderName.trim() || !rtLeaderPhone.trim()) {
      return 'Nama dan nomor HP ketua RT wajib diisi.';
    }
    return null;
  }, [address, gpsLat, gpsLng, photos.length, treeCount, treeHeight, treeDiameter, requesterName, requesterPhone, rtLeaderName, rtLeaderPhone]);

  const handleSubmit = useCallback(async () => {
    setValidationError(null);
    dispatch(clearError());

    const errMsg = validate();
    if (errMsg) {
      setValidationError(errMsg);
      return;
    }

    setSubmitting(true);
    try {
      // S3 upload pipeline lands in Phase 4 polish — for now we send the local
      // device URIs as the photo_keys; the backend stores them as-is in the
      // text[] photo_urls column. Existing seeded rows already use placehold.co
      // URLs the same way, so MyRequestsScreen / RequestDetailScreen render them
      // identically.
      const photoKeys: string[] = photos.map((p) => p.uri);
      const tc = parseInt(treeCount, 10);
      await dispatch(
        submitPruningRequest({
          address: address.trim(),
          lat: gpsLat as number,
          lng: gpsLng as number,
          photo_keys: photoKeys,
          tree_count: tc,
          target_count: tc,
          tree_height_estimate: treeHeight.trim(),
          tree_diameter_estimate: treeDiameter.trim(),
          requester_name: requesterName.trim(),
          requester_phone: digitsOnly(requesterPhone),
          rt_leader_name: rtLeaderName.trim(),
          rt_leader_phone: digitsOnly(rtLeaderPhone),
          notes: notes.trim() || undefined,
        }),
      ).unwrap();

      await clearDraft();
      Alert.alert(
        'Permohonan terkirim',
        'Permohonan pemangkasan berhasil dikirim. Anda akan diberitahu setelah ditinjau.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Perantingan');
            },
          },
        ],
      );
    } catch (e) {
      setValidationError(
        e instanceof Error ? e.message : 'Gagal mengirim permohonan. Coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    validate, photos, dispatch, address, gpsLat, gpsLng, treeCount, treeHeight,
    treeDiameter, requesterName, requesterPhone, rtLeaderName, rtLeaderPhone,
    notes, navigation, clearDraft,
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
              <NBText variant="h3">Lokasi</NBText>
            </NBCardHeader>
            <NBCardContent>
              {/* Rayon + Kecamatan presets */}
              <View style={styles.presetRow}>
                <View style={styles.presetItem}>
                  <NBText variant="caption" style={styles.presetLabel}>Rayon</NBText>
                  <NBText variant="body">{rayonName ?? '—'}</NBText>
                </View>
                <View style={styles.presetItem}>
                  <NBText variant="caption" style={styles.presetLabel}>Kecamatan</NBText>
                  <NBText variant="body">{kecamatanName ?? '—'}</NBText>
                </View>
              </View>

              {/* Street free text */}
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Jalan / Alamat Lengkap"
                  placeholder="Contoh: Jl. Raya Darmo No. 123"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={2}
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
              <NBText variant="h3">Foto Pohon</NBText>
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
                  label="Jumlah Pohon"
                  placeholder="Contoh: 3"
                  value={treeCount}
                  onChangeText={(v) => setTreeCount(digitsOnly(v))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Tinggi Pohon (Perkiraan)"
                  placeholder="Contoh: 5-7 meter"
                  value={treeHeight}
                  onChangeText={setTreeHeight}
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Diameter Pohon (Perkiraan)"
                  placeholder="Contoh: 30-50 cm"
                  value={treeDiameter}
                  onChangeText={setTreeDiameter}
                />
              </View>
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
                  label="Nama Pemohon"
                  placeholder="Nama lengkap"
                  value={requesterName}
                  onChangeText={setRequesterName}
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nomor HP Pemohon"
                  placeholder="08xxxxxxxxxx"
                  value={requesterPhone}
                  onChangeText={(v) => setRequesterPhone(digitsOnly(v))}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.divider} />

              <NBText variant="body-sm" style={styles.subHeading}>Ketua RT</NBText>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nama Ketua RT"
                  placeholder="Nama lengkap"
                  value={rtLeaderName}
                  onChangeText={setRtLeaderName}
                />
              </View>
              <View style={styles.fieldGroup}>
                <NBTextInput
                  label="Nomor HP Ketua RT"
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
                numberOfLines={3}
              />
            </NBCardContent>
          </NBCard>

          {/* ── Validation / API errors ─────────────────────────────── */}
          {validationError ? (
            <View style={styles.errorWrap}>
              <NBAlert variant="danger" title="Periksa kembali" message={validationError} />
            </View>
          ) : null}
          {pruningError && !validationError ? (
            <View style={styles.errorWrap}>
              <NBAlert variant="danger" title="Gagal mengirim permohonan" message={pruningError} />
            </View>
          ) : null}

          {/* ── Submit ─────────────────────────────────────────────── */}
          <View style={styles.submitWrap}>
            <NBButton
              label={isBusy ? 'Mengirim…' : 'Kirim Permohonan'}
              leftIcon="send"
              variant="primary"
              onPress={handleSubmit}
              disabled={isBusy}
              loading={isBusy}
              testID="perantingan-submit-cta"
            />
          </View>
        </ScrollView>
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
    paddingBottom: nbSpacing[12],
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
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
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
  gpsRefresh: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.white,
    marginLeft: nbSpacing[2],
  },
  helper: {
    color: nbColors.gray600,
    marginTop: nbSpacing[1],
  },
  subHeading: {
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.semibold,
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
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
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
  errorWrap: {
    marginBottom: nbSpacing[4],
  },
  submitWrap: {
    marginTop: nbSpacing[2],
  },
});
