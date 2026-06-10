/**
 * MonitoringSearchModal — fullscreen search over the monitoring map's petugas /
 * area / rayon, opened from the map search bar.
 *
 * - Autofocused search field (typing happens here, not on the map bar).
 * - Empty query → "Terakhir dilihat" recents list + "Hapus semua".
 * - As you type → results in tabs [Semua, Petugas, Area, Rayon]; the Semua tab
 *   groups results by type. Selecting a result bubbles up via onSelect.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { NBTab } from '../nb/NBTab';
import { NBEmptyState } from '../nb/NBEmptyState';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbType,
  withAlpha,
} from '../../constants/nbTokens';
import {
  useMonitoringSearch,
  type SearchResult,
  type SearchResultType,
} from '../../hooks/useMonitoringSearch';
import { getRecentSearches, clearRecentSearches } from '../../services/storage/recentSearches';
import type { LiveUser, RayonBoundary } from '../../types/models.types';

// ─── Type metadata (icon + accent per entity type) ─────────────────────────────

const TYPE_META: Record<SearchResultType, { icon: string; accent: string }> = {
  petugas: { icon: 'account', accent: nbColors.primary },
  area: { icon: 'map-marker', accent: nbColors.warning },
  rayon: { icon: 'office-building', accent: nbColors.requestUnderReview },
};

type Tab = 'semua' | SearchResultType;

interface MonitoringSearchModalProps {
  visible: boolean;
  onClose: () => void;
  liveUsers: LiveUser[];
  rayons: RayonBoundary[] | undefined;
  onSelect: (result: SearchResult) => void;
}

// ─── Result row ────────────────────────────────────────────────────────────────

const ResultRow = React.memo(function ResultRow({
  result,
  onPress,
}: {
  result: SearchResult;
  onPress: () => void;
}): React.JSX.Element {
  const meta = TYPE_META[result.type];
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Pilih ${result.name}`}
      testID={`search-result-${result.type}-${result.id}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(meta.accent, 0.16), borderColor: meta.accent }]}>
        <MaterialCommunityIcons name={meta.icon} size={18} color={meta.accent} />
      </View>
      <View style={styles.rowText}>
        <NBText variant="body-sm" color="black" numberOfLines={1} style={styles.rowTitle}>
          {result.name}
        </NBText>
        {result.subtitle ? (
          <NBText variant="caption" color="gray600" numberOfLines={1}>
            {result.subtitle}
          </NBText>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={nbColors.gray400} />
    </TouchableOpacity>
  );
});

// ─── Component ────────────────────────────────────────────────────────────────

type FlatRow =
  | { kind: 'header'; title: string }
  | { kind: 'result'; result: SearchResult };

export function MonitoringSearchModal({
  visible,
  onClose,
  liveUsers,
  rayons,
  onSelect,
}: MonitoringSearchModalProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('semua');
  const [recents, setRecents] = useState<SearchResult[]>([]);

  const results = useMonitoringSearch(liveUsers, rayons, query);
  const hasQuery = query.trim().length > 0;

  // Load recents + reset query/tab whenever the modal opens. Guard the async
  // setState so it can't fire after the modal closes/unmounts.
  useEffect(() => {
    if (!visible) { return; }
    let active = true;
    setQuery('');
    setTab('semua');
    getRecentSearches().then((r) => {
      if (active) { setRecents(r); }
    });
    return () => { active = false; };
  }, [visible]);

  const handleClearAll = useCallback(() => {
    clearRecentSearches().then(() => setRecents([]));
  }, []);

  const tabs = useMemo(
    () => [
      { key: 'semua', label: 'Semua', count: results.total },
      { key: 'petugas', label: 'Petugas', count: results.petugas.length },
      { key: 'area', label: 'Area', count: results.area.length },
      { key: 'rayon', label: 'Rayon', count: results.rayon.length },
    ],
    [results],
  );

  // Flattened rows for the active tab (Semua → type-grouped sections).
  const rows = useMemo<FlatRow[]>(() => {
    if (tab === 'semua') {
      return results.semua.flatMap((s) => [
        { kind: 'header' as const, title: s.title },
        ...s.data.map((r) => ({ kind: 'result' as const, result: r })),
      ]);
    }
    return results[tab].map((r) => ({ kind: 'result' as const, result: r }));
  }, [tab, results]);

  const renderRow = useCallback(
    ({ item }: { item: FlatRow }) =>
      item.kind === 'header' ? (
        <NBText variant="mono-sm" uppercase color="gray600" style={styles.sectionHeader}>
          {item.title}
        </NBText>
      ) : (
        <ResultRow result={item.result} onPress={() => onSelect(item.result)} />
      ),
    [onSelect],
  );

  return (
    <NBModal visible={visible} onClose={onClose} type="fullscreen" title="Pencarian" noPadding>
      <View style={styles.body}>
        {/* Search field */}
        <View style={styles.searchField}>
          <MaterialCommunityIcons name="magnify" size={20} color={nbColors.gray500} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Cari petugas, area, rayon…"
            placeholderTextColor={nbColors.gray400}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            testID="monitoring-search-input"
          />
          {hasQuery ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Bersihkan"
              testID="monitoring-search-clear"
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.gray400} />
            </TouchableOpacity>
          ) : null}
        </View>

        {hasQuery ? (
          <>
            <NBTab
              scrollable
              tabs={tabs}
              activeTab={tab}
              onTabChange={(k) => setTab(k as Tab)}
              style={styles.tabs}
            />
            <FlatList
              style={styles.list}
              data={rows}
              keyExtractor={(item) =>
                item.kind === 'header' ? `header-${item.title}` : `${item.result.type}-${item.result.id}`
              }
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={rows.length === 0 ? styles.listEmpty : styles.listContent}
              maxToRenderPerBatch={10}
              windowSize={10}
              ListEmptyComponent={
                <NBEmptyState
                  variant="noData"
                  illustration="illo-search"
                  title="Tidak Ada Hasil"
                  description={`Tidak ada yang cocok dengan "${query.trim()}".`}
                />
              }
            />
          </>
        ) : (
          <FlatList
            style={styles.list}
            data={recents}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={({ item }) => <ResultRow result={item} onPress={() => onSelect(item)} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={recents.length === 0 ? styles.listEmpty : styles.listContent}
            maxToRenderPerBatch={10}
            windowSize={10}
            ListHeaderComponent={
              recents.length > 0 ? (
                <View style={styles.recentsHeader}>
                  <NBText variant="mono-sm" uppercase color="gray600">
                    Terakhir dilihat
                  </NBText>
                  <TouchableOpacity
                    onPress={handleClearAll}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus semua pencarian terakhir"
                    testID="recents-clear-all"
                  >
                    <NBText variant="caption" color="danger" style={styles.clearAll}>
                      Hapus semua
                    </NBText>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <NBEmptyState
                variant="noData"
                illustration="illo-search"
                title="Mulai Mencari"
                description="Cari petugas, area, atau rayon untuk menemukannya di peta."
              />
            }
          />
        )}
      </View>
    </NBModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: nbColors.white,
  },
  // NB bordered input pill.
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    height: 46,
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm + 2,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: nbType.body.fontSize,
    color: nbColors.black,
    paddingVertical: 0,
  },
  tabs: {
    marginBottom: nbSpacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: nbSpacing.xl,
  },
  // Lets the empty state fill + center the available space.
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xs,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xs,
  },
  clearAll: {
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthThin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontWeight: '600',
  },
});

export default MonitoringSearchModal;
