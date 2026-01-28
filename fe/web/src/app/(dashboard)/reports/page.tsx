/**
 * Reports List Page
 * View and review work reports
 * Access: Admin + TopManagement + KepalaRayon + KoordinatorLapangan
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useReports, type ReportType } from '@/lib/api/reports';
import { NBCard, NBCardHeader, NBCardContent, NBBadge, NBTable, NBInput, NBSelect } from '@/components/nb';
import { NBTableColumn } from '@/components/nb/NBTable';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WorkReport } from '@/lib/api/reports';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Access control
  const allowedRoles = ['Admin', 'TopManagement', 'KepalaRayon', 'KoordinatorLapangan'];

  useEffect(() => {
    if (!authLoading && user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch reports
  const { data: reportsData, isLoading } = useReports({
    report_type: reportTypeFilter || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    page,
    limit,
  });

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  const reports = reportsData?.data || [];
  const pagination = reportsData?.meta;

  // Filter reports by search (client-side for simplicity)
  const filteredReports = reports.filter((report) =>
    search
      ? report.worker.full_name.toLowerCase().includes(search.toLowerCase()) ||
        report.area.name.toLowerCase().includes(search.toLowerCase())
      : true
  );

  // Report type options
  const reportTypes: { value: string; label: string }[] = [
    { value: '', label: 'Semua Tipe' },
    { value: 'task_completion', label: 'Penyelesaian Tugas' },
    { value: 'incident', label: 'Insiden' },
    { value: 'maintenance_request', label: 'Permintaan Perawatan' },
  ];

  // Report type badge colors
  const reportTypeBadges: Record<ReportType, 'success' | 'danger' | 'warning'> = {
    task_completion: 'success',
    incident: 'danger',
    maintenance_request: 'warning',
  };

  // Table columns
  const columns: NBTableColumn<WorkReport>[] = [
    {
      key: 'worker',
      title: 'Pekerja',
      render: (_value: unknown, report: WorkReport) => (
        <div>
          <div className="font-semibold text-nb-black">
            {report.worker.full_name}
          </div>
          <div className="text-xs text-gray-600">{report.worker.username}</div>
        </div>
      ),
    },
    {
      key: 'area',
      title: 'Area',
      render: (_value: unknown, report: WorkReport) => (
        <div>
          <div className="font-semibold">{report.area.name}</div>
          <div className="text-xs text-gray-600">
            {report.area.areaType.name}
          </div>
        </div>
      ),
    },
    {
      key: 'report_type',
      title: 'Tipe',
      render: (_value: unknown, report: WorkReport) => (
        <NBBadge variant={reportTypeBadges[report.report_type]} size="sm">
          {reportTypes.find((t) => t.value === report.report_type)?.label || report.report_type}
        </NBBadge>
      ),
    },
    {
      key: 'description',
      title: 'Deskripsi',
      render: (_value: unknown, report: WorkReport) => (
        <span className="text-sm text-gray-600 line-clamp-2">
          {report.description}
        </span>
      ),
    },
    {
      key: 'is_reviewed',
      title: 'Status',
      render: (_value: unknown, report: WorkReport) => (
        <NBBadge variant={report.is_reviewed ? 'success' : 'neutral'} size="sm">
          {report.is_reviewed ? 'Ditinjau' : 'Belum Ditinjau'}
        </NBBadge>
      ),
    },
    {
      key: 'created_at',
      title: 'Tanggal',
      render: (_value: unknown, report: WorkReport) => (
        <div className="text-sm">
          {new Date(report.created_at).toLocaleDateString('id-ID')}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Aksi',
      render: (_value: unknown, report: WorkReport) => (
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
        <p className="text-gray-600 mt-1">
          Kelola dan tinjau laporan kerja dari pekerja
        </p>
      </div>

      {/* Filters */}
      <NBCard variant="elevated">
        <NBCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <NBInput
              label="Cari Pekerja/Area"
              type="text"
              placeholder="Nama pekerja atau area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Report Type Filter */}
            <NBSelect
              label="Tipe Laporan"
              value={reportTypeFilter}
              onChange={(value) => setReportTypeFilter(value as ReportType | '')}
              options={reportTypes}
            />

            {/* From Date */}
            <NBInput
              label="Dari Tanggal"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            {/* To Date */}
            <NBInput
              label="Sampai Tanggal"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Clear Filters */}
          {(search || reportTypeFilter || fromDate || toDate) && (
            <button
              onClick={() => {
                setSearch('');
                setReportTypeFilter('');
                setFromDate('');
                setToDate('');
              }}
              className="mt-4 px-4 py-2 border-3 border-black bg-white font-semibold hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Reset Filter
            </button>
          )}
        </NBCardContent>
      </NBCard>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">
              Total Laporan
            </div>
            <div className="text-3xl font-black text-nb-black">
              {pagination?.total || 0}
            </div>
          </NBCardContent>
        </NBCard>

        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">
              Belum Ditinjau
            </div>
            <div className="text-3xl font-black text-nb-warning">
              {reports.filter((r) => !r.is_reviewed).length}
            </div>
          </NBCardContent>
        </NBCard>

        <NBCard variant="elevated">
          <NBCardContent>
            <div className="text-sm font-semibold text-gray-600 mb-2">
              Sudah Ditinjau
            </div>
            <div className="text-3xl font-black text-nb-success">
              {reports.filter((r) => r.is_reviewed).length}
            </div>
          </NBCardContent>
        </NBCard>
      </div>

      {/* Table */}
      <NBCard variant="elevated">
        <NBCardHeader>
          <h2 className="text-xl font-bold text-nb-black">Daftar Laporan</h2>
        </NBCardHeader>
        <NBCardContent>
          <NBTable<WorkReport>
            columns={columns}
            data={filteredReports}
            loading={isLoading}
            emptyText="Tidak ada laporan"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-black">
              <div className="text-sm text-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages} (
                {pagination.total} total laporan)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border-3 border-black bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border-3 border-black bg-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </NBCardContent>
      </NBCard>
    </div>
  );
}
