/**
 * Asset List Screen
 * Phase 5-3: Browse assets with filtering and search
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBBackgroundPattern,
  NBEmptyState,
  NBPageHeader,
  NBSkeleton,
  NBTextInput,
  NBTab,
} from '../../components/nb';
import { AssetCard } from './components/AssetCard';
import {
  fetchAssets,
  fetchCategories,
  setSelectedAsset,
  selectAssets,
  selectAssetsLoading,
} from '../../store/slices/assetsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing, nbShadows } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { Asset } from '../../types/assets.types';

const ASSETS_PAGE_LIMIT = 10;

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Assets'>;
  route: RouteProp<MainTabParamList, 'Assets'>;
};

type TabFilter = 'all' | 'available' | 'my-assets';

export function AssetListScreen({ navigation }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const assets = useAppSelector(selectAssets);
  const loading = useAppSelector(selectAssetsLoading);

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const TAB_FILTERS: Array<{ key: TabFilter; label: string }> = [
    { key: 'all', label: t('assets:list.tabs.all') },
    { key: 'available', label: t('assets:list.tabs.available') },
    { key: 'my-assets', label: t('assets:list.tabs.myAssets') },
  ];

  // Fetch categories on mount
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Fetch assets on mount and when filters change
  const loadAssets = useCallback(() => {
    const filters: Record<string, any> = {
      page: 1,
      limit: ASSETS_PAGE_LIMIT,
    };

    if (activeTab === 'available') {
      filters.status = 'available';
    } else if (activeTab === 'my-assets') {
      filters.status = 'in_use';
    }

    if (searchText) {
      filters.search = searchText;
    }

    dispatch(fetchAssets(filters));
  }, [dispatch, activeTab, searchText]);

  useFocusEffect(
    useCallback(() => {
      loadAssets();
    }, [loadAssets]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAssets();
    setRefreshing(false);
  }, [loadAssets]);

  const onAssetPress = useCallback(
    (asset: Asset) => {
      dispatch(setSelectedAsset(asset));
      navigation.navigate('AssetDetail', { assetId: asset.id });
    },
    [navigation, dispatch],
  );

  const onQRScan = useCallback(() => {
    navigation.navigate('QRScanner');
  }, [navigation]);

  return (
    <NBBackgroundPattern>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NBPageHeader title={t('assets:list.title')} />

        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AssetCard asset={item} onPress={() => onAssetPress(item)} />
          )}
          ListHeaderComponent={
            <View style={styles.header}>
              <NBTextInput
                placeholder={t('assets:list.search')}
                value={searchText}
                onChangeText={setSearchText}
              />

              <NBTab
                tabs={TAB_FILTERS.map((f) => ({ key: f.key, label: f.label }))}
                activeTab={activeTab}
                onTabChange={(key: string) => setActiveTab(key as TabFilter)}
              />
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeleton}>
                <NBSkeleton variant="card" count={3} />
              </View>
            ) : (
              <NBEmptyState
                title={t('assets:list.empty.title')}
                description={t('assets:list.empty.description')}
                variant="noData"
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[nbColors.primary]}
            />
          }
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.fabContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onQRScan}
            style={styles.fab}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={24}
              color={nbColors.bgSurface}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    gap: nbSpacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
  skeleton: {
    paddingTop: nbSpacing.md,
    gap: nbSpacing.md,
  },
  fabContainer: {
    position: 'absolute',
    bottom: nbSpacing.lg,
    right: nbSpacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: nbColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
});
