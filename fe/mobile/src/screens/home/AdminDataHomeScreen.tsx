import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LoadingSpinner } from '../../components/common';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminPruningRequests } from '../../store/slices/pruningRequestsSlice';
import { setCurrentShift, setError } from '../../store/slices/shiftSlice';
import { shiftsApi } from '../../services/api';
import { formatDate, formatTime } from '../../utils/dateUtils';
import type { PruningRequest, PruningRequestStatus } from '../../types/models.types';

/**
 * Admin Data Home Screen (hi-fi HOME-3) — perantingan-disposition dashboard for
 * admin_data. Selected by the role-aware `HomeScreen` dispatcher. Reads the
 * rayon-scoped `pruningRequests.adminList`.
 */

const EMPTY_COUNTS = {
  submitted: 0,
  under_review: 0,
  approved: 0,
  rejected: 0,
  assigned: 0,
  in_progress: 0,
  done: 0,
  cancelled: 0,
} as const;

const INFLIGHT_STATUSES: PruningRequestStatus[] = ['assigned', 'in_progress'];

function inflightPill(status: PruningRequestStatus): { tone: StatusTone; label: string } {
  return status === 'in_progress'
    ? { tone: 'ok', label: 'Berjalan' }
    : { tone: 'warn', label: 'Ditugaskan' };
}

export function AdminDataHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { adminList, adminListLoading } = useAppSelector((state) => state.pruningRequests);
  const { currentShift } = useAppSelector((state) => state.shift);

  const [refreshing, setRefreshing] = useState(false);
  const [absensiExpanded, setAbsensiExpanded] = useState(false);

  const loadShift = useCallback(async () => {
    try {
      const response = await shiftsApi.getCurrentShift();
      if (!response.error) dispatch(setCurrentShift(response.data ?? null));
      else dispatch(setError(response.error));
    } catch {
      dispatch(setCurrentShift(null));
    }
  }, [dispatch]);

  const load = useCallback(async () => {
    await Promise.all([dispatch(fetchAdminPruningRequests({})), loadShift()]);
  }, [dispatch, loadShift]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasMountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      void load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleClockInOut = useCallback(() => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit' as never);
    } else {
      navigation.navigate('ClockInOut' as never);
    }
  }, [currentShift, navigation]);

  const counts = useMemo(() => {
    const c = { ...EMPTY_COUNTS } as Record<PruningRequestStatus, number>;
    const list = Array.isArray(adminList) ? adminList : [];
    list.forEach((r) => {
      if (r.status in c) c[r.status] += 1;
    });
    return c;
  }, [adminList]);

  const incoming = counts.submitted + counts.under_review;

  const inflight = useMemo(
    () => (Array.isArray(adminList) ? adminList : []).filter((r) => INFLIGHT_STATUSES.includes(r.status)),
    [adminList]
  );

  const goToQueue = useCallback(() => {
    navigation.navigate('PruningReviewQueue');
  }, [navigation]);

  const openRequest = useCallback(
    (request: PruningRequest) => {
      navigation.navigate('PruningDetail', { requestId: request.id, adminMode: true });
    },
    [navigation]
  );

  if (adminListLoading && adminList.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.background} patternColor={nbColors.primary} opacity={0.06}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} />}
        >
          {/* Perantingan-queue hero */}
          <View style={styles.hero} testID="perantingan-hero">
            <View style={styles.heroTopRow}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                Perantingan masuk
              </NBText>
              <StatusPill tone={counts.submitted > 0 ? 'warn' : 'neutral'} label={`${counts.submitted} baru`} />
            </View>
            <NBText variant="display" color="black" style={styles.heroValue}>
              {String(incoming)}
            </NBText>
            <NBText variant="mono-sm" color="gray700" style={styles.heroMeta}>
              menunggu disposisi
            </NBText>
            <View style={styles.heroButton}>
              <NBButton title="Buka antrian →" onPress={goToQueue} variant="primary" size="md" testID="open-queue" />
            </View>
          </View>

          {/* Disposition breakdown */}
          <HomeSectionDivider label="Breakdown disposisi" />
          <View style={styles.tilesRow}>
            <HomeStatTile label="Baru masuk" value={counts.submitted} variant="neutral" testID="disp-submitted" />
            <HomeStatTile label="Review" value={counts.under_review} variant="warn" testID="disp-review" />
          </View>
          <View style={styles.tilesRow}>
            <HomeStatTile label="Disetujui" value={counts.approved} variant="ok" testID="disp-approved" />
            <HomeStatTile label="Ditolak" value={counts.rejected} variant="bad" testID="disp-rejected" />
          </View>

          {/* Absensi card — collapsible when clocked in (prevents accidental clock-out) */}
          <HomeSectionDivider label="Absensi saya" />
          {currentShift ? (
            <TouchableOpacity
              style={styles.absensi}
              testID="absensi-card"
              activeOpacity={0.9}
              onPress={() => setAbsensiExpanded((prev) => !prev)}
              accessibilityRole="button"
              accessibilityState={{ expanded: absensiExpanded }}
            >
              <View style={styles.absensiTopRow}>
                <View style={styles.absensiClockArea}>
                  <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                    {currentShift.is_overtime ? 'Lembur aktif' : 'Sedang bertugas'}
                  </NBText>
                  <NBText variant="body-sm" color="gray700" style={styles.absensiMeta}>
                    {`Mulai ${formatTime(currentShift.clock_in_time)}`}
                  </NBText>
                </View>
                <MaterialCommunityIcons
                  name={absensiExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={nbColors.gray700}
                />
              </View>
              {absensiExpanded && (
                <View style={styles.absensiButton}>
                  <NBButton
                    title={currentShift.is_overtime ? 'Clock Out Lembur' : 'Clock Out'}
                    onPress={handleClockInOut}
                    variant="danger"
                    size="md"
                    testID="absensi-clock-button"
                  />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.absensi} testID="absensi-card">
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                Belum clock in
              </NBText>
              <NBText variant="h3" color="black" style={styles.absensiMeta}>
                Mulai shift hari ini
              </NBText>
              <View style={styles.absensiButton}>
                <NBButton
                  title="Clock In"
                  onPress={handleClockInOut}
                  variant="primary"
                  size="md"
                  testID="absensi-clock-button"
                />
              </View>
            </View>
          )}

          {/* Perantingan berjalan (assigned + in progress) */}
          {inflight.length > 0 && (
            <>
              <HomeSectionDivider
                label="Perantingan berjalan"
                trailing={<StatusPill tone="ok" label={`${inflight.length} aktif`} />}
              />
              <View style={styles.list}>
                {inflight.slice(0, 5).map((req) => {
                  const p = inflightPill(req.status);
                  return (
                    <HomeListRow
                      key={req.id}
                      pill={<StatusPill tone={p.tone} label={p.label} />}
                      title={req.kecamatanName || req.referenceCode}
                      meta={req.scheduledDate ? formatDate(req.scheduledDate) : 'Belum dijadwalkan'}
                      subMeta={req.referenceCode}
                      onPress={() => openRequest(req)}
                      testID={`inflight-${req.id}`}
                    />
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  content: { padding: nbSpacing.md, flexGrow: 1 },

  hero: {
    backgroundColor: nbColors.bgAccentLilac,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { letterSpacing: 0.6 },
  heroValue: { marginTop: nbSpacing.xs, letterSpacing: 1 },
  heroMeta: { marginTop: 2 },
  heroButton: { marginTop: nbSpacing.md },

  tilesRow: { flexDirection: 'row', gap: nbSpacing.sm, marginBottom: nbSpacing.sm },
  list: { gap: nbSpacing.sm },

  absensi: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  absensiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  absensiClockArea: { flex: 1 },
  absensiMeta: { marginTop: nbSpacing.xs },
  absensiButton: { marginTop: nbSpacing.md },
});

export default AdminDataHomeScreen;
