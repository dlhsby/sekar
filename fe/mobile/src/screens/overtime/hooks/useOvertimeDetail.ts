/**
 * useOvertimeDetail — Load, refresh, and state for OvertimeDetailScreen
 */

import { useState, useCallback, useRef } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabScreenProps } from '../../../types/navigation.types';
import { getOvertimeById } from '../../../services/api/overtimeApi';
import type { Overtime } from '../../../types/models.types';

export interface UseOvertimeDetailReturn {
  overtime: Overtime | null;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchDetail: (isRefresh?: boolean) => Promise<void>;
  handleRefresh: () => Promise<void>;
  scrollViewRef: React.RefObject<ScrollView | null>;
  setOvertime: (overtime: Overtime) => void;
}

export function useOvertimeDetail(overtimeId: string): UseOvertimeDetailReturn {
  const navigation = useNavigation<MainTabScreenProps<'OvertimeDetail'>['navigation']>();
  const [overtime, setOvertime] = useState<Overtime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await getOvertimeById(overtimeId);
      if (response.data) {
        setOvertime(response.data);
      } else if (response.error) {
        if (!isRefresh) {
          Alert.alert('Error', response.error);
          navigation.navigate('Absensi' as any, { initialTab: 'lembur' });
        }
      }
    } catch {
      if (!isRefresh) {
        Alert.alert('Error', 'Gagal memuat detail lembur');
        navigation.navigate('Absensi' as any, { initialTab: 'lembur' });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [overtimeId, navigation]);

  const handleRefresh = useCallback(() => fetchDetail(true), [fetchDetail]);

  return {
    overtime,
    isLoading,
    isRefreshing,
    fetchDetail,
    handleRefresh,
    scrollViewRef,
    setOvertime,
  };
}
