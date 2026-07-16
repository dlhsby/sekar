import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../components/common';
import { NBBackgroundPattern, NBButton, NBText } from '../../components/nb';
import { StatusPill } from '../../components/home/StatusPill';
import { HomeSectionDivider } from '../../components/home/HomeSectionDivider';
import { HomeStatTile } from '../../components/home/HomeStatTile';
import { HomeListRow } from '../../components/home/HomeListRow';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLiveUsers } from '../../store/slices/monitoringSlice';

/**
 * Exec Home Screen (Phase 4 M3 Checkpoint 5) — city-wide overview for the
 * monitoring-first roles (management, admin_system, superadmin). No hi-fi
 * frame exists; composed from the role-scoped monitoring slice (the backend
 * returns city scope for these roles), reusing the Home widgets.
 */

interface RayonRow {
  key: string;
  name: string;
  active: number;
  total: number;
}

export function ExecHomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { liveUsers, statusCounts, isLoading } = useAppSelector((state) => state.monitoring);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchLiveUsers(undefined));
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

  const total = liveUsers.length;
  const active = statusCounts.active;

  // Per-rayon active/total roll-up (the city-distinctive section).
  const rayonRows = useMemo<RayonRow[]>(() => {
    const map = new Map<string, RayonRow>();
    liveUsers.forEach((u) => {
      const key = u.rayon_id ?? u.rayon_name ?? 'unknown';
      const name = u.rayon_name ?? t('home:fallbacks.noRayon');
      const entry = map.get(key) ?? { key, name, active: 0, total: 0 };
      entry.total += 1;
      if (u.status === 'active') entry.active += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [liveUsers]);

  const goToMonitoring = useCallback(() => {
    navigation.navigate('Monitoring');
  }, [navigation]);

  if (isLoading && total === 0) {
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
          {/* Ringkasan hari ini — city-wide overview */}
          <HomeSectionDivider label={t('home:exec.sections.summary')} />

          {/* City-overview hero */}
          <View style={styles.hero} testID="city-hero">
            <View style={styles.heroTopRow}>
              <NBText variant="mono-sm" color="gray700" uppercase style={styles.heroLabel}>
                {t('home:exec.hero.label')}
              </NBText>
              <StatusPill tone={active > 0 ? 'ok' : 'neutral'} label={t('home:exec.hero.status', { active, total })} />
            </View>
            <NBText variant="display" color="black" style={styles.heroValue}>
              {String(total)}
            </NBText>
            <NBText variant="mono-sm" color="gray700" style={styles.heroMeta}>
              {t('home:exec.hero.subtitle')}
            </NBText>
            <View style={styles.heroButton}>
              <NBButton title={t('home:exec.hero.button.seeMap')} onPress={goToMonitoring} variant="primary" size="md" testID="city-see-map" />
            </View>
          </View>

          {/* City personnel breakdown */}
          <View style={styles.tilesRow}>
            <HomeStatTile label={t('home:exec.kpi.active')} value={active} detail={t('home:exec.kpi.activeDetail', { total })} variant="ok" testID="city-active" />
            <HomeStatTile label={t('home:exec.kpi.outOfArea')} value={statusCounts.outside_area} variant="bad" testID="city-outside" />
          </View>
          <View style={styles.tilesRow}>
            <HomeStatTile label={t('home:exec.kpi.absent')} value={statusCounts.absent} variant="warn" testID="city-absent" />
            <HomeStatTile label={t('home:exec.kpi.offline')} value={statusCounts.offline} variant="neutral" testID="city-offline" />
          </View>

          {/* Per-rayon roll-up */}
          {rayonRows.length > 0 && (
            <>
              <HomeSectionDivider label={t('home:exec.sections.perRayon')} />
              <View style={styles.list}>
                {rayonRows.slice(0, 6).map((r) => (
                  <HomeListRow
                    key={r.key}
                    pill={<StatusPill tone={r.active > 0 ? 'ok' : 'neutral'} label={t('home:exec.rayon.status', { active: r.active, total: r.total })} />}
                    title={r.name}
                    subMeta={t('home:exec.rayon.detail', { active: r.active, total: r.total })}
                    onPress={goToMonitoring}
                    testID={`rayon-${r.key}`}
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
  content: { paddingHorizontal: nbSpacing.md, paddingTop: nbSpacing.sm, paddingBottom: nbSpacing.md, flexGrow: 1 },

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
  heroValue: { marginTop: nbSpacing.xs, letterSpacing: 1 },
  heroMeta: { marginTop: 2 },
  heroButton: { marginTop: nbSpacing.md },

  tilesRow: { flexDirection: 'row', gap: nbSpacing.sm, marginBottom: nbSpacing.sm },
  list: { gap: nbSpacing.sm },
});

export default ExecHomeScreen;
