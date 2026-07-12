/**
 * Asset Return Screen
 * Phase 5-3: Return asset with condition assessment
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
import { useTranslation } from 'react-i18next';
import {
  NBBackgroundPattern,
  NBButton,
  NBCard,
  NBCardContent,
  NBEmptyState,
  NBPageHeader,
  NBText,
  NBTextInput,
  NBAlert,
} from '../../components/nb';
import { ConditionSelector } from './components/ConditionSelector';
import {
  fetchAsset,
  returnAsset,
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
  navigation: NativeStackNavigationProp<MainTabParamList, 'AssetReturn'>;
  route: RouteProp<MainTabParamList, 'AssetReturn'>;
};

export function AssetReturnScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { assetId } = route.params;
  const asset = useAppSelector(selectSelectedAsset);
  const loading = useAppSelector(selectAssetsLoading);
  const submitting = useAppSelector(selectAssetsSubmitting);
  const error = useAppSelector(selectAssetsError);

  const [condition, setCondition] = useState<AssetCondition | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Fetch asset if not already loaded
  useFocusEffect(
    useCallback(() => {
      if (!asset || asset.id !== assetId) {
        dispatch(fetchAsset(assetId));
      }
    }, [dispatch, assetId, asset]),
  );

  const onReturn = useCallback(async () => {
    if (!asset || !condition) {
      return;
    }

    const payload: any = {
      condition_at_return: condition,
    };

    if (notes.trim()) {
      payload.notes = notes.trim();
    }

    const result = await dispatch(
      returnAsset({
        assetId: asset.id,
        payload,
      }),
    );

    if (result.payload) {
      // Navigate back to list
      navigation.navigate('Assets');
    }
  }, [asset, condition, notes, dispatch, navigation]);

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
          <NBPageHeader title={t('assets:return.title')} />
          <NBEmptyState
            title={t('assets:return.notFound.title')}
            description={t('assets:return.notFound.description')}
            variant="error"
          />
        </SafeAreaView>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NBPageHeader title={t('assets:return.title')} />

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
                  {t('assets:return.fields.code')}
                </NBText>
                <NBText variant="body-sm" style={styles.value}>
                  {asset.asset_code}
                </NBText>
              </View>

              {asset.category && (
                <View style={styles.infoRow}>
                  <NBText variant="caption" style={styles.label}>
                    {t('assets:return.fields.category')}
                  </NBText>
                  <NBText variant="body-sm" style={styles.value}>
                    {asset.category.name}
                  </NBText>
                </View>
              )}

              {asset.location && (
                <View style={styles.infoRow}>
                  <NBText variant="caption" style={styles.label}>
                    {t('assets:return.fields.location')}
                  </NBText>
                  <NBText variant="body-sm" style={styles.value}>
                    {asset.location.name}
                  </NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* Error Alert */}
          {error && (
            <NBAlert
              variant="warning"
              title={t("common:error")}
              message={error}
            />
          )}

          {/* Condition Selector */}
          <ConditionSelector
            value={condition}
            onSelect={setCondition}
            isReturn={true}
            label={t('assets:return.conditionLabel')}
          />

          {/* Notes */}
          <View style={styles.section}>
            <NBText variant="body" style={styles.sectionLabel}>
              {t('assets:return.notes')}
            </NBText>
            <NBTextInput
              placeholder={t('assets:return.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={!submitting}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <NBButton
              label={t('assets:return.confirm')}
              onPress={onReturn}
              variant="primary"
              disabled={!canSubmit}
              loading={submitting}
            />
            <NBButton
              label={t('assets:return.cancel')}
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
  actions: {
    gap: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
});
