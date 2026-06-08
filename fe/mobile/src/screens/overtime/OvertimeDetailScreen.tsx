/**
 * Overtime Detail Screen
 * Phase 2C: Read-only view with inline approval/rejection — matches ActivityDetailScreen pattern
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ImagePreviewModal } from '../../components/common';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import { getOvertimeById, approveOvertime, rejectOvertime } from '../../services/api/overtimeApi';
import { OvertimeTrailModal } from '../../components/modals/OvertimeTrailModal';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBBadge,
  NBButton,
  NBCardTextInput,
  NBText,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import {
  getOvertimeStatusColor,
  getOvertimeStatusLabel,
  formatDateTimeIndonesian,
  formatDateIndonesian,
  formatDurationHours,
} from '../../utils/statusHelpers';
import { useAppSelector } from '../../store/hooks';
import type { Overtime } from '../../types/models.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padTwo(n: number): string { return String(n).padStart(2, '0'); }

function formatTimeShort(isoString: string): string {
  const d = new Date(isoString);
  return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`;
}

function overtimeCode(id: string): string {
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineStepProps {
  done: boolean;
  label: string;
  timestamp?: string;
  note?: string;
  isLast: boolean;
}

function TimelineStep({ done, label, timestamp, note, isLast }: TimelineStepProps): React.JSX.Element {
  return (
    <View style={tlStyles.step}>
      <View style={tlStyles.iconCol}>
        <MaterialCommunityIcons
          name={done ? 'circle' : 'circle-outline'}
          size={16}
          color={done ? nbColors.primary : nbColors.gray400}
        />
        {!isLast && <View style={tlStyles.connector} />}
      </View>
      <View style={tlStyles.content}>
        <NBText variant="body-sm" color={done ? 'black' : 'gray400'}>{label}</NBText>
        {timestamp ? (
          <NBText variant="caption" color="gray500" style={{ marginTop: 1 }}>{timestamp}</NBText>
        ) : null}
        {note ? (
          <NBText variant="caption" color="gray600" style={{ marginTop: 2 }}>{note}</NBText>
        ) : null}
        {!isLast && <View style={tlStyles.contentSpacer} />}
      </View>
    </View>
  );
}

const tlStyles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCol: {
    alignItems: 'center',
    width: 24,
    marginRight: nbSpacing.sm,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: nbColors.gray300,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingBottom: nbSpacing.sm,
  },
  contentSpacer: {
    height: nbSpacing.xs,
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteParams = {
  overtimeId: string;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export function OvertimeDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<MainTabScreenProps<'OvertimeDetail'>['navigation']>();
  const route = useRoute<RouteProp<MainTabParamList, 'OvertimeDetail'>>();
  const { overtimeId } = route.params as RouteParams;

  const user = useAppSelector((state) => state.auth.user);

  const [overtime, setOvertime] = useState<Overtime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const canViewTrail = useMemo(
    () => !!(overtime?.shift_id && user?.role && !['satgas', 'linmas'].includes(user.role)),
    [overtime, user],
  );

  const scrollViewRef = useRef<ScrollView>(null);

  const handleTolakPress = useCallback(() => {
    setShowRejectInput(true);
  }, []);

  useEffect(() => {
    if (!showRejectInput) { return; }
    const id = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(id);
  }, [showRejectInput]);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await getOvertimeById(overtimeId);
      if (response.data) {
        setOvertime(response.data);
      } else if (response.error) {
        if (!isRefresh) {
          Alert.alert('Error', response.error);
          navigation.navigate('Overtime' as any);
        }
      }
    } catch {
      if (!isRefresh) {
        Alert.alert('Error', 'Gagal memuat detail lembur');
        navigation.navigate('Overtime' as any);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [overtimeId, navigation]);

  useFocusEffect(useCallback(() => { void fetchDetail(false); }, [fetchDetail]));

  const handleRefresh = useCallback(() => { void fetchDetail(true); }, [fetchDetail]);

  // Whether the current user can clock out this overtime (owner + in_progress)
  const canClockOut = useMemo(
    () => overtime?.status === 'in_progress' && user?.id === overtime.user_id,
    [overtime, user],
  );

  // Determine if current user can approve/reject this overtime (mirrors ActivityDetailScreen)
  const canApprove = useMemo(() => {
    if (!overtime || !user || overtime.status !== 'pending') { return false; }
    const submitterRole = overtime.user?.role;
    if (user.role === 'korlap') {
      return (submitterRole === 'satgas' || submitterRole === 'linmas') &&
             user.area_id != null && overtime.area_id === user.area_id;
    }
    if (user.role === 'kepala_rayon') {
      if (!user.rayon_id) { return false; }
      const inSameRayon =
        overtime.area?.rayon_id === user.rayon_id ||
        overtime.user?.rayon_id === user.rayon_id;
      return inSameRayon && (submitterRole === 'korlap' || submitterRole === 'admin_data');
    }
    return false;
  }, [overtime, user]);

  const handleApprove = useCallback(async () => {
    if (!overtime || isSubmitting) { return; }
    Alert.alert('Konfirmasi', 'Setujui pengajuan lembur ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Setuju',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const response = await approveOvertime(overtime.id);
            if (response.error) {
              Alert.alert('Error', response.error);
              return;
            }
            if (response.data) { setOvertime(response.data); }
            Alert.alert('Berhasil', 'Lembur disetujui');
          } catch {
            Alert.alert('Error', 'Gagal menyetujui lembur');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }, [overtime, isSubmitting]);

  const handleRejectSubmit = useCallback(async () => {
    if (!overtime || !rejectReason.trim()) {
      Alert.alert('Error', 'Alasan penolakan wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await rejectOvertime(overtime.id, rejectReason.trim());
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) { setOvertime(response.data); }
      setShowRejectInput(false);
      setRejectReason('');
      Alert.alert('Berhasil', 'Lembur ditolak');
    } catch {
      Alert.alert('Error', 'Gagal menolak lembur');
    } finally {
      setIsSubmitting(false);
    }
  }, [overtime, rejectReason]);

  if (isLoading) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600" style={styles.loadingText}>Memuat data...</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!overtime) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <NBText variant="body" color="gray600" style={styles.loadingText}>Lembur tidak ditemukan</NBText>
          <NBButton
            title="Kembali"
            variant="secondary"
            onPress={() => navigation.navigate('Overtime' as any)}
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            (canApprove || canClockOut) && styles.contentContainerWithFooter,
            showRejectInput && styles.contentContainerWithReject,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[nbColors.primary]}
              tintColor={nbColors.primary}
            />
          }
        >
          {/* General Info Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="information-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>INFORMASI UMUM</NBText>
              </View>
            </NBCardHeader>
            <NBCardContent>
              {/* 2-tile grid: Tanggal | Jam */}
              <View style={styles.infoTileRow}>
                <View style={styles.infoTile}>
                  <NBText variant="mono-sm" color="gray500" uppercase style={{ letterSpacing: 0.6, marginBottom: 4 }}>TANGGAL</NBText>
                  <NBText variant="body-sm" color="black">{formatDateIndonesian(overtime.start_datetime)}</NBText>
                </View>
                <View style={[styles.infoTile, styles.infoTileJam]}>
                  <NBText variant="mono-sm" color="gray500" uppercase style={{ letterSpacing: 0.6, marginBottom: 4 }}>JAM</NBText>
                  <NBText variant="body-sm" color="black">
                    {formatTimeShort(overtime.start_datetime)}{overtime.end_datetime ? ` — ${formatTimeShort(overtime.end_datetime)}` : ''}
                  </NBText>
                  {overtime.end_datetime && (
                    <NBText variant="caption" color="gray600" style={{ marginTop: 2 }}>
                      {formatDurationHours(overtime.start_datetime, overtime.end_datetime)}
                    </NBText>
                  )}
                </View>
              </View>

              {overtime.user && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" color="gray600" style={styles.label}>Petugas</NBText>
                  <NBText variant="body" color="black" style={styles.value}>
                    {overtime.user.role} - {overtime.user.full_name}
                  </NBText>
                </View>
              )}
              {overtime.area?.name && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" color="gray600" style={styles.label}>Area</NBText>
                  <NBText variant="body" color="black" style={styles.value}>{overtime.area.name}</NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Reason Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="message-text-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>ALASAN LEMBUR</NBText>
              </View>
            </NBCardHeader>
            <NBCardContent>
              <NBText variant="body" color={!overtime.reason ? 'gray400' : 'black'} style={[styles.descriptionText, !overtime.reason && styles.descriptionPlaceholder]}>
                {overtime.reason || '(Tidak ada alasan)'}
              </NBText>
            </NBCardContent>
          </NBCard>

          {/* Status Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.statusRow}>
                <View>
                  <NBText variant="mono-sm" color="gray500" style={{ letterSpacing: 0.6 }}>{overtimeCode(overtime.id)}</NBText>
                  <NBText variant="body-sm" color="gray600" style={{ marginTop: 1 }}>ID Pengajuan</NBText>
                </View>
                <NBBadge
                  text={getOvertimeStatusLabel(overtime.status)}
                  color={getOvertimeStatusColor(overtime.status)}
                />
              </View>
            </NBCardHeader>
            <NBCardContent>
              {overtime.status === 'rejected' && overtime.rejection_reason && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" color="danger" style={[styles.label, styles.dangerLabel]}>Alasan Penolakan</NBText>
                  <NBText variant="body" color="black" style={styles.value}>{overtime.rejection_reason}</NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Timeline Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>RIWAYAT PENGAJUAN</NBText>
            </NBCardHeader>
            <NBCardContent>
              <TimelineStep
                done
                label="Diajukan"
                timestamp={formatDateTimeIndonesian(overtime.created_at)}
                note={overtime.user?.full_name}
                isLast={overtime.status === 'pending' && !overtime.approved_at}
              />
              {(overtime.status === 'approved' || overtime.status === 'rejected') && (
                <TimelineStep
                  done
                  label={overtime.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                  timestamp={overtime.approved_at ? formatDateTimeIndonesian(overtime.approved_at) : formatDateTimeIndonesian(overtime.updated_at)}
                  note={overtime.approver?.full_name}
                  isLast={overtime.status === 'rejected'}
                />
              )}
              {overtime.status === 'approved' && (
                <TimelineStep
                  done={false}
                  label="Akan dijalankan"
                  timestamp={formatDateTimeIndonesian(overtime.start_datetime)}
                  isLast
                />
              )}
            </NBCardContent>
          </NBCard>

          {/* Activity Type Card */}
          {overtime.activityType && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="tag-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                  <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>JENIS AKTIVITAS</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <NBText variant="body" color="black" style={styles.value}>{overtime.activityType.name}</NBText>
                {overtime.activityType.description && (
                  <NBText variant="body-sm" color="gray600" style={styles.description}>{overtime.activityType.description}</NBText>
                )}
              </NBCardContent>
            </NBCard>
          )}

          {/* Description Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="text-box-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>DESKRIPSI</NBText>
              </View>
            </NBCardHeader>
            <NBCardContent>
              <NBText variant="body" color={!overtime.description ? 'gray400' : 'black'} style={[styles.descriptionText, !overtime.description && styles.descriptionPlaceholder]}>
                {overtime.description || '(Belum diisi)'}
              </NBText>
            </NBCardContent>
          </NBCard>

          {/* Photos Card */}
          {(overtime.photo_urls?.length ?? 0) > 0 && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.headerColumn}>
                  <View style={styles.sectionHeaderRow}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                    <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>FOTO BUKTI</NBText>
                  </View>
                  <NBText variant="body-sm" color="gray600" style={styles.sectionSubtitle}>{overtime.photo_urls!.length} foto dilampirkan</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {overtime.photo_urls!.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setPreviewUri(url)}
                      accessibilityRole="button"
                      accessibilityLabel="Lihat foto penuh"
                      accessibilityHint="Ketuk untuk melihat foto dalam ukuran penuh"
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </NBCardContent>
            </NBCard>
          )}

          {/* Selfie Photos */}
          {(overtime.shift?.clock_in_photo_url || overtime.shift?.clock_out_photo_url) && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="account-circle-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                  <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>SELFIE VERIFIKASI</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {overtime.shift?.clock_in_photo_url && (
                    <View style={styles.selfiePhotoContainer}>
                      <TouchableOpacity
                        onPress={() => setPreviewUri(overtime.shift!.clock_in_photo_url!)}
                        accessibilityRole="button"
                        accessibilityLabel="Lihat selfie mulai lembur"
                      >
                        <Image
                          source={{ uri: overtime.shift.clock_in_photo_url }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <NBText variant="body-sm" color="black" style={styles.selfiePhotoLabel}>Mulai Lembur</NBText>
                    </View>
                  )}
                  {overtime.shift?.clock_out_photo_url && (
                    <View style={styles.selfiePhotoContainer}>
                      <TouchableOpacity
                        onPress={() => setPreviewUri(overtime.shift!.clock_out_photo_url!)}
                        accessibilityRole="button"
                        accessibilityLabel="Lihat selfie selesai lembur"
                      >
                        <Image
                          source={{ uri: overtime.shift.clock_out_photo_url }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <NBText variant="body-sm" color="black" style={styles.selfiePhotoLabel}>Selesai Lembur</NBText>
                    </View>
                  )}
                </ScrollView>
              </NBCardContent>
            </NBCard>
          )}

          {/* GPS Card */}
          {overtime.gps_lat != null && overtime.gps_lng != null ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                  <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>LOKASI GPS</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <View style={styles.locationContainer}>
                  <NBText variant="body-sm" color="black" style={styles.locationText}>
                    {`${Number(overtime.gps_lat).toFixed(6)}, ${Number(overtime.gps_lng).toFixed(6)}`}
                  </NBText>
                </View>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* Location Trail Card */}
          {canViewTrail && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="map-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
                  <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>RUTE LOKASI</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <NBButton
                  title="Lihat Rute Lokasi Lembur"
                  variant="secondary"
                  fullWidth
                  onPress={() => setShowTrailModal(true)}
                />
              </NBCardContent>
            </NBCard>
          )}

          {showTrailModal && overtime.shift_id && overtime.user_id && (
            <OvertimeTrailModal
              visible={showTrailModal}
              onClose={() => setShowTrailModal(false)}
              userId={overtime.user_id}
              shiftId={overtime.shift_id}
              startDatetime={overtime.start_datetime}
              userName={overtime.user?.full_name || 'Petugas'}
              areaName={overtime.area?.name}
            />
          )}

          {/* Inline reject reason input */}
          {canApprove && showRejectInput && (
            <NBCardTextInput
              title="ALASAN PENOLAKAN"
              required
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Jelaskan alasan penolakan lembur ini..."
              maxLength={1000}
              numberOfLines={4}
              style={styles.rejectInputSection}
            />
          )}
        </ScrollView>

        {/* Clock Out Lembur FAB — visible to overtime owner when status is in_progress */}
        {canClockOut && (
          <View style={styles.fab}>
            <NBButton
              title="Clock Out Lembur"
              variant="danger"
              size="lg"
              fullWidth
              onPress={() => navigation.navigate('OvertimeSubmit' as any)}
            />
          </View>
        )}

        {/* Full-screen image preview */}
        <ImagePreviewModal
          uri={previewUri}
          onClose={() => setPreviewUri(null)}
          title="Foto Lembur"
        />

        {/* Fixed approval FAB — mirrors ActivityDetailScreen */}
        {canApprove && (
          <View style={styles.fab}>
            {!showRejectInput ? (
              <View style={styles.approvalButtonRow}>
                <View style={styles.approvalButtonHalf}>
                  <NBButton
                    title="Tolak"
                    variant="danger"
                    onPress={handleTolakPress}
                    disabled={isSubmitting}
                    fullWidth
                    size="lg"
                  />
                </View>
                <View style={styles.approvalButtonHalf}>
                  <NBButton
                    title="Setujui"
                    variant="success"
                    onPress={handleApprove}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    fullWidth
                    size="lg"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.approvalButtonRow}>
                <View style={styles.approvalButtonHalf}>
                  <NBButton
                    title="Batal"
                    variant="secondary"
                    onPress={() => { setShowRejectInput(false); setRejectReason(''); }}
                    fullWidth
                    size="lg"
                  />
                </View>
                <View style={styles.approvalButtonHalf}>
                  <NBButton
                    title="Kirim Penolakan"
                    variant="danger"
                    onPress={handleRejectSubmit}
                    disabled={isSubmitting || !rejectReason.trim()}
                    loading={isSubmitting}
                    size="lg"
                    fullWidth
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: nbSpacing.md,
  },
  loadingText: {
    // Typography handled by NBText variant="body" color="gray600"
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  contentContainerWithFooter: {
    paddingBottom: nbSpacing.md,
  },
  contentContainerWithReject: {
    paddingBottom: nbSpacing['3xl'],
  },
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionSubtitle: {
    // Typography handled by NBText variant="body-sm" color="gray600"
    marginTop: nbSpacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerColumn: {
    flexDirection: 'column',
    gap: nbSpacing.xs,
  },
  infoTileRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  infoTile: {
    flex: 1,
    padding: nbSpacing.sm,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  infoTileJam: {
    backgroundColor: nbColors.statusIdleBg,
  },
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    // Typography handled by NBText variant="body-sm" color="gray600"
    marginBottom: nbSpacing.xs,
  },
  dangerLabel: {
    // Color handled by NBText color="danger"
  },
  value: {
    // Typography handled by NBText variant="body" color="black"
  },
  description: {
    // Typography handled by NBText variant="body-sm" color="gray600"
    marginTop: nbSpacing.xs,
  },
  descriptionText: {
    // Typography handled by NBText variant="body" color="black"
  },
  descriptionPlaceholder: {
    // Color handled by NBText color="gray400"
    fontStyle: 'italic',
  },
  photosContainer: {
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationContainer: {
    padding: nbSpacing.md,
    backgroundColor: nbColors.gray50,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  locationText: {
    // Typography handled by NBText variant="body-sm" color="black"
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  rejectInputSection: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  selfiePhotoContainer: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  selfiePhotoLabel: {
    // Typography handled by NBText variant="body-sm" color="black"
    textAlign: 'center',
  },
  fab: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
  approvalButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  approvalButtonHalf: {
    flex: 1,
  },
});
