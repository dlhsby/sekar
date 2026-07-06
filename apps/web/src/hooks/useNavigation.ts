'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { navigationItems as baseItems } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation';
import { ADMIN_ROLES, MONITORING_ROLES } from '@/lib/constants/roles';

/**
 * Hook to get translated navigation items
 */
export const useNavigationItems = (): NavItem[] => {
  const { t } = useTranslation('navigation');

  return useMemo(() => {
    const translate = (key: string): string => t(key);

    // Map navigation labels to their translation keys
    const translatedItems = baseItems.map((item) => ({
      ...item,
      label: translate(getNavigationKeyForId(item.id)),
      children: item.children
        ? item.children.map((child) => ({
            ...child,
            label: translate(getNavigationKeyForId(child.id)),
          }))
        : undefined,
    }));

    return translatedItems;
  }, [t]);
};

/**
 * Helper function to map navigation item IDs to their translation keys
 */
function getNavigationKeyForId(id: string): string {
  const keyMap: Record<string, string> = {
    dashboard: 'main.dashboard',
    monitoring: 'main.monitoring',
    work: 'work.title',
    tasks: 'work.tasks',
    activities: 'work.activities',
    overtime: 'work.overtime',
    schedules: 'work.schedules',
    'pruning-requests': 'work.pruningRequests',
    access: 'access.title',
    users: 'access.users',
    data: 'data.title',
    areas: 'data.areas',
    rayons: 'data.rayons',
    plants: 'data.plants',
    seeds: 'data.seeds',
    assets: 'data.assets',
    reports: 'reports.title',
    'reports-list': 'reports.list',
    'reports-builder': 'reports.builder',
    'reports-schedules': 'reports.schedules',
    analytics: 'analytics.title',
    'analytics-overview': 'analytics.overview',
    'analytics-workers': 'analytics.workers',
    'analytics-areas': 'analytics.areas',
    operations: 'operations.title',
    export: 'operations.export',
    import: 'operations.import',
    settings: 'settings',
    'pruning-submit': 'pruning.submit',
    'pruning-my': 'pruning.my',
    docs: 'docs',
  };

  return keyMap[id] || id;
}
