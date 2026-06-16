'use client';

import type { UserRole } from '@/types/models';
import { useState, useMemo } from 'react';
import {
  KpiGrid,
  KpiTile,
  PageHeader,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SkeletonCard,
  EmptyState,
} from '@/components/ui';
import { useUser, useRequireAuth, useHasRole } from '@/lib/auth/hooks';
import { useDashboardSummary, useRefreshAnalytics } from '@/lib/api/analytics';
import { AttendanceTrendChart } from '@/components/analytics/AttendanceTrendChart';
import { TaskCompletionChart } from '@/components/analytics/TaskCompletionChart';
import { AreaComparisonChart } from '@/components/analytics/AreaComparisonChart';
import { RefreshCw } from 'lucide-react';

const ANALYTICS_VIEWERS: UserRole[] = ['korlap', 'kepala_rayon', 'admin_data', 'top_management', 'admin_system', 'superadmin'];
const ANALYTICS_ADMINS: UserRole[] = ['admin_system', 'superadmin'];

export default function AnalyticsDashboardPage() {
  useRequireAuth(ANALYTICS_VIEWERS);
  const user = useUser();
  const canRefresh = useHasRole(ANALYTICS_ADMINS);

  const [period, setPeriod] = useState<'7' | '30'>('30');

  const { data, isLoading, error } = useDashboardSummary();
  const { mutate: refresh, isPending: isRefreshing } = useRefreshAnalytics();

  const handleRefresh = () => {
    refresh();
  };

  // Transform trends to chart data
  const attendanceChartData = useMemo(() => {
    if (!data?.trends?.attendance) return [];
    const days = getDayLabels(parseInt(period));
    return days.map((day, idx) => ({
      date: day,
      value: data.trends.attendance[idx] || 0,
    }));
  }, [data?.trends?.attendance, period]);

  const taskChartData = useMemo(() => {
    if (!data?.trends?.taskCompletion) return [];
    const days = getDayLabels(parseInt(period));
    return days.map((day, idx) => ({
      date: day,
      value: data.trends.taskCompletion[idx] || 0,
    }));
  }, [data?.trends?.taskCompletion, period]);

  // Simulated area comparison data (from dashboard or operational analytics)
  const areaChartData = useMemo(() => {
    return [
      { area: 'T. Bungkul', staffing: 85, tasks: 12 },
      { area: 'T. Apsari', staffing: 90, tasks: 15 },
      { area: 'T. Puspa', staffing: 78, tasks: 10 },
      { area: 'T. Sampoerna', staffing: 88, tasks: 14 },
    ];
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analitik" />
        <KpiGrid columns={3}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </KpiGrid>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analitik" />
        <EmptyState
          variant="error"
          title="Gagal Memuat Data"
          description="Terjadi kesalahan saat memuat data analitik. Silakan coba lagi."
        />
      </div>
    );
  }

  const todayMetrics = data.today;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Analitik" />
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value) => setPeriod(value as '7' | '30')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Hari</SelectItem>
              <SelectItem value="30">30 Hari</SelectItem>
            </SelectContent>
          </Select>

          {canRefresh && (
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="size-4" />}
            >
              {isRefreshing ? 'Refresh...' : 'Refresh'}
            </Button>
          )}
        </div>
      </div>

      {/* Note about stale data */}
      <div className="bg-nb-warning-light/20 border-2 border-nb-warning px-4 py-2 rounded-nb-base text-sm text-nb-black">
        Data analitik diperbarui hingga 24 jam yang lalu.
      </div>

      {/* KPI Cards */}
      <KpiGrid columns={3}>
        <KpiTile
          label="Kehadiran"
          value={`${todayMetrics.attendanceRate.toFixed(1)}%`}
          delta={`${todayMetrics.attendanceRate > 80 ? '+' : ''}${(todayMetrics.attendanceRate - 80).toFixed(1)}%`}
          deltaDirection={todayMetrics.attendanceRate > 80 ? 'up' : 'down'}
        />
        <KpiTile
          label="Tugas/Hari"
          value={todayMetrics.tasksCompleted}
          delta={`${todayMetrics.tasksCompleted > 15 ? '+' : ''}${(todayMetrics.tasksCompleted - 15).toFixed(0)}`}
          deltaDirection={todayMetrics.tasksCompleted > 15 ? 'up' : 'down'}
        />
        <KpiTile
          label="Lembur"
          value={`${todayMetrics.overtimeHours.toFixed(1)} jam`}
          delta={`${todayMetrics.overtimeHours < 20 ? '−' : '+'}${Math.abs(todayMetrics.overtimeHours - 20).toFixed(1)}`}
          deltaDirection={todayMetrics.overtimeHours < 20 ? 'down' : 'up'}
        />
      </KpiGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceTrendChart data={attendanceChartData} />
        <TaskCompletionChart
          data={taskChartData.map((d) => ({
            date: d.date,
            completed: Math.round(d.value),
            total: Math.round(d.value + 5),
          }))}
        />
      </div>

      <AreaComparisonChart data={areaChartData} />
    </div>
  );
}

/**
 * Generate day labels for the last N days
 */
function getDayLabels(days: number): string[] {
  const labels: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }));
  }
  return labels;
}
