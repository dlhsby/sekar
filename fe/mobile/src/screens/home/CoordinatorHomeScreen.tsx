import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LoadingSpinner, RoleAvatar } from '../../components/common';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLiveUsers } from '../../store/slices/monitoringSlice';
import { setCurrentShift, setError } from '../../store/slices/shiftSlice';
import { shiftsApi } from '../../services/api';
import { formatRelativeTime, formatTime } from '../../utils/dateUtils';

/**
 * Coordinator Home Screen (hi-fi HOME-2) — team-oversight dashboard for korlap
 * and kepala_rayon. Selected by the role-aware `HomeScreen` dispatcher.
 *
 * Reads the role-scoped monitoring slice (the backend scopes `getLiveUsers` to
 * the caller's team): team-status hero → 5-status KPI grid → derived alerts.
 */

interface TeamAlert {
  id: string;
  tone: StatusTone;
  pill: string;
  title: string;
  meta?: string;
  sub?: string;
}

export function CoordinatorHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { liveUsers, statusCounts, isLoading } = useAppSelector((state) => state.monitoring);
  const viewerRole = useAppSelector((state) => state.auth.user?.role);
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
    await Promise.all([dispatch(fetchLiveUsers(undefined)), loadShift()]);
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

  const total = liveUsers.length;
  const active = statusCounts.active;

  // Derived alerts: out-of-area + missing personnel (no SLA feed on mobile).
  const alerts = useMemo<TeamAlert[]>(() => {
    const out = liveUsers
      .filter((u) => u.status === 'outside_area' || u.outside_boundary)
      .map((u) => ({
        id: `out-${u.id}`,
        tone: 'bad' as StatusTone,
        pill: 'Di luar area',
        title: `${u.full_name} keluar area`,
        meta: formatRelativeTime(u.last_update),
        sub: u.area_name || undefined,
      }));
    const missing = liveUsers
      .filter((u) => u.status === 'missing')
      .map((u) => ({
        id: `miss-${u.id}`,
        tone: 'warn' as StatusTone,
        pill: 'Tidak hadir',
        title: `${u.full_name} tidak hadir`,
        meta: formatRelativeTime(u.last_update),
        sub: u.area_name || undefined,
      }));
    return [...out, ...missing];
  }, [liveUsers]);

  const outsideNames = useMemo(
    () =>
      liveUsers
        .filter((u) => u.status === 'outside_area' || u.outside_boundary)
        .map((u) => u.full_name.split(/\s+/)[0])
        .slice(0, 2)
        .join(' · '),
    [liveUsers]
  );

  const goToMonitoring = useCallback(() => {
    navigation.navigate('Monitoring');
  }, [navigation]);

  if (isLoading && total === 0) {
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
          {/* Team-status hero */}
          <View style={styles.hero} testID="team-hero">
            <View style={styles.heroTopRow}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                Tim hari ini
              </NBText>
              <StatusPill tone={active > 0 ? 'ok' : 'neutral'} label={`${active}/${total} aktif`} />
            </View>
            {total > 0 ? (
              <View
                style={styles.avatars}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {liveUsers.slice(0, 6).map((u) => (
                  <RoleAvatar
                    key={u.id}
                    name={u.full_name}
                    role={viewerRole}
                    size={30}
                    radius={nbRadius.full}
                  />
                ))}
                {total > 6 && (
                  <View style={[styles.avatar, styles.avatarMore]}>
                    <NBText variant="mono-sm" color="gray700" style={styles.avatarText}>
                      {`+${total - 6}`}
                    </NBText>
                  </View>
                )}
              </View>
            ) : (
              <NBText variant="body-sm" color="gray600" style={styles.heroEmpty}>
                Belum ada anggota tim aktif.
              </NBText>
            )}
            <View style={styles.heroButton}>
              <NBButton title="Lihat semua →" onPress={goToMonitoring} variant="secondary" size="md" testID="team-see-all" />
            </View>
          </View>

          {/* KPI grid (5-status breakdown — the data cleanly available to korlap) */}
          <View style={styles.tilesRow}>
            <HomeStatTile label="Tim aktif" value={active} detail={`dari ${total}`} variant="ok" testID="kpi-active" />
            <HomeStatTile
              label="Di luar area"
              value={statusCounts.outside_area}
              detail={outsideNames || undefined}
              variant="bad"
              testID="kpi-outside"
            />
          </View>
          <View style={styles.tilesRow}>
            <HomeStatTile label="Tidak hadir" value={statusCounts.missing} variant="warn" testID="kpi-missing" />
            <HomeStatTile label="Offline" value={statusCounts.offline} variant="neutral" testID="kpi-offline" />
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

          {/* Peringatan — derived from live users (out-of-area + missing) */}
          {alerts.length > 0 && (
            <>
              <HomeSectionDivider label={`Peringatan · ${alerts.length}`} />
              <View style={styles.list}>
                {alerts.slice(0, 4).map((a) => (
                  <HomeListRow
                    key={a.id}
                    pill={<StatusPill tone={a.tone} label={a.pill} />}
                    title={a.title}
                    meta={a.meta}
                    subMeta={a.sub}
                    onPress={goToMonitoring}
                    testID={`alert-${a.id}`}
                  />
                ))}
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
    backgroundColor: nbColors.bgAccentMint,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { letterSpacing: 0.6 },
  heroEmpty: { marginTop: nbSpacing.sm },
  heroButton: { marginTop: nbSpacing.md },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: nbSpacing.xs, marginTop: nbSpacing.sm },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: nbRadius.full,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMore: { backgroundColor: nbColors.gray200 },
  avatarText: { fontSize: 11, fontWeight: '700' },

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

export default CoordinatorHomeScreen;
