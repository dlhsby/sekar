/**
 * Asset Detail Screen
 * Phase 5-3: View asset info, QR code, assignment history
 */

import React, { useState, useCallback } from 'react';
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
} from '../../components/nb';
import { AssetQRDisplay } from './components/AssetQRDisplay';
import {
  fetchAsset,
  fetchAssetAssignments,
  selectSelectedAsset,
  selectAssetsLoading,
} from '../../store/slices/assetsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { AssetAssignment } from '../../types/assets.types';

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'AssetDetail'>;
  route: RouteProp<MainTabParamList, 'AssetDetail'>;
};

export function AssetDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { assetId } = route.params;
  const asset = useAppSelector(selectSelectedAsset);
  const loading = useAppSelector(selectAssetsLoading);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const currentUser = useAppSelector((state) => state.auth.user);
  const { canCheckoutAsset, canReturnAsset } = useAssetRoleAccess();

  const STATUS_LABELS: Record<string, string> = {
    available: t('assets:status.available'),
    in_use: t('assets:status.inUse'),
    maintenance: t('assets:status.maintenance'),
    retired: t('assets:status.retired'),
    lost: t('assets:status.lost'),
  };

  const CONDITION_LABELS: Record<string, string> = {
    good: t('assets:condition.good'),
    fair: t('assets:condition.fair'),
    poor: t('assets:condition.poor'),
    damaged: t('assets:condition.damaged'),
    unusable: t('assets:condition.unusable'),
  };

  // Fetch asset detail on mount
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchAsset(assetId));
      setAssignmentsLoading(true);
      dispatch(fetchAssetAssignments(assetId)).then((action) => {
        if (action.payload) {
          setAssignments(action.payload as AssetAssignment[]);
        }
        setAssignmentsLoading(false);
      });
    }, [dispatch, assetId]),
  );

  const canCheckout = useCallback(() => {
    if (!asset || !currentUser) return false;
    return (
      asset.status === 'available' &&
      canCheckoutAsset &&
      ['satgas', 'linmas', 'korlap'].includes(currentUser.role)
    );
  }, [asset, currentUser, canCheckoutAsset]);

  const canReturn = useCallback(() => {
    if (!asset || !currentUser) return false;
    const activeAssignment = assignments.find((a) => !a.returned_at);
    return (
      !!activeAssignment &&
      activeAssignment.assigned_to === currentUser.id &&
      canReturnAsset &&
      ['satgas', 'linmas', 'korlap'].includes(currentUser.role)
    );
  }, [asset, assignments, currentUser, canReturnAsset]);

  const onCheckout = useCallback(() => {
    if (!asset) return;
    navigation.navigate('AssetCheckout', { assetId: asset.id });
  }, [navigation, asset]);

  const onReturn = useCallback(() => {
    if (!asset) return;
    navigation.navigate('AssetReturn', { assetId: asset.id });
  }, [navigation, asset]);

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
          <NBPageHeader title={t('assets:detail.title')} />
          <NBEmptyState
            title={t('assets:detail.notFound.title')}
            description={t('assets:detail.notFound.description')}
            variant="error"
          />
        </SafeAreaView>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NBPageHeader title={t('assets:detail.title')} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Asset Info Card */}
          <NBCard variant="default">
            <View style={styles.cardTitle}>
              <NBText variant="body-lg">{asset.name}</NBText>
            </View>
            <NBCardContent>
              <View style={styles.infoRow}>
                <NBText variant="caption" style={styles.label}>
                  {t('assets:detail.fields.code')}
                </NBText>
                <NBText variant="body-sm" style={styles.value}>
                  {asset.asset_code}
                </NBText>
              </View>

              <View style={styles.infoRow}>
                <NBText variant="caption" style={styles.label}>
                  {t('assets:detail.fields.category')}
                </NBText>
                <NBText variant="body-sm" style={styles.value}>
                  {asset.category?.name || '-'}
                </NBText>
              </View>

              <View style={styles.infoRow}>
                <NBText variant="caption" style={styles.labelGray}>
                  {t('assets:detail.fields.status')}
                </NBText>
                <NBText variant="body-sm" style={styles.value}>
                  {STATUS_LABELS[asset.status] || asset.status}
                </NBText>
              </View>

              <View style={styles.infoRow}>
                <NBText variant="caption" style={styles.label}>
                  {t('assets:detail.fields.condition')}
                </NBText>
                <NBText variant="body-sm" style={styles.value}>
                  {CONDITION_LABELS[asset.condition] || asset.condition}
                </NBText>
              </View>

              {asset.area && (
                <View style={styles.infoRow}>
                  <NBText variant="caption" style={styles.label}>
                    {t('assets:detail.fields.area')}
                  </NBText>
                  <NBText variant="body-sm" style={styles.value}>
                    {asset.area.name}
                  </NBText>
                </View>
              )}

              {asset.description && (
                <View style={styles.infoRow}>
                  <NBText variant="caption" style={styles.label}>
                    {t('assets:detail.fields.description')}
                  </NBText>
                  <NBText variant="body-sm" style={styles.value}>
                    {asset.description}
                  </NBText>
                </View>
              )}
            </NBCardContent>
          </NBCard>

          {/* QR Code */}
          {asset.qr_code_url && (
            <AssetQRDisplay
              qrCodeUrl={asset.qr_code_url}
              assetCode={asset.asset_code}
            />
          )}

          {/* Assignment History */}
          <NBCard variant="default">
            <View style={styles.cardTitle}>
              <NBText variant="body-lg">{t('assets:detail.assignmentHistory')}</NBText>
            </View>
            <NBCardContent>
              {assignmentsLoading ? (
                <ActivityIndicator size="small" color={nbColors.primary} />
              ) : assignments.length > 0 ? (
                <View style={styles.assignmentsList}>
                  {assignments.map((assignment) => (
                    <View key={assignment.id} style={styles.assignmentItem}>
                      <NBText variant="body-sm" style={styles.assignmentUser}>
                        {assignment.assignedTo?.full_name || 'Unknown'}
                      </NBText>
                      <NBText variant="caption" style={styles.assignmentDate}>
                        {new Date(assignment.checked_out_at).toLocaleDateString('id-ID')}
                      </NBText>
                      {assignment.returned_at && (
                        <NBText variant="caption" style={styles.returnedDate}>
                          {t('assets:detail.returnedLabel')}: {new Date(assignment.returned_at).toLocaleDateString('id-ID')}
                        </NBText>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <NBText variant="body-sm" style={styles.noAssignments}>
                  {t('assets:detail.noAssignments')}
                </NBText>
              )}
            </NBCardContent>
          </NBCard>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {canCheckout() && (
              <NBButton
                label={t('assets:detail.checkout')}
                onPress={onCheckout}
                variant="primary"
              />
            )}
            {canReturn() && (
              <NBButton
                label={t('assets:detail.return')}
                onPress={onReturn}
                variant="secondary"
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

/**
 * Local hook for asset-specific role access
 * User role types: satgas | linmas | korlap | admin_data | kepala_rayon | top_management | admin_system | superadmin
 */
function useAssetRoleAccess() {
  const user = useAppSelector((state) => state.auth.user);

  const canCheckoutAsset = ['satgas', 'linmas', 'korlap'].includes(user?.role || '');
  const canReturnAsset = ['satgas', 'linmas', 'korlap'].includes(user?.role || '');

  return { canCheckoutAsset, canReturnAsset };
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
  labelGray: {
    color: nbColors.gray500,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  assignmentsList: {
    gap: nbSpacing.md,
  },
  assignmentItem: {
    paddingBottom: nbSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray200,
  },
  assignmentUser: {
    fontWeight: '600',
  },
  assignmentDate: {
    color: nbColors.gray500,
    marginTop: nbSpacing.xs,
  },
  returnedDate: {
    color: nbColors.success,
    marginTop: nbSpacing.xs,
  },
  noAssignments: {
    color: nbColors.gray500,
    textAlign: 'center',
    paddingVertical: nbSpacing.md,
  },
  actions: {
    gap: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
});
