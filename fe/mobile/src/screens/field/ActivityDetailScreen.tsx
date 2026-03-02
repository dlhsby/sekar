/**
 * Activity Detail Screen
 * Phase 2C: Read-only view with approval/rejection actions for authorized roles
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
import { getActivityById, approveActivity, rejectActivity } from '../../services/api/activitiesApi';
import { NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern, NBBadge, NBButton, NBCardTextInput } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import type { Activity } from '../../types/models.types';
import { useAppSelector } from '../../store/hooks';


function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getActivityStatusLabel(status?: string): string {
  switch (status) {
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'pending': return 'Menunggu Persetujuan';
    default: return 'Menunggu Persetujuan';
  }
}

function getActivityStatusVariant(status?: string): 'success' | 'danger' | 'gray' {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    default: return 'gray';
  }
}

export function ActivityDetailScreen(): React.JSX.Element {
  const navigation = useNavigation<MainTabScreenProps<'ActivityDetail'>['navigation']>();
  const route = useRoute<RouteProp<MainTabParamList, 'ActivityDetail'>>();
  const { activityId } = route.params;

  const user = useAppSelector((state) => state.auth.user);

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const response = await getActivityById(activityId);
        if (response.data) {
          setActivity(response.data);
        } else if (response.error) {
          Alert.alert('Error', response.error);
          navigation.navigate('TasksActivities', { initialTab: 'activities' });
        }
      } catch {
        Alert.alert('Error', 'Gagal memuat detail aktivitas');
        navigation.navigate('TasksActivities', { initialTab: 'activities' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [activityId, navigation]);

  // Determine if current user can approve/reject this activity
  const canApprove = useMemo(() => {
    if (!activity || !user || activity.status !== 'pending') {return false;}
    const submitterRole = activity.user?.role;
    if (user.role === 'korlap') {
      return (submitterRole === 'satgas' || submitterRole === 'linmas') &&
             user.area_id != null && activity.area_id === user.area_id;
    }
    if (user.role === 'kepala_rayon') {
      if (!user.rayon_id) {return false;}
      // Check rayon scope: activity area's rayon or submitter's rayon must match
      const inSameRayon =
        activity.area?.rayon_id === user.rayon_id ||
        activity.user?.rayon_id === user.rayon_id;
      return inSameRayon && (submitterRole === 'korlap' || submitterRole === 'admin_data');
    }
    return false;
  }, [activity, user]);

  const handleTolakPress = useCallback(() => {
    setShowRejectInput(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!activity || isSubmitting) {return;}
    Alert.alert('Konfirmasi', 'Setujui aktivitas ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Setuju',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const response = await approveActivity(activity.id);
            if (response.error) {
              Alert.alert('Error', response.error);
              return;
            }
            if (response.data) {setActivity(response.data);}
            Alert.alert('Berhasil', 'Aktivitas disetujui');
          } catch {
            Alert.alert('Error', 'Gagal menyetujui aktivitas');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }, [activity, isSubmitting]);

  const handleRejectSubmit = useCallback(async () => {
    if (!activity || !rejectReason.trim()) {
      Alert.alert('Error', 'Alasan penolakan wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await rejectActivity(activity.id, { reason: rejectReason.trim() });
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) {setActivity(response.data);}
      setShowRejectInput(false);
      setRejectReason('');
      Alert.alert('Berhasil', 'Aktivitas ditolak');
    } catch {
      Alert.alert('Error', 'Gagal menolak aktivitas');
    } finally {
      setIsSubmitting(false);
    }
  }, [activity, rejectReason]);

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

  if (!activity) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Aktivitas tidak ditemukan</Text>
          <NBButton
            title="Kembali"
            variant="secondary"
            onPress={() => navigation.navigate('TasksActivities', { initialTab: 'activities' })}
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
          {/* General Information Card - Merged Time & Worker */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📋 INFORMASI UMUM</Text>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Tanggal & Waktu</Text>
                <Text style={styles.value}>{formatDateTime(activity.created_at)}</Text>
              </View>
              {activity.user && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Nama Petugas</Text>
                  <Text style={styles.value}>{activity.user.full_name}</Text>
                </View>
              )}
              {activity.area?.name && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Area</Text>
                  <Text style={styles.value}>{activity.area.name}</Text>
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
                  text={getActivityStatusLabel(activity.status)}
                  color={getActivityStatusVariant(activity.status)}
                />
              </View>
            </NBCardHeader>
            <NBCardContent>
              {activity.status === 'rejected' && activity.rejection_reason && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Alasan Penolakan</Text>
                  <Text style={styles.value}>{activity.rejection_reason}</Text>
                </View>
              )}
              {activity.reviewer && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Direview Oleh</Text>
                  <Text style={styles.value}>{activity.reviewer.full_name}</Text>
                </View>
              )}
              {activity.reviewed_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Tanggal Review</Text>
                  <Text style={styles.value}>{formatDateTime(activity.reviewed_at)}</Text>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Photos Card - Matching creation form order */}
          {activity.photo_urls.length > 0 && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>📸 FOTO AKTIVITAS</Text>
                <Text style={styles.sectionSubtitle}>{activity.photo_urls.length} foto dilampirkan</Text>
              </NBCardHeader>
              <NBCardContent>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {activity.photo_urls.map((url, index) => (
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

          {/* Activity Type Card */}
          {activity.activityType && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>🏷️ JENIS AKTIVITAS</Text>
              </NBCardHeader>
              <NBCardContent>
                <Text style={styles.value}>{activity.activityType.name}</Text>
                {activity.activityType.description && (
                  <Text style={styles.description}>{activity.activityType.description}</Text>
                )}
              </NBCardContent>
            </NBCard>
          )}

          {/* Description Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <Text style={styles.sectionTitle}>📝 DESKRIPSI PEKERJAAN</Text>
            </NBCardHeader>
            <NBCardContent>
              <Text style={styles.descriptionText}>{activity.description}</Text>
            </NBCardContent>
          </NBCard>

          {/* GPS Location Card */}
          {activity.gps_lat != null && activity.gps_lng != null ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <Text style={styles.sectionTitle}>📍 LOKASI GPS</Text>
              </NBCardHeader>
              <NBCardContent>
                <View style={styles.locationContainer}>
                  <Text style={styles.locationText}>
                    {`${Number(activity.gps_lat).toFixed(6)}, ${Number(activity.gps_lng).toFixed(6)}`}
                  </Text>
                </View>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* Rejection reason input — shown inline in scroll when rejecting */}
          {canApprove && showRejectInput && (
            <NBCardTextInput
              title="📝 Alasan Penolakan"
              required
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Jelaskan alasan penolakan aktivitas ini..."
              maxLength={1000}
              numberOfLines={4}
              style={styles.rejectInputSection}
            />
          )}
        </ScrollView>

        {/* Fixed approval FAB — matching TasksActivityScreen FAB pattern */}
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
    paddingBottom: nbSpacing['4xl'],
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
