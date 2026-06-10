/**
 * Monitoring (Phase 4-R — minimal, reliable baseline)
 *
 * Stripped back to a working full-width map + status summary while we stabilise
 * Mapbox. Filters, boundaries, clustering, worker drawer and reassign flows are
 * reintroduced on top of this once the map is confirmed rendering.
 */
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/hooks';
import { useMonitoringSnapshot } from '@/lib/api/monitoring-v2';
import { Button } from '@/components/ui';
import { MonitoringStatusBar } from '@/components/monitoring/MonitoringStatusBar';
import {
  SimpleMonitoringMap,
  type SimpleWorker,
} from '@/components/monitoring/SimpleMonitoringMap';
import { MONITORING_ROLES, hasRole } from '@/lib/constants/roles';
import { formatTime } from '@/lib/utils/formatters';
import type { UserRole } from '@/types/models';

export default function MonitoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Role-scoped snapshot: city for city-level roles, else the user's own
  // rayon/area (the backend forbids city scope for scoped roles).
  const { scope, scopeId } = useMemo<{
    scope: 'city' | 'rayon' | 'area';
    scopeId?: string;
  }>(() => {
    if (user?.role === 'korlap' && user.area_id) return { scope: 'area', scopeId: user.area_id };
    if ((user?.role === 'kepala_rayon' || user?.role === 'admin_data') && user.rayon_id)
      return { scope: 'rayon', scopeId: user.rayon_id };
    return { scope: 'city' };
  }, [user]);

  const { data, isLoading, refetch } = useMonitoringSnapshot(scope, scopeId);

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role as UserRole, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const workers = useMemo<SimpleWorker[]>(
    () =>
      (data?.data?.workers ?? []).map((w) => ({
        user_id: w.user_id,
        full_name: w.full_name,
        lat: w.lat,
        lng: w.lng,
        status: w.status,
      })),
    [data]
  );

  const totals = useMemo(() => {
    const d = data?.data;
    if (!d) return null;
    return {
      total_active: d.total_active,
      total_inactive: d.total_inactive,
      total_outside_area: d.total_outside_area,
      total_missing: d.total_missing,
      total_offline: d.total_offline,
    };
  }, [data]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-nb-gray-600">Memuat...</div>
    );
  }

  if (!hasRole(user.role as UserRole, MONITORING_ROLES)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-nb-h3 text-nb-black leading-tight">Monitoring Real-Time</h1>
          <p className="mt-1 text-xs text-nb-gray-500">
            {isLoading
              ? 'Memuat…'
              : data?.data?.generated_at
                ? `Diperbarui ${formatTime(data.data.generated_at)}`
                : 'Tidak ada data'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Segarkan
        </Button>
      </div>

      {/* Status summary */}
      <MonitoringStatusBar totals={totals} />

      {/* Full-width map */}
      <div className="relative w-full h-[calc(100vh_-_15rem)] min-h-[28rem] overflow-hidden rounded-nb-base border-2 border-nb-black bg-nb-gray-100">
        <SimpleMonitoringMap workers={workers} />
      </div>
    </div>
  );
}
