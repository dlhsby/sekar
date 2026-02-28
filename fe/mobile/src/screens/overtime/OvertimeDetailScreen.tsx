/**
 * Overtime Detail Screen
 * Phase 2C: Read-only view with inline approval/rejection — matches ActivityDetailScreen pattern
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import { getOvertimeById, approveOvertime, rejectOvertime } from '../../services/api/overtimeApi';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBBackgroundPattern,
  NBBadge,
  NBButton,
  NBTextInput,
} from '../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import {
  getOvertimeStatusColor,
  getOvertimeStatusLabel,
  formatDateTimeIndonesian,
  formatDurationHours,
} from '../../utils/statusHelpers';
import { useAppSelector } from '../../store/hooks';
import type { Overtime } from '../../types/models.types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const handleTolakPress = useCallback(() => {
    setShowRejectInput(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const response = await getOvertimeById(overtimeId);
        if (response.data) {
          setOvertime(response.data);
        } else if (response.error) {
          Alert.alert('Error', response.error);
          navigation.goBack();
        }
      } catch {
        Alert.alert('Error', 'Gagal memuat detail lembur');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [overtimeId, navigation]);

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
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!overtime) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Lembur tidak ditemukan</Text>
          <NBButton
            title="Kembali"
            variant="secondary"
            onPress={() => navigation.goBack()}
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={[
            styles.contentContainer,
            canApprove && styles.contentContainerWithFooter,
            showRejectInput && styles.contentContainerWithReject,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* General Info Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📋 INFORMASI UMUM</Text>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Mulai</Text>
                <Text style={styles.value}>{formatDateTimeIndonesian(overtime.start_datetime)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Selesai</Text>
                <Text style={styles.value}>{formatDateTimeIndonesian(overtime.end_datetime)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Durasi</Text>
                <Text style={styles.value}>{formatDurationHours(overtime.start_datetime, overtime.end_datetime)}</Text>
              </View>
              {overtime.user && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Petugas</Text>
                  <Text style={styles.value}>
                    {overtime.user.role} - {overtime.user.full_name}
                  </Text>
                </View>
              )}
              {overtime.area?.name && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Area</Text>
                  <Text style={styles.value}>{overtime.area.name}</Text>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Status Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.statusRow}>
                <Text style={styles.sectionTitle}>📋 STATUS</Text>
                <NBBadge
                  text={getOvertimeStatusLabel(overtime.status)}
                  color={getOvertimeStatusColor(overtime.status)}
                />
              </View>
            </NBCardHeader>
            <NBCardContent>
              {overtime.status === 'rejected' && overtime.rejection_reason && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, styles.dangerLabel]}>Alasan Penolakan</Text>
                  <Text style={styles.value}>{overtime.rejection_reason}</Text>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Activity Type Card */}
          {overtime.activityType && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>🏷️ JENIS AKTIVITAS</Text>
              </NBCardHeader>
              <NBCardContent>
                <Text style={styles.value}>{overtime.activityType.name}</Text>
                {overtime.activityType.description && (
                  <Text style={styles.description}>{overtime.activityType.description}</Text>
                )}
              </NBCardContent>
            </NBCard>
          )}

          {/* Description Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📝 DESKRIPSI</Text>
            </NBCardHeader>
            <NBCardContent>
              <Text style={styles.descriptionText}>{overtime.description}</Text>
            </NBCardContent>
          </NBCard>

          {/* Photos Card */}
          {overtime.photo_urls.length > 0 && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>📸 FOTO BUKTI</Text>
                <Text style={styles.sectionSubtitle}>{overtime.photo_urls.length} foto dilampirkan</Text>
              </NBCardHeader>
              <NBCardContent>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {overtime.photo_urls.map((url, index) => (
                    <Image
                      key={index}
                      source={{ uri: url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              </NBCardContent>
            </NBCard>
          )}

          {/* GPS Card */}
          {overtime.gps_lat != null && overtime.gps_lng != null ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>📍 LOKASI GPS</Text>
              </NBCardHeader>
              <NBCardContent>
                <View style={styles.locationContainer}>
                  <Text style={styles.locationText}>
                    {`${Number(overtime.gps_lat).toFixed(6)}, ${Number(overtime.gps_lng).toFixed(6)}`}
                  </Text>
                </View>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* Inline reject reason input */}
          {canApprove && showRejectInput && (
            <View style={styles.rejectInputSection}>
              <NBTextInput
                label="📝 ALASAN PENOLAKAN"
                placeholder="Jelaskan alasan penolakan lembur ini..."
                multiline
                numberOfLines={4}
                maxLength={1000}
                value={rejectReason}
                onChangeText={setRejectReason}
                helperText={`${rejectReason.length}/1000 karakter`}
                inputStyle={styles.rejectInputField}
                textAlignVertical="top"
              />
            </View>
          )}
        </ScrollView>

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
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
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
  sectionTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
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
    color: nbColors.gray[700],
    marginBottom: nbSpacing.xs,
  },
  dangerLabel: {
    color: nbColors.danger,
  },
  value: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  description: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
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
  locationContainer: {
    padding: nbSpacing.md,
    backgroundColor: nbColors.gray[50],
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  locationText: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  rejectInputSection: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  rejectInputField: {
    minHeight: 100,
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
