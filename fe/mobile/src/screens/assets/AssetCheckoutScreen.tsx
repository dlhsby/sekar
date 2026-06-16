/**
 * Asset Checkout Screen
 * Phase 5-3: Confirm asset checkout with condition and optional return date
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  NBBackgroundPattern,
  NBButton,
  NBCard,
  NBCardContent,
  NBDatePicker,
  NBEmptyState,
  NBPageHeader,
  NBText,
  NBTextInput,
} from '../../components/nb';
import { ConditionSelector } from './components/ConditionSelector';
import {
  fetchAsset,
  checkoutAsset,
  selectSelectedAsset,
  selectAssetsLoading,
  selectAssetsSubmitting,
  selectAssetsError,
} from '../../store/slices/assetsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { AssetCondition } from '../../types/assets.types';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'AssetCheckout'>;
  route: RouteProp<MainTabParamList, 'AssetCheckout'>;
};

export function AssetCheckoutScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { assetId } = route.params;
  const asset = useAppSelector(selectSelectedAsset);
  const loading = useAppSelector(selectAssetsLoading);
  const submitting = useAppSelector(selectAssetsSubmitting);
  const error = useAppSelector(selectAssetsError);

  const [condition, setCondition] = useState<AssetCondition | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState<Date | null>(null);

  // Fetch asset if not already loaded
  useFocusEffect(
    useCallback(() => {
      if (!asset || asset.id !== assetId) {
        dispatch(fetchAsset(assetId));
      }
    }, [dispatch, assetId, asset]),
  );

  const onCheckout = useCallback(async () => {
    if (!asset || !condition) {
      return;
    }

    const payload: any = {
      condition_at_checkout: condition,
    };

    if (notes.trim()) {
      payload.notes = notes.trim();
    }

    if (expectedReturnDate) {
      payload.expected_return_at = expectedReturnDate.toISOString();
    }

    const result = await dispatch(
      checkoutAsset({
        assetId: asset.id,
        payload,
      }),
    );

    if (result.payload) {
      // Navigate back to list and show success
      navigation.navigate('Assets');
    }
  }, [asset, condition, notes, expectedReturnDate, dispatch, navigation]);

  const canSubmit = condition !== undefined && !submitting && !loading;

  if (loading) {
    return (
      <NBBackgroundPattern>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={nbColors.primary} />
          </View>
        </SafeAreaView>
      </NBBackgroundPattern>
    );
  }

  if (!asset) {
    return (
      <NBBackgroundPattern>
        <SafeAreaView style={styles.safeArea}>
          <NBPageHeader title="Pinjam Aset" />
          <NBEmptyState
            title="Aset tidak ditemukan"
            description="Silakan coba lagi"
            variant="error"
          />
        </SafeAreaView>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NBPageHeader title="Pinjam Aset" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Asset Summary */}
          <NBCard variant="default">
            <View style={styles.cardTitle}>
              <NBText variant="body-lg">{asset.name}</NBText>
            </View>
            <NBCardContent>
              <View style={styles.infoRow}>
                <NBText variant="caption" style={styles.label}>
                  Kode
                </NBText>
                <NBText variant="body-sm" style={styles.value}>
                  {asset.asset_code}
                </NBText>
              </View>

              {asset.category && (
                <View style={styles.infoRow}>
                  <NBText variant="caption" style={styles.label}>
                    Kategori
                  </NBText>
                  <NBText variant="body-sm" style={styles.value}>
                    {asset.category.name}
                  </NBText>
                </View>
              )}

              {asset.area && (
                <View style={styles.infoRow}>
                  <NBText variant="caption" style={styles.label}>
                    Area
                  </NBText>
                  <NBText variant="body-sm" style={styles.value}>
                    {asset.area.name}
                  </NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Error Alert */}
          {error && (
            <NBCard variant="default">
              <NBText style={styles.errorText}>{error}</NBText>
            </NBCard>
          )}

          {/* Condition Selector */}
          <ConditionSelector
            value={condition}
            onSelect={setCondition}
            isReturn={false}
            label="Kondisi Saat Pinjam"
          />

          {/* Notes */}
          <View style={styles.section}>
            <NBText variant="body" style={styles.sectionLabel}>
              Catatan (Opsional)
            </NBText>
            <NBTextInput
              placeholder="Catatan pinjam aset..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={!submitting}
            />
          </View>

          {/* Expected Return Date */}
          <View style={styles.section}>
            <NBText variant="body" style={styles.sectionLabel}>
              Tanggal Pengembalian Diharapkan (Opsional)
            </NBText>
            <NBDatePicker
              value={expectedReturnDate}
              onChange={setExpectedReturnDate}
              placeholder="Pilih tanggal"
              disabled={submitting}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <NBButton
              label="Konfirmasi Pinjam"
              onPress={onCheckout}
              variant="primary"
              disabled={!canSubmit}
              loading={submitting}
            />
            <NBButton
              label="Batal"
              onPress={() => navigation.goBack()}
              variant="secondary"
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    gap: nbSpacing.md,
  },
  cardTitle: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    marginBottom: nbSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: nbSpacing.sm,
  },
  label: {
    color: nbColors.gray500,
    flex: 1,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  section: {
    gap: nbSpacing.sm,
  },
  sectionLabel: {
    fontWeight: '600',
  },
  errorText: {
    color: nbColors.danger,
  },
  actions: {
    gap: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
});
