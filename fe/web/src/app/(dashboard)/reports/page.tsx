/**
 * Reports List Page
 * View and review work reports
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useReports, type ReportType } from '@/lib/api/reports';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  DataTable,
  FormInput,
  FormSelect,
  Button,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkReport } from '@/lib/api/reports';

// Access control
const ALLOWED_ROLES = ['admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan'];

interface ReportFilters {
  search: string;
  reportType: ReportType | 'all';
  fromDate: string;
  toDate: string;
  page: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState<ReportFilters>({
    search: '',
    reportType: 'all',
    fromDate: '',
    toDate: '',
    page: 1,
  });
  const limit = 20;

  useEffect(() => {
    if (!authLoading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch reports
  const { data: reportsData, isLoading } = useReports({
    report_type: filters.reportType !== 'all' ? filters.reportType : undefined,
    from_date: filters.fromDate || undefined,
    to_date: filters.toDate || undefined,
    page: filters.page,
    limit,
  });

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!ALLOWED_ROLES.includes(user.role)) {
    return null;
  }

  const reports = reportsData?.data || [];
  const pagination = reportsData?.meta;

  // Filter reports by search (client-side for simplicity)
  const filteredReports = Array.isArray(reports)
    ? reports.filter((report) =>
        filters.search
          ? report.worker.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
            report.area.name.toLowerCase().includes(filters.search.toLowerCase())
          : true
      )
    : [];

  // Report type options
  const reportTypes: { value: string; label: string }[] = [
    { value: 'all', label: 'Semua Tipe' },
    { value: 'task_completion', label: 'Penyelesaian Tugas' },
    { value: 'incident', label: 'Insiden' },
    { value: 'maintenance_request', label: 'Permintaan Perawatan' },
  ];

  // Report type badge colors
  const reportTypeBadges: Record<ReportType, 'success' | 'destructive' | 'warning'> = {
    task_completion: 'success',
    incident: 'destructive',
    maintenance_request: 'warning',
  };

  // Table columns
  const columns: ColumnDef<WorkReport>[] = [
    {
      key: 'worker',
      header: 'Pekerja',
      cell: (report) => (
        <div>
          <div className="font-semibold text-nb-black">{report.worker.full_name}</div>
          <div className="text-xs text-nb-gray-600">{report.worker.username}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      cell: (report) => (
        <div>
          <div className="font-semibold">{report.area.name}</div>
          <div className="text-xs text-nb-gray-600">{report.area.areaType.name}</div>
        </div>
      ),
    },
    {
      key: 'report_type',
      header: 'Tipe',
      cell: (report) => (
        <Badge variant={reportTypeBadges[report.report_type]} size="sm">
          {reportTypes.find((t) => t.value === report.report_type)?.label || report.report_type}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Deskripsi',
      cell: (report) => (
        <span className="text-sm text-nb-gray-600 line-clamp-2">{report.description}</span>
      ),
    },
    {
      key: 'is_reviewed',
      header: 'Status',
      cell: (report) => (
        <Badge variant={report.is_reviewed ? 'success' : 'secondary'} size="sm">
          {report.is_reviewed ? 'Ditinjau' : 'Belum Ditinjau'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Tanggal',
      cell: (report) => (
        <div className="text-sm">{new Date(report.created_at).toLocaleDateString('id-ID')}</div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (report) => (
        <Link
          href={`/reports/${report.id}`}
          className="text-nb-primary font-semibold hover:underline"
        >
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-nb-black">Laporan Kerja</h1>
        <p className="text-nb-gray-600 mt-1">Kelola dan tinjau laporan kerja dari pekerja</p>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <FormInput
              label="Cari Pekerja/Area"
              type="text"
              placeholder="Nama pekerja atau area..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />

            {/* Report Type Filter */}
            <FormSelect
              label="Tipe Laporan"
              value={filters.reportType}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, reportType: value as ReportType | 'all' }))
              }
              options={reportTypes}
            />

            {/* From Date */}
            <FormInput
              label="Dari Tanggal"
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
              aria-label="Filter tanggal mulai"
            />

            {/* To Date */}
            <FormInput
              label="Sampai Tanggal"
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
            />
          </div>

          {/* Clear Filters */}
          {(filters.search ||
            filters.reportType !== 'all' ||
            filters.fromDate ||
            filters.toDate) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({
                  search: '',
                  reportType: 'all',
                  fromDate: '',
                  toDate: '',
                  page: 1,
                });
              }}
              className="mt-4"
            >
              Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Total Laporan</div>
            <div className="text-3xl font-black text-nb-black">{pagination?.total || 0}</div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Belum Ditinjau</div>
            <div className="text-3xl font-black text-nb-warning">
              {reports.filter((r) => !r.is_reviewed).length}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <div className="text-sm font-semibold text-nb-gray-600 mb-2">Sudah Ditinjau</div>
            <div className="text-3xl font-black text-nb-success">
              {reports.filter((r) => r.is_reviewed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Daftar Laporan</h2>
            <div aria-live="polite" aria-atomic="true" className="text-sm text-nb-gray-600">
              {filteredReports.length} laporan ditemukan
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<WorkReport>
            columns={columns}
            data={filteredReports}
            loading={isLoading}
            emptyMessage="Tidak ada laporan"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total
                laporan)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={pagination.page === 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(pagination.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
