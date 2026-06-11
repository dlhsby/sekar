/**
 * Seed Detail Screen (Phase 3 3-12)
 * Displays seed details, recent transactions, and record-transaction form
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBBackgroundPattern, NBButton, NBText, NBCard, NBBadge, NBSkeleton } from '../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSeedById, fetchSeedTransactions } from '../../store/slices/plantSeedsSlice';
import { formatDate } from '../../utils/dateUtils';
import type { MainTabScreenProps } from '../../types/navigation.types';

const LOW_STOCK_THRESHOLD = 10;

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Pembelian',
  distribution: 'Distribusi',
  adjustment: 'Penyesuaian',
};

type Props = MainTabScreenProps<'SeedDetail'>;

export function SeedDetailScreen({ route }: Props): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { seedId } = route.params;

  const { byId, transactionsBySeed } = useAppSelector((state) => state.plantSeeds);
  const seed = byId[seedId];
  const transactions = transactionsBySeed[seedId] || [];

  const [refreshing, setRefreshing] = useState(false);
  const hasMountedRef = useRef(false);

  const load = useCallback(async () => {
    await Promise.all([
      dispatch(fetchSeedById(seedId)),
      dispatch(fetchSeedTransactions({ seedId })),
    ]);
  }, [dispatch, seedId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        void load();
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

  const handleRecordTransaction = useCallback(() => {
    navigation.navigate('SeedTransactionForm', { seedId });
  }, [navigation, seedId]);

  const isLowStock = seed && seed.stockQty < LOW_STOCK_THRESHOLD;
  const unitLabel = useMemo(() => {
    if (!seed) return '';
    return { gram: 'gram', piece: 'buah', packet: 'paket' }[seed.unit] || seed.unit;
  }, [seed]);

  return (
    <View style={styles.container}>
      <NBBackgroundPattern />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={nbColors.primary}
          />
        }
      >
        {/* Header Card */}
        {seed ? (
          <NBCard style={styles.headerCard}>
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <NBText variant="h2" style={styles.seedName}>
                  {seed.nameId}
                </NBText>
                {isLowStock && (
                  <NBBadge text="Stok Rendah" color="warning" size="sm" style={styles.lowStockBadge} />
                )}
              </View>

              <View style={styles.stockDisplay}>
                <NBText variant="caption" color="gray600" style={styles.stockLabel}>
                  Stok Saat Ini
                </NBText>
                <View style={styles.stockRow}>
                  <NBText variant="display" style={styles.stockNumber}>
                    {Math.floor(seed.stockQty)}
                  </NBText>
                  <NBText variant="body" color="gray600" style={styles.stockUnit}>
                    {unitLabel}
                  </NBText>
                </View>
              </View>
            </View>
          </NBCard>
        ) : (
          <>
            <NBSkeleton variant="card" style={{ height: 120, marginBottom: nbSpacing.md }} />
          </>
        )}

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <NBText variant="h3" style={styles.sectionTitle}>
              Riwayat Transaksi
            </NBText>
            <NBButton
              variant="primary"
              size="sm"
              onPress={handleRecordTransaction}
            >
              Catat
            </NBButton>
          </View>

          {transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.slice(0, 5).map((tx) => (
                <View key={tx.id} style={styles.transactionCard}>
                  <View style={styles.txHeader}>
                    <NBText variant="body-sm" color="gray600">
                      {formatDate(tx.occurredAt)}
                    </NBText>
                    <NBText variant="body-sm" style={styles.txType}>
                      {TRANSACTION_TYPE_LABELS[tx.transactionType] || tx.transactionType}
                    </NBText>
                  </View>
                  <View style={styles.txQty}>
                    <NBText variant="h3" style={styles.txQtyNumber}>
                      {tx.transactionType === 'distribution' ? '-' : '+'}
                      {Math.floor(tx.qty)}
                    </NBText>
                  </View>
                  {tx.notes && (
                    <NBText variant="body-sm" color="gray600" numberOfLines={1}>
                      {tx.notes}
                    </NBText>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTransactions}>
              <MaterialCommunityIcons
                name="history"
                size={32}
                color={nbColors.gray600}
              />
              <NBText variant="body-sm" color="gray600" style={styles.emptyText}>
                Belum ada transaksi
              </NBText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.white,
  },
  contentContainer: {
    paddingTop: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
  headerCard: {
    padding: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  headerContent: {
    gap: nbSpacing.lg,
  },
  headerText: {
    gap: nbSpacing.sm,
  },
  seedName: {
    fontWeight: '700',
  },
  lowStockBadge: {
    alignSelf: 'flex-start',
  },
  stockDisplay: {
    gap: nbSpacing.xs,
  },
  stockLabel: {
    fontWeight: '500',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: nbSpacing.sm,
  },
  stockNumber: {
    fontWeight: '800',
  },
  stockUnit: {
    fontWeight: '400',
  },
  transactionsSection: {
    gap: nbSpacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  transactionsList: {
    gap: nbSpacing.sm,
  },
  transactionCard: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray200,
    backgroundColor: nbColors.gray50,
    gap: nbSpacing.xs,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txType: {
    fontWeight: '600',
    color: nbColors.black,
  },
  txQty: {
    marginVertical: nbSpacing.xs,
  },
  txQtyNumber: {
    fontWeight: '700',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: nbSpacing.lg,
    gap: nbSpacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});
