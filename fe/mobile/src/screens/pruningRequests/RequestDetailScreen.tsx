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

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  NBCardTextInput,
} from '../../components/nb';
import { AssignToTaskSheet } from '../../components/admin/AssignToTaskSheet';
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
import { formatDate, formatDateTime, formatIsoWeekLabel } from '../../utils/dateUtils';
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
// May 10, 2026 — `assigned` (then `in_progress` late+1) joined the
// whitelist so admins can move the schedule even after work has begun.
// Backend cascades the change to `task.deadline`, capacity ledger, and a
// push to the assignee. Done / rejected / cancelled stay terminal.
const RESCHEDULABLE_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'assigned',
  'in_progress',
];
// May 10, 2026 — whitelist of statuses where a cancel is meaningful.
// `rejected` / `converted` / `in_progress` / `done` / `cancelled` are NOT
// here: rejected is already an admin terminal, converted+in_progress mean
// a task exists and lifecycle moved to the task, done/cancelled are
// terminal. Mirrors the backend `cancel()` whitelist.
const CANCELLABLE_STATUSES = ['submitted', 'under_review', 'approved'];

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

/**
 * Normalize an Indonesian phone number into the international `wa.me` /
 * `tel:` form. Strips spaces/dashes, swaps a leading `0` for `62`, and
 * keeps the rest verbatim. Returns null on empty/garbage input so the
 * caller can decide to hide the action icons.
 */
function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

interface ContactRowProps {
  label: string;
  name?: string | null;
  phone?: string | null;
  isLast?: boolean;
}

function ContactRow({ label, name, phone, isLast }: ContactRowProps): React.JSX.Element {
  const normalized = normalizePhone(phone);
  const handleCopy = async () => {
    if (!phone) return;
    try {
      const Clipboard = (await import('@react-native-clipboard/clipboard')).default;
      Clipboard.setString(phone);
      NBToast.show({ level: 'success', title: 'Disalin', body: phone });
    } catch {
      /* native module unavailable in tests */
    }
  };
  const handleWhatsApp = () => {
    if (!normalized) return;
    void Linking.openURL(`https://wa.me/${normalized}`);
  };
  const handleCall = () => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`);
  };
  return (
    <View style={[styles.infoRow, isLast && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{name || '—'}</Text>
      {phone ? (
        <View style={styles.contactPhoneRow}>
          <Text style={styles.contactPhoneText} selectable>
            {phone}
          </Text>
          <View style={styles.contactActions}>
            <TouchableOpacity
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={`Salin nomor ${label}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.contactIconBtn}
              testID={`perantingan-contact-copy-${label}`}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={nbColors.black} />
            </TouchableOpacity>
            {normalized ? (
              <TouchableOpacity
                onPress={handleWhatsApp}
                accessibilityRole="button"
                accessibilityLabel={`Chat WhatsApp ${label}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.contactIconBtn}
                testID={`perantingan-contact-wa-${label}`}
              >
                <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handleCall}
              accessibilityRole="button"
              accessibilityLabel={`Telepon ${label}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.contactIconBtn}
              testID={`perantingan-contact-call-${label}`}
            >
              <MaterialCommunityIcons name="phone" size={18} color={nbColors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
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
  const [convertSheetVisible, setConvertSheetVisible] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  // Inline reject reason input — matches OvertimeDetailScreen / TaskDetail
  // / ActivityDetail. Tolak opens the input; Setujui is a confirm dialog.
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // ScrollView ref so we can scroll the alasan input into view when Tolak
  // is tapped — same UX as OvertimeDetailScreen's `scrollToEnd` animation.
  const scrollViewRef = useRef<ScrollView>(null);

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
    if (request?.assignedTaskId) {
      navigation.navigate('TaskDetail', { taskId: request.assignedTaskId });
    }
  }, [request?.assignedTaskId, navigation]);

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
  // Cancel is submitter-only — admin disposition lives in approve/reject/
  // convert; an extra "batalkan" button on the admin view conflicts with the
  // formal review trail. The `CANCELLABLE_STATUSES` whitelist also closes
  // the rejected/converted/in_progress holes the previous blacklist left
  // open (cancelling a `rejected` permohonan is nonsense — admin already
  // terminated it).
  const canCancel = useMemo(() => {
    if (!request) return false;
    if (canAdmin) return false;
    if (!CANCELLABLE_STATUSES.includes(request.status)) return false;
    return !!authUserId && request.submittedBy === authUserId;
  }, [request, authUserId, canAdmin]);

  // Setujui — single "Are you sure?" confirm, mirrors OvertimeDetailScreen
  // and ActivityDetailScreen. No second screen, no modal that re-prompts
  // approve/reject.
  const handleApprove = useCallback(() => {
    Alert.alert(
      'Konfirmasi',
      'Setujui permohonan perantingan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setuju',
          onPress: async () => {
            try {
              await dispatch(
                reviewPruningRequest({ id: requestId, decision: 'approve' }),
              ).unwrap();
              NBToast.show({
                level: 'success',
                title: 'Berhasil',
                body: 'Permohonan telah disetujui.',
              });
            } catch (err: any) {
              NBToast.show({
                level: 'danger',
                title: 'Gagal',
                body: err?.message || 'Tidak dapat menyetujui permohonan.',
              });
            }
          },
        },
      ],
    );
  }, [dispatch, requestId]);

  // Tolak — show inline reason input and scroll it into view.
  // Mirrors OvertimeDetailScreen.handleTolakPress: 150ms delay gives the
  // input time to render before we ask the ScrollView to scroll past it.
  const handleRejectPress = useCallback(() => {
    setShowRejectInput(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectReason.trim()) {
      NBToast.show({
        level: 'warning',
        title: 'Alasan diperlukan',
        body: 'Mohon isi alasan penolakan permohonan ini.',
      });
      return;
    }
    try {
      await dispatch(
        reviewPruningRequest({
          id: requestId,
          decision: 'reject',
          reviewNotes: rejectReason.trim(),
        }),
      ).unwrap();
      NBToast.show({
        level: 'success',
        title: 'Berhasil',
        body: 'Permohonan telah ditolak.',
      });
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err: any) {
      NBToast.show({
        level: 'danger',
        title: 'Gagal',
        body: err?.message || 'Tidak dapat menolak permohonan.',
      });
    }
  }, [dispatch, requestId, rejectReason]);

  const handleRejectCancel = useCallback(() => {
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
          ref={scrollViewRef}
          style={styles.scroll}
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
              {/* Submitter row — kecamatan + admin both see who filed the
                  request. Falls back to the requester contact name when the
                  submitter relation is missing on legacy seeded rows. The
                  role label is intentionally NOT shown — every submitter is
                  staff_kecamatan in this flow, so printing it adds noise. */}
              {(request.submitter?.full_name || request.submitter?.username || request.requesterName) ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Diajukan Oleh</Text>
                  <Text style={styles.value}>
                    {request.submitter?.full_name ||
                      request.submitter?.username ||
                      request.requesterName}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.label}>Diajukan Pada</Text>
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
              {/* Coordinate row — read-only display of lat/lng. */}
              <View style={[styles.infoRow, { marginBottom: nbSpacing.sm }]}>
                <Text style={styles.label}>Koordinat GPS</Text>
                <Text style={styles.valueMono}>
                  {formatGps(request.gpsLat, request.gpsLng)}
                </Text>
              </View>
              {/* Separate "open in map" CTA below — clearly clickable, with
                  its own icon, label, and accent color so the affordance
                  reads as a button, not as decorative text. */}
              {request.gpsLat != null && request.gpsLng != null ? (
                <TouchableOpacity
                  onPress={() => setLocationModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Lihat lokasi di peta"
                  style={styles.viewMapCta}
                  testID="perantingan-gps-row"
                >
                  <MaterialCommunityIcons
                    name="map-search"
                    size={20}
                    color={nbColors.primary}
                  />
                  <Text style={styles.viewMapCtaText}>Lihat di Peta</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={nbColors.primary}
                    style={{ marginLeft: 'auto' }}
                  />
                </TouchableOpacity>
              ) : (
                <Text style={styles.gpsHint}>
                  Lokasi belum tersedia untuk dilihat di peta.
                </Text>
              )}
            </NBCardContent>
          </NBCard>

          {/* ── Detail Perantingan ────────────────────────────────────── */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>🌳 DETAIL PERANTINGAN</Text>
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
              {/* Submitter's preferred week (ADR-035 amendment 2026-05-01).
                  Always shown when set so kecamatan + admin both know what
                  the warga asked for, separately from what the admin
                  confirmed. */}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Minggu Preferensi</Text>
                <Text style={styles.value}>
                  {request.expectedYear != null && request.expectedIsoWeek != null
                    ? formatIsoWeekLabel(request.expectedYear, request.expectedIsoWeek)
                    : 'Tidak ditentukan'}
                </Text>
              </View>
              {/* Admin-confirmed work day (May 9, 2026). Set at assign-to-task
                  or via "Atur Jadwal". Stays "Belum dijadwalkan" until then. */}
              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.label}>Tanggal Dijadwalkan</Text>
                <Text style={styles.value}>
                  {request.scheduledDate
                    ? formatDate(request.scheduledDate)
                    : 'Belum dijadwalkan'}
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
                  <ContactRow
                    label="Pemohon"
                    name={request.requesterName}
                    phone={request.requesterPhone}
                  />
                ) : null}
                {(request.rtLeaderName || request.rtLeaderPhone) ? (
                  <ContactRow
                    label="Ketua RT/RW"
                    name={request.rtLeaderName}
                    phone={request.rtLeaderPhone}
                    isLast
                  />
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
          {request.status === 'assigned' && request.assignedTaskId ? (
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

          {/* Inline reject reason input — same pattern as OvertimeDetailScreen.
              `NBCardTextInput` provides its own card chrome, so wrapping it
              in another NBCard would be redundant. The page auto-scrolls
              here when Tolak is pressed (see handleRejectPress). */}
          {canAdmin && showRejectInput ? (
            <NBCardTextInput
              title="📝 Alasan Penolakan"
              required
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Jelaskan alasan penolakan permohonan ini…"
              maxLength={1000}
              numberOfLines={4}
              style={styles.rejectInputSection}
            />
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <NBAlert variant="danger" title="Terjadi kesalahan" message={error} />
            </View>
          ) : null}
        </ScrollView>

        {/* Floating action bar (May 9, 2026 redesign).
            Admin flow gates Setujui / Tugaskan behind a confirmed
            `scheduledDate` — Atur Jadwal is the primary CTA until then.
            Tolak is NOT gated; admin can reject incomplete requests with
            a required reason via the inline input above. Submitters see
            only "Batalkan". */}
        {(() => {
          const isReschedulable = canAdmin && RESCHEDULABLE_STATUSES.includes(request.status);
          // After the May 9 schema split, kecamatan-set preference lives on
          // (expectedYear, expectedIsoWeek) and admin-confirmed day lives on
          // `scheduledDate`. Setujui + Tugaskan are gated on a confirmed
          // day; Tolak is NOT gated — admins can reject incomplete requests
          // without first running Atur Jadwal.
          const hasSchedule = !!request.scheduledDate;
          const needsSchedule = isReschedulable && !hasSchedule;
          const canActApprove =
            canAdmin && ACTIONABLE_STATUSES.includes(request.status) && hasSchedule;
          const canReject =
            canAdmin && ACTIONABLE_STATUSES.includes(request.status);
          const canConvert =
            canAdmin && request.status === 'approved' && hasSchedule;
          const showAdminBar = canAdmin && (isReschedulable || canConvert);

          if (!showAdminBar && !canCancel) {
            return null;
          }

          return (
            <View style={styles.actionBar} pointerEvents="box-none">
              {showAdminBar ? (
                <View style={styles.actionBarStack}>
                  {/* Top row: schedule controller. When the date is missing this
                      is the *only* enabled CTA; once set it becomes a small
                      secondary "Atur Ulang Jadwal" link. */}
                  {isReschedulable ? (
                    <NBButton
                      variant={needsSchedule ? 'primary' : 'secondary'}
                      label={needsSchedule ? 'Atur Jadwal' : 'Atur Ulang Jadwal'}
                      leftIcon="calendar-edit"
                      onPress={() => setRescheduleVisible(true)}
                      testID="perantingan-reschedule-open"
                      size="lg"
                      fullWidth
                    />
                  ) : null}

                  {/* Approve / reject row.
                      - Tolak: enabled whenever the request is in an
                        actionable status; admin can reject without first
                        running Atur Jadwal.
                      - Setujui: disabled until a schedule is set.
                      Reject submit happens via the inline reason input
                      that toggles in below this row. */}
                  {canReject && !showRejectInput ? (
                    <View style={styles.adminButtonRow}>
                      <View style={styles.adminButtonHalf}>
                        <NBButton
                          variant="danger"
                          label="Tolak"
                          leftIcon="close"
                          onPress={handleRejectPress}
                          disabled={reviewingId === requestId}
                          size="lg"
                          fullWidth
                        />
                      </View>
                      <View style={styles.adminButtonHalf}>
                        <NBButton
                          variant="success"
                          label="Setujui"
                          leftIcon="check"
                          onPress={handleApprove}
                          disabled={!canActApprove || reviewingId === requestId}
                          size="lg"
                          fullWidth
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* Inline reject-reason flow — Batal / Kirim Penolakan. */}
                  {canReject && showRejectInput ? (
                    <View style={styles.adminButtonRow}>
                      <View style={styles.adminButtonHalf}>
                        <NBButton
                          variant="secondary"
                          label="Batal"
                          onPress={handleRejectCancel}
                          disabled={reviewingId === requestId}
                          size="lg"
                          fullWidth
                        />
                      </View>
                      <View style={styles.adminButtonHalf}>
                        <NBButton
                          variant="danger"
                          label="Kirim Penolakan"
                          leftIcon="close"
                          onPress={handleRejectSubmit}
                          disabled={
                            !rejectReason.trim() || reviewingId === requestId
                          }
                          size="lg"
                          fullWidth
                        />
                      </View>
                    </View>
                  ) : null}

                  {/* Convert flow when already approved. */}
                  {canAdmin && request.status === 'approved' ? (
                    <NBButton
                      variant="primary"
                      label="Tugaskan ke Petugas"
                      leftIcon="arrow-right"
                      onPress={() => setConvertSheetVisible(true)}
                      disabled={!canConvert}
                      size="lg"
                      fullWidth
                    />
                  ) : null}

                </View>
              ) : null}

              {canCancel ? (
                <View style={styles.actionBarStack}>
                  <NBButton
                    variant="danger"
                    label="Batalkan Permohonan"
                    leftIcon="cancel"
                    onPress={handleCancel}
                    testID="perantingan-cancel-cta"
                    size="lg"
                    fullWidth
                  />
                </View>
              ) : null}
            </View>
          );
        })()}

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

        {/* Convert to task */}
        {request ? (
          <AssignToTaskSheet
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
            title="Lokasi Perantingan"
            markerTitle="Lokasi Perantingan"
            hideAreaStatus
            hideUpdatedAt
            location={{
              // TypeORM emits decimal columns as strings; coerce to Number so
              // LocationMapModal's `.toFixed()` calls don't blow up.
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
  scroll: {
    flex: 1,
  },
  // Matches OvertimeDetailScreen.rejectInputSection — the inline reject
  // card pads itself to the same horizontal rhythm as the surrounding
  // detail cards.
  rejectInputSection: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  contentContainer: {
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.md,
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
  viewMapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
    paddingVertical: nbSpacing[3],
    paddingHorizontal: nbSpacing[3],
    borderWidth: nbBorders.base,
    borderColor: nbColors.primary,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.gray100,
  },
  viewMapCtaText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.primary,
  },
  gpsHint: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray500,
    fontStyle: 'italic',
    paddingVertical: nbSpacing[2],
  },
  refCodeText: {
    flexShrink: 1,
  },
  contactPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.xs,
  },
  contactPhoneText: {
    flexShrink: 1,
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.3,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  contactIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    backgroundColor: nbColors.white,
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
  // Mirrors OvertimeDetailScreen — the action bar is a flex sibling of the
  // ScrollView, NOT absolute-positioned. The ScrollView's `flex: 1` takes
  // remaining height and the bar sits naturally at the bottom of the column,
  // so content can never overflow behind the buttons. No chrome (no
  // background, no border, no shadow); the buttons carry their own NB
  // hard-edge styling.
  actionBar: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  actionBarStack: {
    gap: nbSpacing.sm,
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
