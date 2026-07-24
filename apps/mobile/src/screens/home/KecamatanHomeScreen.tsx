import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../components/common';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { StatusPill, type StatusTone } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyPruningRequests } from '../../store/slices/pruningRequestsSlice';
import { formatDate } from '../../utils/dateUtils';
import type { PruningRequest, PruningRequestStatus } from '../../types/models.types';

/**
 * Kecamatan Home Screen (Phase 4 M3 Checkpoint 5) — "my requests" overview for
 * staff_kecamatan. No hi-fi frame exists; composed from `pruningRequests.mine`,
 * reusing the Home widgets.
 */

/** Status → pill tone + Indonesian label for a submitter's own request. */
function statusPill(status: PruningRequestStatus, t: any): { tone: StatusTone; label: string } {
  switch (status) {
    case 'approved':
      return { tone: 'ok', label: t('home:kecamatan.status.approved') };
    case 'rejected':
    case 'cancelled':
      return { tone: 'bad', label: status === 'rejected' ? t('home:kecamatan.status.rejected') : t('home:kecamatan.status.cancelled') };
    case 'assigned':
    case 'in_progress':
      return { tone: 'ok', label: status === 'in_progress' ? t('home:kecamatan.status.inProgress') : t('home:kecamatan.status.scheduled') };
    case 'done':
      return { tone: 'ok', label: t('home:kecamatan.status.done') };
    case 'under_review':
      return { tone: 'warn', label: t('home:kecamatan.status.underReview') };
    default:
      return { tone: 'neutral', label: t('home:kecamatan.status.waiting') };
  }
}

export function KecamatanHomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { mine, isLoading } = useAppSelector((state) => state.pruningRequests);
  const { user } = useAppSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchMyPruningRequests(undefined));
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

  const list = useMemo(() => (Array.isArray(mine) ? mine : []), [mine]);

  const counts = useMemo(() => {
    let waiting = 0;
    let approved = 0;
    let scheduled = 0;
    let done = 0;
    list.forEach((r) => {
      if (r.status === 'submitted' || r.status === 'under_review') waiting += 1;
      else if (r.status === 'approved') approved += 1;
      else if (r.status === 'assigned' || r.status === 'in_progress') scheduled += 1;
      else if (r.status === 'done') done += 1;
    });
    return { waiting, approved, scheduled, done };
  }, [list]);

  const recent = useMemo(
    () => [...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 5),
    [list]
  );

  const firstName = (user?.full_name ?? '').split(/\s+/)[0] || t('home:fallbacks.you');

  const goToSubmit = useCallback(() => {
    navigation.navigate('PerantinganSubmit');
  }, [navigation]);

  const openRequest = useCallback(
    (request: PruningRequest) => {
      navigation.navigate('PruningDetail', { requestId: request.id });
    },
    [navigation]
  );

  if (isLoading && list.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern pattern="dots" backgroundColor={nbColors.bgCanvas} patternColor={nbColors.primary} opacity={0.06}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[nbColors.primary]} />}
        >
          {/* Ringkasan hari ini — request overview */}
          <HomeSectionDivider label={t('home:kecamatan.sections.summary')} first />

          {/* My-requests hero */}
          <View style={styles.hero} testID="kecamatan-hero">
            <View style={styles.heroTopRow}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                {t('home:kecamatan.hero.label')}
              </NBText>
              <StatusPill tone={counts.waiting > 0 ? 'warn' : 'neutral'} label={t('home:kecamatan.hero.processingCount', { count: counts.waiting })} />
            </View>
            <NBText variant="display" color="black" style={styles.heroValue}>
              {String(list.length)}
            </NBText>
            <NBText variant="mono-sm" color="gray700" style={styles.heroMeta}>
              {t('home:kecamatan.hero.subtitle', { name: firstName })}
            </NBText>
            <View style={styles.heroButton}>
              <NBButton title={t('home:kecamatan.hero.button.submit')} onPress={goToSubmit} variant="primary" size="md" testID="kecamatan-submit" />
            </View>
          </View>

          {/* Status breakdown */}
          <View style={styles.tilesRow}>
            <HomeStatTile label={t('home:kecamatan.kpi.waiting')} value={counts.waiting} variant="warn" testID="kec-waiting" />
            <HomeStatTile label={t('home:kecamatan.kpi.approved')} value={counts.approved} variant="ok" testID="kec-approved" />
          </View>
          <View style={styles.tilesRow}>
            <HomeStatTile label={t('home:kecamatan.kpi.scheduled')} value={counts.scheduled} variant="info" testID="kec-scheduled" />
            <HomeStatTile label={t('home:kecamatan.kpi.done')} value={counts.done} variant="neutral" testID="kec-done" />
          </View>

          {/* Recent requests */}
          {recent.length > 0 ? (
            <>
              <HomeSectionDivider label={t('home:kecamatan.sections.recent')} />
              <View style={styles.list}>
                {recent.map((req) => {
                  const p = statusPill(req.status, t);
                  return (
                    <HomeListRow
                      key={req.id}
                      pill={<StatusPill tone={p.tone} label={p.label} />}
                      title={req.kecamatanName || req.referenceCode}
                      meta={req.createdAt ? formatDate(req.createdAt) : undefined}
                      subMeta={req.referenceCode}
                      onPress={() => openRequest(req)}
                      testID={`kec-req-${req.id}`}
                    />
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <HomeSectionDivider label={t('home:kecamatan.sections.recent')} />
              <NBText variant="body-sm" color="gray500" style={styles.emptyHint}>
                {t('home:kecamatan.empty.hint')}
              </NBText>
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
  content: { paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.sm, paddingBottom: nbSpacing.md, flexGrow: 1 },

  hero: {
    backgroundColor: nbColors.bgAccentYellow,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    // Intra-section gap to the tile rows below (same summary section).
    marginBottom: nbSpacing.sm,
    ...nbShadows.md,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { letterSpacing: 0.6 },
  heroValue: { marginTop: nbSpacing.xs, letterSpacing: 1 },
  heroMeta: { marginTop: 2 },
  heroButton: { marginTop: nbSpacing.md },

  tilesRow: { flexDirection: 'row', gap: nbSpacing.sm, marginBottom: nbSpacing.sm },
  list: { gap: nbSpacing.sm },
  emptyHint: { fontStyle: 'italic', paddingVertical: nbSpacing.sm },
});

export default KecamatanHomeScreen;
