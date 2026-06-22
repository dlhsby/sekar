/**
 * Deep Linking Configuration
 * Maps deep-link URIs to navigation targets (sekar:// scheme + push notification handlers)
 */

import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation.types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sekar://', 'https://sekar.wahyutrip.com'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          TaskDetail: 'tasks/:id',
          ActivityDetail: 'activities/:id',
          Absensi: 'absensi',
          Lembur: 'lembur',
          OvertimeDetail: 'overtime/:id',
          Notifications: 'notifications',
          Monitoring: 'monitoring',
          PruningDetail: 'pruning-requests/:id',
        },
      },
    },
  },
};
