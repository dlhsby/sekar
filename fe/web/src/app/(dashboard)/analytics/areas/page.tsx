'use client';

import type { UserRole } from '@/types/models';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  Card,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SkeletonCard,
  EmptyState,
  FormInput,
} from '@/components/ui';
import { useUser, useRequireAuth } from '@/lib/auth/hooks';
import { useAreaAnalytics, useArea, type AreaAnalytics } from '@/lib/api/analytics';
import { AreaComparisonChart } from '@/components/analytics/AreaComparisonChart';
import { X } from 'lucide-react';

const ANALYTICS_VIEWERS: UserRole[] = ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'];

type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const GRADE_COLORS: Record<Grade, string> = {
  A: 'bg-nb-success text-nb-white',
  B: 'bg-nb-primary text-nb-white',
  C: 'bg-nb-warning text-nb-black',
  D: 'bg-nb-danger-light text-nb-black',
  E: 'bg-nb-danger text-nb-white',
  F: 'bg-nb-black text-nb-white',
};

function getGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}

export default function AreaAnalyticsPage() {
  const { t } = useTranslation();
  useRequireAuth(ANALYTICS_VIEWERS);

  const [search, setSearch] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const { data: listData, isLoading: isListLoading } = useAreaAnalytics({
    search,
  });

  const { data: areaDetail, isLoading: isAreaLoading } = useArea(selectedAreaId || '', {});

  // Chart data
  const chartData = useMemo(() => {
    const rows = listData?.data ?? [];
    return rows.slice(0, 8).map((a) => ({
      area: a.area_name,
      staffing: a.staffing_coverage,
      tasks: a.open_tasks,
    }));
  }, [listData?.data]);

  if (isListLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analitik Area" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!listData?.data || listData.data.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analitik Area" />
        <EmptyState variant="noData" title="Tidak ada data area" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analitik Area" />

      {/* Search */}
      <FormInput
        label="Cari area"
        placeholder="Cari area..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Area Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listData.data.map((area) => {
          const grade = getGrade(area.avg_worker_performance);
          return (
            <Card
              key={area.id}
              className="p-4 cursor-pointer hover:shadow-nb-md transition-shadow"
              onClick={() => setSelectedAreaId(area.id)}
              interactive
            >
              <h3 className="font-semibold text-nb-h3 mb-3">{area.area_name}</h3>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Staffing</span>
                  <span className="font-medium">{area.staffing_coverage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Tugas Terbuka</span>
                  <span className="font-medium">{area.open_tasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Skor</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{area.avg_worker_performance.toFixed(1)}</span>
                    <Badge className={GRADE_COLORS[grade]}>{grade}</Badge>
                  </div>
                </div>
              </div>

              <div className="text-xs text-nb-gray-500 pt-3 border-t border-nb-gray-200">
                {area.attended_workers}/{area.required_workers} pekerja hadir
              </div>
            </Card>
          );
        })}
      </div>

      {/* Comparison Chart */}
      <AreaComparisonChart data={chartData} />

      {/* Area Detail Dialog */}
      <Dialog open={!!selectedAreaId} onOpenChange={(open) => !open && setSelectedAreaId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detail Area</span>
              <button onClick={() => setSelectedAreaId(null)}>
                <X className="size-5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {isAreaLoading ? (
            <div className="py-8 text-center text-nb-gray-600">{t('common:actions.loading')}</div>
          ) : areaDetail ? (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <h4 className="font-semibold text-nb-h3">{areaDetail.area_name}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Staffing Coverage</span>
                  <span className="font-medium">{areaDetail.staffing_coverage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Pekerja Hadir</span>
                  <span className="font-medium">
                    {areaDetail.attended_workers}/{areaDetail.required_workers}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Tugas Terbuka</span>
                  <span className="font-medium">{areaDetail.open_tasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Pemeliharaan</span>
                  <span className="font-medium">{areaDetail.maintenance_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-nb-body-sm text-nb-gray-600">Skor Kinerja</span>
                  <span className="font-semibold">{areaDetail.avg_worker_performance.toFixed(1)}</span>
                </div>
              </Card>
            </div>
          ) : (
            <EmptyState variant="error" title="Gagal memuat detail" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
