/**
 * Pruning Request Detail Screen
 * Phase 3 — read-only view of a submitted permohonan, redesigned in Round 6
 * to mirror ActivityDetailScreen's NBCardHeader / sectionTitle / infoRow
 * pattern so the staff_kecamatan flow visually matches aktivitas/tugas.
 *
 * Cards:
 *   1. Status (with NBBadge + reference code + submitted-on)
 *   2. Lokasi (alamat + GPS coordinate, kecamatan/rayon when present)
 *   3. Detail Pohon (jumlah, tinggi, diameter, tanggal harapan)
 *   4. Kontak (pemohon + ketua RT)
 *   5. Catatan
 *   6. Foto (horizontal scroll, tap to enlarge)
 *   7. Hasil Review (only after reviewedAt)
 *   8. Tugas Terkait (only after converted)
 *   9. Aksi Admin (admin reviewers only)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchPruningRequestById,
  reviewPruningRequest,
  cancelPruningRequest,
} from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBBadge,
  NBButton,
  NBAlert,
  NBModal,
} from '../../components/nb';
import { ConvertToTaskSheet } from '../../components/admin/ConvertToTaskSheet';
import { RescheduleSheet } from './components/RescheduleSheet';
import { LocationMapModal } from '../../components/modals/LocationMapModal';
import { NBToast } from '../../components/nb/NBToast';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import {
  getPruningRequestStatusColor,
  getPruningRequestStatusLabel,
} from '../../utils/statusHelpers';
import { useUserRole } from '../../hooks/useUserRole';

type DetailScreenProps = NativeStackScreenProps<any, 'PruningDetail'>;

const ADMIN_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

const ACTIONABLE_STATUSES = ['submitted', 'under_review'];
const RESCHEDULABLE_STATUSES = ['submitted', 'under_review', 'approved'];

function formatGps(lat: unknown, lng: unknown): string {
  if (lat == null || lng == null) {
    return '—';
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (Number.isNaN(nLat) || Number.isNaN(nLng)) {
    return '—';
  }
  return `${nLat.toFixed(6)}, ${nLng.toFixed(6)}`;
}

export function RequestDetailScreen(props: DetailScreenProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { requestId, adminMode = false } = props.route.params;
  const userRole = useUserRole();

  const { byId, isLoading, error, reviewingId } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const request = byId[requestId] || null;

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [convertSheetVisible, setConvertSheetVisible] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const canAdmin = useMemo(
    () => adminMode && userRole != null && ADMIN_ROLES.includes(userRole),
    [adminMode, userRole],
  );

  useEffect(() => {
    if (!request && requestId) {
      dispatch(fetchPruningRequestById(requestId));
    }
  }, [requestId, request, dispatch]);

  const handlePhotoPress = useCallback((photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setPhotoModalVisible(true);
  }, []);

  const handleViewTask = useCallback(() => {
    if (request?.convertedTaskId) {
      navigation.navigate('TaskDetail', { taskId: request.convertedTaskId });
    }
  }, [request?.convertedTaskId, navigation]);

  const handleCancel = useCallback(() => {
    if (!request) return;
    Alert.alert(
      'Batalkan Permohonan',
      'Apakah Anda yakin ingin membatalkan permohonan ini? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(cancelPruningRequest({ id: request.id })).unwrap();
              NBToast.show({
                level: 'success',
                title: 'Permohonan dibatalkan',
                body: request.referenceCode || '',
              });
              dispatch(fetchPruningRequestById(request.id));
            } catch (e) {
              NBToast.show({
                level: 'danger',
                title: 'Gagal membatalkan',
                body: e instanceof Error ? e.message : 'Coba lagi.',
              });
            }
          },
        },
      ],
    );
  }, [dispatch, request]);

  const authUserId = useAppSelector((s) => s.auth.user?.id);
  const canCancel = useMemo(() => {
    if (!request) return false;
    if (request.status === 'cancelled' || request.status === 'done') return false;
    const isSubmitter = !!authUserId && request.submittedBy === authUserId;
    return isSubmitter || canAdmin;
  }, [request, authUserId, canAdmin]);

  const handleReview = useCallback(
    (decision: 'approve' | 'reject') => {
      setReviewModalVisible(false);
      dispatch(reviewPruningRequest({ id: requestId, decision }))
        .unwrap()
        .then(() => {
          NBToast.show({
            level: 'success',
            title: 'Berhasil',
            body:
              decision === 'approve'
                ? 'Permohonan telah disetujui.'
                : 'Permohonan telah ditolak.',
          });
        })
        .catch((err: any) => {
          NBToast.show({
            level: 'danger',
            title: 'Gagal',
            body: err?.message || 'Tidak dapat memproses keputusan.',
          });
        });
    },
    [requestId, dispatch],
  );

  if (isLoading && !request) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorWrap}>
          <NBAlert
            variant="danger"
            title="Permohonan tidak ditemukan"
            message="Permohonan yang Anda cari tidak tersedia."
          />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getPruningRequestStatusColor(request.status);
  const statusLabel = getPruningRequestStatusLabel(request.status);
  const treeCount = request.treeCount ?? request.estimatedPlantCount;
  const hasContact =
    request.requesterName ||
    request.requesterPhone ||
    request.rtLeaderName ||
    request.rtLeaderPhone;

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Status ────────────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.statusRow}>
                <Text style={styles.sectionTitle}>📌 STATUS</Text>
                <NBBadge text={statusLabel} color={statusColor} />
              </View>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Kode Permohonan</Text>
                <View style={styles.refCodeRow}>
                  <Text style={[styles.valueMono, styles.refCodeText]} selectable>
                    {request.referenceCode || '—'}
                  </Text>
                  {request.referenceCode ? (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const Clipboard = (await import('@react-native-clipboard/clipboard')).default;
                          Clipboard.setString(request.referenceCode);
                          NBToast.show({ level: 'success', title: 'Disalin', body: request.referenceCode });
                        } catch {
                          /* native module unavailable in tests */
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Salin kode permohonan"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.copyBtn}
                      testID="perantingan-copy-ref"
                    >
                      <MaterialCommunityIcons name="content-copy" size={18} color={nbColors.black} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Diajukan</Text>
                <Text style={styles.value}>{formatDateTime(request.createdAt)}</Text>
              </View>
            </NBCardContent>
          </NBCard>

          {/* ── Lokasi ────────────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📍 LOKASI</Text>
            </NBCardHeader>
            <NBCardContent>
              {request.kecamatanName ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Kecamatan</Text>
                  <Text style={styles.value}>{request.kecamatanName}</Text>
                </View>
              ) : null}
              {request.rayon?.name ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Rayon</Text>
                  <Text style={styles.value}>{request.rayon.name}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Alamat</Text>
                <Text style={styles.value}>{request.address || '—'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (request.gpsLat != null && request.gpsLng != null) {
                    setLocationModalVisible(true);
                  }
                }}
                disabled={request.gpsLat == null || request.gpsLng == null}
                accessibilityRole="button"
                accessibilityLabel="Lihat lokasi di peta"
                style={[styles.infoRow, { marginBottom: 0 }]}
                testID="perantingan-gps-row"
              >
                <Text style={styles.label}>Koordinat GPS</Text>
                <View style={styles.gpsValueRow}>
                  <Text style={styles.valueMono}>
                    {formatGps(request.gpsLat, request.gpsLng)}
                  </Text>
                  {request.gpsLat != null && request.gpsLng != null ? (
                    <MaterialCommunityIcons name="map-marker-radius" size={18} color={nbColors.black} />
                  ) : null}
                </View>
              </TouchableOpacity>
            </NBCardContent>
          </NBCard>

          {/* ── Detail Pohon ──────────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>🌳 DETAIL POHON</Text>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Jumlah Pohon</Text>
                <Text style={styles.value}>
                  {treeCount != null ? `${treeCount} pohon` : '—'}
                </Text>
              </View>
              {request.treeHeightEstimate ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Tinggi (Perkiraan)</Text>
                  <Text style={styles.value}>{request.treeHeightEstimate}</Text>
                </View>
              ) : null}
              {request.treeDiameterEstimate ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Diameter (Perkiraan)</Text>
                  <Text style={styles.value}>{request.treeDiameterEstimate}</Text>
                </View>
              ) : null}
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.label}>Tanggal Diharapkan</Text>
                <Text style={styles.value}>
                  {request.expectedDate ? formatDate(request.expectedDate) : 'Belum dipilih'}
                </Text>
              </View>
            </NBCardContent>
          </NBCard>

          {/* ── Kontak ────────────────────────────────────────────────── */}
          {hasContact ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>👤 KONTAK</Text>
              </NBCardHeader>
              <NBCardContent>
                {(request.requesterName || request.requesterPhone) ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Pemohon</Text>
                    <Text style={styles.value}>
                      {request.requesterName || '—'}
                      {request.requesterPhone ? ` · ${request.requesterPhone}` : ''}
                    </Text>
                  </View>
                ) : null}
                {(request.rtLeaderName || request.rtLeaderPhone) ? (
                  <View style={[styles.infoRow, { marginBottom: 0 }]}>
                    <Text style={styles.label}>Ketua RT</Text>
                    <Text style={styles.value}>
                      {request.rtLeaderName || '—'}
                      {request.rtLeaderPhone ? ` · ${request.rtLeaderPhone}` : ''}
                    </Text>
                  </View>
                ) : null}
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* ── Catatan ───────────────────────────────────────────────── */}
          {request.notes ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>📝 CATATAN</Text>
              </NBCardHeader>
              <NBCardContent>
                <Text style={styles.descriptionText}>{request.notes}</Text>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* ── Foto ──────────────────────────────────────────────────── */}
          {request.photoUrls && request.photoUrls.length > 0 ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>
                  📸 FOTO LOKASI ({request.photoUrls.length})
                </Text>
              </NBCardHeader>
              <NBCardContent>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {request.photoUrls.map((photoUrl, index) => (
                    <TouchableOpacity
                      key={`${photoUrl}-${index}`}
                      onPress={() => handlePhotoPress(photoUrl)}
                      accessibilityRole="button"
                      accessibilityLabel={`Foto ${index + 1} dari ${request.photoUrls.length}`}
                    >
                      <Image source={{ uri: photoUrl }} style={styles.photo} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* ── Hasil Review ──────────────────────────────────────────── */}
          {request.reviewedAt ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>✅ HASIL REVIEW</Text>
              </NBCardHeader>
              <NBCardContent>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Direview Oleh</Text>
                  <Text style={styles.value}>
                    {request.reviewer?.full_name || 'Admin'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Tanggal Review</Text>
                  <Text style={styles.value}>
                    {formatDateTime(request.reviewedAt)}
                  </Text>
                </View>
                {request.reviewNotes ? (
                  <View style={[styles.infoRow, { marginBottom: 0 }]}>
                    <Text style={styles.label}>Catatan Review</Text>
                    <Text style={styles.descriptionText}>{request.reviewNotes}</Text>
                  </View>
                ) : null}
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* ── Tugas Terkait ─────────────────────────────────────────── */}
          {request.status === 'converted' && request.convertedTaskId ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>🔗 TUGAS TERKAIT</Text>
              </NBCardHeader>
              <NBCardContent>
                <Text style={[styles.descriptionText, { marginBottom: nbSpacing.md }]}>
                  Permohonan ini telah dijadwalkan dan tugas kerja telah dibuat.
                </Text>
                <NBButton
                  variant="primary"
                  label="Lihat Tugas"
                  onPress={handleViewTask}
                  leftIcon="link-variant"
                  fullWidth
                />
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* ── Aksi Admin ────────────────────────────────────────────── */}
          {canAdmin && ACTIONABLE_STATUSES.includes(request.status) ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>⚖️ AKSI ADMIN</Text>
              </NBCardHeader>
              <NBCardContent>
                <View style={styles.adminButtonRow}>
                  <View style={styles.adminButtonHalf}>
                    <NBButton
                      variant="success"
                      label="Setujui"
                      onPress={() => setReviewModalVisible(true)}
                      leftIcon="check"
                      disabled={reviewingId === requestId}
                      fullWidth
                    />
                  </View>
                  <View style={styles.adminButtonHalf}>
                    <NBButton
                      variant="danger"
                      label="Tolak"
                      onPress={() => setReviewModalVisible(true)}
                      leftIcon="close"
                      disabled={reviewingId === requestId}
                      fullWidth
                    />
                  </View>
                </View>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* Round 4 — admin reschedule entry, independent of convert flow */}
          {canAdmin && RESCHEDULABLE_STATUSES.includes(request.status) ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>📅 ATUR JADWAL</Text>
              </NBCardHeader>
              <NBCardContent>
                <NBButton
                  variant="secondary"
                  label="Atur Jadwal"
                  onPress={() => setRescheduleVisible(true)}
                  leftIcon="calendar-edit"
                  testID="perantingan-reschedule-open"
                  fullWidth
                />
              </NBCardContent>
            </NBCard>
          ) : null}

          {canAdmin && request.status === 'approved' ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>➡️ KONVERSI KE TUGAS</Text>
              </NBCardHeader>
              <NBCardContent>
                <NBButton
                  variant="primary"
                  label="Konversi ke Tugas"
                  onPress={() => setConvertSheetVisible(true)}
                  leftIcon="arrow-right"
                  fullWidth
                />
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* Batalkan permohonan — visible to submitter + admin on any status
              except cancelled/done. */}
          {canCancel ? (
            <NBCard style={styles.card}>
              <NBCardContent>
                <NBButton
                  variant="danger"
                  label="Batalkan Permohonan"
                  leftIcon="cancel"
                  onPress={handleCancel}
                  testID="perantingan-cancel-cta"
                  fullWidth
                />
              </NBCardContent>
            </NBCard>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <NBAlert variant="danger" title="Terjadi kesalahan" message={error} />
            </View>
          ) : null}
        </ScrollView>

        {/* Photo viewer */}
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

        {/* Review decision sheet */}
        <NBModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          type="sheet"
          size="sm"
          title="Pilih Keputusan"
        >
          <View style={styles.reviewSheetBody}>
            <NBButton
              variant="success"
              label="Setujui"
              leftIcon="check"
              onPress={() => handleReview('approve')}
              disabled={reviewingId === requestId}
              fullWidth
              style={{ marginBottom: nbSpacing.sm }}
            />
            <NBButton
              variant="danger"
              label="Tolak"
              leftIcon="close"
              onPress={() => handleReview('reject')}
              disabled={reviewingId === requestId}
              fullWidth
              style={{ marginBottom: nbSpacing.sm }}
            />
            <NBButton
              variant="secondary"
              label="Batal"
              onPress={() => setReviewModalVisible(false)}
              disabled={reviewingId === requestId}
              fullWidth
            />
          </View>
        </NBModal>

        {/* Convert to task */}
        {request ? (
          <ConvertToTaskSheet
            visible={convertSheetVisible}
            onClose={() => setConvertSheetVisible(false)}
            request={request}
            onSuccess={() => {
              dispatch(fetchPruningRequestById(requestId));
            }}
          />
        ) : null}

        {/* Reschedule (Round 4) */}
        {request ? (
          <RescheduleSheet
            visible={rescheduleVisible}
            onClose={() => setRescheduleVisible(false)}
            request={request}
            onSuccess={() => {
              dispatch(fetchPruningRequestById(requestId));
            }}
          />
        ) : null}

        {/* GPS map modal (May 2026) */}
        {request ? (
          <LocationMapModal
            visible={locationModalVisible}
            onClose={() => setLocationModalVisible(false)}
            location={{
              latitude: request.gpsLat ?? null,
              longitude: request.gpsLng ?? null,
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
        ) : null}
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray700,
    marginBottom: nbSpacing.xs,
  },
  value: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  valueMono: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  refCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  gpsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  refCodeText: {
    flexShrink: 1,
  },
  copyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
    lineHeight: nbTypography.fontSize.base * 1.5,
  },
  photosContainer: {
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  adminButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  adminButtonHalf: {
    flex: 1,
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
  reviewSheetBody: {
    paddingTop: nbSpacing.xs,
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
