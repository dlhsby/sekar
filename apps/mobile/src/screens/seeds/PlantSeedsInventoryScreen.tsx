/**
 * Plant Seeds Inventory Screen (Phase 3 3-12)
 * Catalog list with stock info, low-stock badge, and recent transactions
 * Access: admin_rayon, management, admin_system, superadmin
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBBackgroundPattern, NBButton, NBText, NBCard, NBBadge, NBSkeleton } from '../../components/nb';
import { nbColors, nbSpacing, nbRadius } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSeeds, selectSeed } from '../../store/slices/plantSeedsSlice';
import type { PlantSeed } from '../../types/models.types';

const LOW_STOCK_THRESHOLD = 10;

interface SeedRowProps {
  seed: PlantSeed;
  onPress: (seed: PlantSeed) => void;
}

const SeedRow = React.memo(({ seed, onPress, t }: SeedRowProps & { t: any }) => {
  const isLowStock = seed.stockQty < LOW_STOCK_THRESHOLD;

  const unitLabel = useMemo(() => {
    const unitMap: Record<string, string> = {
      gram: t('seeds:units.gram'),
      piece: t('seeds:units.piece'),
      packet: t('seeds:units.packet'),
    };
    return unitMap[seed.unit] || seed.unit;
  }, [seed.unit, t]);

  return (
    <TouchableOpacity
      onPress={() => onPress(seed)}
      activeOpacity={0.7}
      style={styles.seedCardContainer}
    >
      <NBCard interactive style={styles.seedCard}>
        <View style={styles.seedRow}>
          <View style={styles.seedInfo}>
            <NBText variant="body" style={styles.seedName} numberOfLines={2}>
              {seed.nameId}
            </NBText>
            <View style={styles.unitBadge}>
              <NBText variant="caption" color="gray600">
                {unitLabel}
              </NBText>
            </View>
          </View>

          <View style={styles.stockSection}>
            <View style={styles.stockValue}>
              <NBText variant="h3" style={styles.stockNumber}>
                {Math.floor(seed.stockQty)}
              </NBText>
            </View>
            {isLowStock && (
              <NBBadge text={t('seeds:units.lowStock')} color="warning" size="sm" style={styles.lowStockBadge} />
            )}
          </View>
        </View>
      </NBCard>
    </TouchableOpacity>
  );
});

SeedRow.displayName = 'SeedRow';

export function PlantSeedsInventoryScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { seeds, isLoading, error } = useAppSelector((state) => state.plantSeeds);
  const [refreshing, setRefreshing] = useState(false);

  const hasMountedRef = useRef(false);

  const load = useCallback(async () => {
    await dispatch(fetchSeeds());
  }, [dispatch]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const handleSeedPress = useCallback(
    (seed: PlantSeed) => {
      dispatch(selectSeed(seed.id));
      navigation.navigate('SeedDetail', { seedId: seed.id });
    },
    [dispatch, navigation]
  );

  const seedsToRender = useMemo(() => {
    return seeds.sort((a, b) => a.nameId.localeCompare(b.nameId));
  }, [seeds]);

  const renderSeed = useCallback(
    ({ item }: { item: PlantSeed; index: number }) => (
      <SeedRow seed={item} onPress={handleSeedPress} t={t} />
    ),
    [handleSeedPress, t]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <NBSkeleton variant="card" style={{ height: 80, marginBottom: 12 }} />
          <NBSkeleton variant="card" style={{ height: 80, marginBottom: 12 }} />
          <NBSkeleton variant="card" style={{ height: 80 }} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color={nbColors.danger} />
          <NBText variant="body" color="danger" style={styles.errorText}>
            {t('seeds:inventory.error.title')}
          </NBText>
          <NBText variant="body-sm" color="gray600" style={styles.errorSubtext}>
            {error.error || t('seeds:inventory.error.description')}
          </NBText>
          <NBButton variant="primary" size="sm" onPress={() => void load()} style={styles.retryButton}>
            {t('seeds:inventory.retry')}
          </NBButton>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="leaf-outline" size={40} color={nbColors.gray600} />
        <NBText variant="body" color="gray600" style={styles.emptyText}>
          {t('seeds:inventory.empty')}
        </NBText>
      </View>
    );
  }, [isLoading, error, load, t]);

  return (
    <View style={styles.container}>
      <NBBackgroundPattern />

      <FlatList
        data={seedsToRender}
        renderItem={renderSeed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={nbColors.primary}
          />
        }
        scrollEnabled
        maxToRenderPerBatch={10}
        windowSize={21}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.white,
  },
  contentContainer: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
  seedCardContainer: {
    marginBottom: nbSpacing.md,
  },
  seedCard: {
    padding: nbSpacing.md,
  },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seedInfo: {
    flex: 1,
    marginRight: nbSpacing.md,
  },
  seedName: {
    marginBottom: nbSpacing.xs,
    fontWeight: '600',
  },
  unitBadge: {
    paddingVertical: 2,
    paddingHorizontal: nbSpacing.xs,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.gray50,
  },
  stockSection: {
    alignItems: 'flex-end',
    gap: nbSpacing.xs,
  },
  stockValue: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  stockNumber: {
    fontWeight: '700',
  },
  lowStockBadge: {
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    paddingHorizontal: nbSpacing.md,
  },
  emptyText: {
    marginTop: nbSpacing.md,
    textAlign: 'center',
  },
  errorText: {
    marginTop: nbSpacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: nbSpacing.xs,
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  retryButton: {
    marginTop: nbSpacing.sm,
  },
});
