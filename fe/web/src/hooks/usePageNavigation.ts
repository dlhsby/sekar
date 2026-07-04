'use client';

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook to get localized page title based on pathname
 */
export function usePageTitle() {
  const { t } = useTranslation('navigation');

  return useCallback((pathname: string): string => {
    const pageTitles: Record<string, string> = {
      '/': t('pageTitle.dashboard'),
      '/monitoring': t('pageTitle.monitoring'),
      '/tasks': t('pageTitle.tasks'),
      '/tasks/new': t('pageTitle.tasksNew'),
      '/activities': t('pageTitle.activities'),
      '/overtime': t('pageTitle.overtime'),
      '/schedules': t('pageTitle.schedules'),
      '/users': t('pageTitle.users'),
      '/areas': t('pageTitle.areas'),
      '/rayons': t('pageTitle.rayons'),
      '/plants': t('pageTitle.plants'),
      '/seeds': t('pageTitle.seeds'),
      '/assets': t('pageTitle.assets'),
      '/assets/new': t('pageTitle.assetsNew'),
      '/assets/qr': t('pageTitle.assetsQr'),
      '/assets/maintenance': t('pageTitle.assetsMaintenance'),
      '/reports': t('pageTitle.reports'),
      '/reports/builder': t('pageTitle.reportsBuilder'),
      '/reports/schedules': t('pageTitle.reportsSchedules'),
      '/pruning-requests': t('pageTitle.pruningRequests'),
      '/pruning-submit': t('pageTitle.pruningSubmit'),
      '/pruning-submit/my': t('pageTitle.pruningMy'),
      '/settings': t('pageTitle.settings'),
      '/profile': t('pageTitle.profile'),
      '/notifications': t('pageTitle.notifications'),
      '/export': t('pageTitle.export'),
      '/import': t('pageTitle.import'),
      '/import/csv': t('pageTitle.importCsv'),
      '/analytics': t('pageTitle.analytics'),
      '/analytics/areas': t('pageTitle.analyticsAreas'),
      '/analytics/workers': t('pageTitle.analyticsWorkers'),
    };

    if (pageTitles[pathname]) return pageTitles[pathname];

    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length; i > 0; i--) {
      const prefix = '/' + segments.slice(0, i).join('/');
      if (pageTitles[prefix]) return pageTitles[prefix];
    }

    return 'SEKAR';
  }, [t]);
}

/**
 * Hook to get localized breadcrumb trail based on pathname
 */
export function useBreadcrumbTrail() {
  const { t } = useTranslation('navigation');
  const getPageTitle = usePageTitle();

  return useCallback((pathname: string): string[] => {
    const breadcrumbs: Record<string, string[]> = {
      '/': [t('pageTitle.dashboard')],
      '/monitoring': [t('pageTitle.monitoring')],
      '/tasks': [t('breadcrumb.work'), t('pageTitle.tasks')],
      '/activities': [t('breadcrumb.work'), t('pageTitle.activities')],
      '/overtime': [t('breadcrumb.work'), t('pageTitle.overtime')],
      '/schedules': [t('breadcrumb.work'), t('pageTitle.schedules')],
      '/pruning-requests': [t('breadcrumb.work'), t('pageTitle.pruningRequests')],
      '/users': [t('breadcrumb.access'), t('pageTitle.users')],
      '/areas': [t('breadcrumb.data'), t('pageTitle.areas')],
      '/rayons': [t('breadcrumb.data'), t('pageTitle.rayons')],
      '/plants': [t('breadcrumb.data'), t('pageTitle.plants')],
      '/seeds': [t('breadcrumb.data'), t('pageTitle.seeds')],
      '/assets': [t('breadcrumb.data'), t('pageTitle.assets')],
      '/assets/new': [t('pageTitle.assets'), t('pageTitle.assetsNew')],
      '/assets/qr': [t('pageTitle.assets'), t('pageTitle.assetsQr')],
      '/assets/maintenance': [t('pageTitle.assets'), t('pageTitle.assetsMaintenance')],
      '/reports': [t('pageTitle.reports')],
      '/reports/builder': [t('pageTitle.reports'), t('pageTitle.reportsBuilder')],
      '/reports/schedules': [t('pageTitle.reports'), t('pageTitle.reportsSchedules')],
      '/analytics': [t('pageTitle.analytics')],
      '/analytics/areas': [t('pageTitle.analytics'), t('pageTitle.analyticsAreas')],
      '/analytics/workers': [t('pageTitle.analytics'), t('pageTitle.analyticsWorkers')],
      '/pruning-submit': [t('breadcrumb.kecamatan'), t('pageTitle.pruningSubmit')],
      '/pruning-submit/my': [t('breadcrumb.kecamatan'), t('pageTitle.pruningMy')],
      '/settings': [t('breadcrumb.account'), t('pageTitle.settings')],
      '/profile': [t('breadcrumb.account'), t('pageTitle.profile')],
      '/notifications': [t('breadcrumb.account'), t('pageTitle.notifications')],
      '/export': [t('breadcrumb.operations'), t('pageTitle.export')],
      '/import': [t('breadcrumb.operations'), t('pageTitle.import')],
      '/import/csv': [t('breadcrumb.operations'), t('pageTitle.importCsv')],
    };

    if (breadcrumbs[pathname]) return breadcrumbs[pathname];

    const segments = pathname.split('/').filter(Boolean);
    for (let i = segments.length; i > 0; i--) {
      const base = breadcrumbs['/' + segments.slice(0, i).join('/')];
      if (base) {
        const rest = segments.slice(i);
        if (rest.length === 0) return base;
        const last = rest[rest.length - 1];
        const dynamicMap: Record<string, string> = {
          new: t('breadcrumb.new'),
          edit: t('breadcrumb.edit'),
        };
        return [...base, dynamicMap[last] ?? t('breadcrumb.detail')];
      }
    }

    return [getPageTitle(pathname)];
  }, [t, getPageTitle]);
}
