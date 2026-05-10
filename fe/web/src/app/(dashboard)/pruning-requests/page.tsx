/**
 * Pruning Requests dashboard list page (Phase 3 — admin disposition)
 *
 * Lets admin / admin_data / kepala_rayon / top_management triage kecamatan
 * pruning requests from the desktop instead of the mobile app. Mirrors the
 * mobile ReviewQueueScreen but with a paginated table + status filter.
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, DataTable, FormSelect } from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import {
  PRUNING_REQUEST_ADMIN_ROLES,
  PRUNING_REQUEST_STATUS_BADGES,
  PRUNING_REQUEST_STATUS_LABELS,
} from '@/lib/constants/pruning-requests';
import {
  usePruningRequests,
  type PruningRequest,
  type PruningRequestStatus,
} from '@/lib/api/pruning-requests';

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: PruningRequestStatus | 'all' }> = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Terkirim', value: 'submitted' },
  { label: 'Sedang Ditinjau', value: 'under_review' },
  { label: 'Disetujui', value: 'approved' },
  { label: 'Ditolak', value: 'rejected' },
  { label: 'Ditugaskan', value: 'assigned' },
  { label: 'Sedang Dikerjakan', value: 'in_progress' },
  { label: 'Selesai', value: 'done' },
  { label: 'Dibatalkan', value: 'cancelled' },
];

export default function PruningRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PruningRequestStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, [...PRUNING_REQUEST_ADMIN_ROLES] as UserRole[])) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  };
  const { data, isLoading, isError } = usePruningRequests(filters);

  const columns: ColumnDef<PruningRequest>[] = [
    {
      key: 'referenceCode',
      header: 'Kode Referensi',
      cell: (row) => <span className="font-mono text-sm">{row.referenceCode}</span>,
    },
    {
      key: 'submitter',
      header: 'Kecamatan',
      cell: (row) => (
        <div className="text-sm">
          <div className="font-semibold">{row.kecamatanName ?? '-'}</div>
          <div className="text-nb-gray-600">{row.submitter?.full_name ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'rayon',
      header: 'Rayon',
      cell: (row) => <div className="text-sm">{row.rayon?.name ?? '-'}</div>,
    },
    {
      key: 'expected',
      header: 'Minggu / Tanggal',
      cell: (row) => (
        <div className="text-sm">
          {row.expectedDate ? (
            <>{new Date(row.expectedDate).toLocaleDateString('id-ID')}</>
          ) : row.expectedYear && row.expectedIsoWeek ? (
            <>
              W{row.expectedIsoWeek}/{row.expectedYear}
            </>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={PRUNING_REQUEST_STATUS_BADGES[row.status]} size="sm">
          {PRUNING_REQUEST_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tanggal Masuk',
      cell: (row) => (
        <div className="text-sm">
          {new Date(row.createdAt).toLocaleDateString('id-ID')}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (row) => (
        <Link
          href={`/pruning-requests/${row.id}`}
          className="text-nb-primary font-semibold hover:underline"
        >
          Detail
        </Link>
      ),
    },
  ];

  const handleStatusChange = (val: string) => {
    setStatusFilter(val as PruningRequestStatus | 'all');
    setPage(1);
  };

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-nb-black">Permohonan Pemangkasan</h1>
        <p className="text-nb-gray-600 mt-1">
          Tinjau dan kelola permohonan pemangkasan dari kecamatan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="md:w-64">
              <FormSelect
                label="Filter Status"
                value={statusFilter}
                onChange={handleStatusChange}
                options={STATUS_FILTER_OPTIONS}
              />
            </div>
            {data?.meta && (
              <div className="text-sm text-nb-gray-600">
                Total: <span className="font-semibold">{data.meta.total}</span> permohonan
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="py-10 text-center text-nb-danger">
              Gagal memuat data permohonan. Coba lagi nanti.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data?.data ?? []}
              loading={isLoading}
              emptyMessage="Belum ada permohonan untuk filter ini."
            />
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-nb-gray-600">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
