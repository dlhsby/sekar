/**
 * Activity Detail Screen
 * Phase 2C: Read-only view with approval/rejection actions for authorized roles
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList, MainTabScreenProps } from '../../types/navigation.types';
import { getActivityById, approveActivity, rejectActivity } from '../../services/api/activitiesApi';
import { NBCard, NBCardHeader, NBCardContent, NBBackgroundPattern, NBBadge, NBButton, NBCardTextInput, NBText } from '../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
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

  // Optional caller-supplied back target (e.g. Home → "Aktivitas Hari Ini" passes
  // `from: 'Home'`). When unset, defaults to the Aktivitas list tab — so opening a
  // detail from the list returns to the list, and from Home returns to Home.
  const backTarget = (route.params as any)?.from as string | undefined;
  const backTargetParams = (route.params as any)?.fromParams as Record<string, unknown> | undefined;
  const handleBack = useCallback(() => {
    if (backTarget) {
      (navigation as any).navigate(backTarget, backTargetParams);
    } else {
      (navigation as any).navigate('Activities');
    }
  }, [backTarget, backTargetParams, navigation]);

  // Route Android hardware back through handleBack (not the Tab navigator's
  // default goBack, which lands on the previously-focused tab). Scoped to focus.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack]),
  );

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
          navigation.navigate('Activities');
        }
      } catch {
        Alert.alert('Error', 'Gagal memuat detail aktivitas');
        navigation.navigate('Activities');
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
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" style={styles.loadingTextMargin}>Memuat data...</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (!activity) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <NBText variant="body" style={styles.loadingTextMargin}>Aktivitas tidak ditemukan</NBText>
          <NBButton
            title="Kembali"
            variant="secondary"
            onPress={handleBack}
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
            canApprove && styles.contentContainerWithFooter,
            showRejectInput && styles.contentContainerWithReject,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* General Information Card - Merged Time & Worker */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="information-outline" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> INFORMASI UMUM</NBText>
              </View>
            </NBCardHeader>
            <NBCardContent>
              <View style={styles.infoRow}>
                <NBText variant="body-sm" style={styles.labelStyle}>Tanggal & Waktu</NBText>
                <NBText variant="body" style={styles.valueStyle}>{formatDateTime(activity.created_at)}</NBText>
              </View>
              {activity.user && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" style={styles.labelStyle}>Nama Petugas</NBText>
                  <NBText variant="body" style={styles.valueStyle}>{activity.user.full_name}</NBText>
                </View>
              )}
              {activity.area?.name && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" style={styles.labelStyle}>Area</NBText>
                  <NBText variant="body" style={styles.valueStyle}>{activity.area.name}</NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Status Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.statusRow}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={nbColors.black} />
                  <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> STATUS</NBText>
                </View>
                <NBBadge
                  text={getActivityStatusLabel(activity.status)}
                  color={getActivityStatusVariant(activity.status)}
                />
              </View>
            </NBCardHeader>
            <NBCardContent>
              {activity.status === 'rejected' && activity.rejection_reason && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" style={styles.labelStyle}>Alasan Penolakan</NBText>
                  <NBText variant="body" style={styles.valueStyle}>{activity.rejection_reason}</NBText>
                </View>
              )}
              {activity.reviewer && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" style={styles.labelStyle}>Direview Oleh</NBText>
                  <NBText variant="body" style={styles.valueStyle}>{activity.reviewer.full_name}</NBText>
                </View>
              )}
              {activity.reviewed_at && (
                <View style={styles.infoRow}>
                  <NBText variant="body-sm" style={styles.labelStyle}>Tanggal Review</NBText>
                  <NBText variant="body" style={styles.valueStyle}>{formatDateTime(activity.reviewed_at)}</NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Photos Card - Matching creation form order */}
          {activity.photo_urls.length > 0 && (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="camera" size={16} color={nbColors.black} />
                  <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> FOTO AKTIVITAS</NBText>
                </View>
                <NBText variant="body-sm" style={styles.sectionSubtitleStyle}>{activity.photo_urls.length} foto dilampirkan</NBText>
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
                      style={styles.photo as any}
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
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="tag-outline" size={16} color={nbColors.black} />
                  <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> JENIS AKTIVITAS</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <NBText variant="body" style={styles.valueStyle}>{activity.activityType.name}</NBText>
                {activity.activityType.description && (
                  <NBText variant="body-sm" style={styles.descriptionStyle}>{activity.activityType.description}</NBText>
                )}
              </NBCardContent>
            </NBCard>
          )}

          {/* Description Card */}
          <NBCard style={styles.card}>
            <NBCardHeader>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="text-box-outline" size={16} color={nbColors.black} />
                <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> DESKRIPSI PEKERJAAN</NBText>
              </View>
            </NBCardHeader>
            <NBCardContent>
              <NBText variant="body" style={styles.descriptionTextStyle}>{activity.description}</NBText>
            </NBCardContent>
          </NBCard>

          {/* GPS Location Card */}
          {activity.gps_lat != null && activity.gps_lng != null ? (
            <NBCard style={styles.card}>
              <NBCardHeader>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={nbColors.black} />
                  <NBText variant="mono-sm" uppercase style={styles.sectionTitleStyle}> LOKASI GPS</NBText>
                </View>
              </NBCardHeader>
              <NBCardContent>
                <View style={styles.locationContainer}>
                  <NBText variant="mono-sm" style={styles.locationTextStyle}>
                    {`${Number(activity.gps_lat).toFixed(6)}, ${Number(activity.gps_lng).toFixed(6)}`}
                  </NBText>
                </View>
              </NBCardContent>
            </NBCard>
          ) : null}

          {/* Rejection reason input — shown inline in scroll when rejecting */}
          {canApprove && showRejectInput && (
            <NBCardTextInput
              title="Alasan Penolakan"
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
  loadingTextMargin: {},
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleStyle: {},
  sectionSubtitleStyle: {
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
  labelStyle: {
    marginBottom: nbSpacing.xs,
  },
  valueStyle: {},
  descriptionStyle: {
    marginTop: nbSpacing.xs,
  },
  descriptionTextStyle: {},
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
  locationTextStyle: {},
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
