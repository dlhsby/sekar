import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LoadingSpinner } from '../../components/common';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminPruningRequests } from '../../store/slices/pruningRequestsSlice';
import { formatDate } from '../../utils/dateUtils';
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

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchAdminPruningRequests({}));
  }, [dispatch]);

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
});

export default AdminDataHomeScreen;
