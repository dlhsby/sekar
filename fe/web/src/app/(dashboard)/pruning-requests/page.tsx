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
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DataTable,
  FormSelect,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/hooks';
import { hasRole } from '@/lib/constants/roles';
import type { UserRole } from '@/types/models';
import {
  PRUNING_REQUEST_ADMIN_ROLES,
  PRUNING_REQUEST_STATUS_LABELS,
  PRUNING_REQUEST_STATUS_TONES,
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
      id: 'referenceCode',
      header: 'Kode Referensi',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Kode Referensi' },
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.referenceCode}</span>,
    },
    {
      id: 'submitter',
      header: 'Kecamatan',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Kecamatan' },
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-semibold">{row.original.kecamatanName ?? '-'}</div>
          <div className="text-nb-gray-600">{row.original.submitter?.full_name ?? '-'}</div>
        </div>
      ),
    },
    {
      id: 'rayon',
      header: 'Rayon',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Rayon' },
      cell: ({ row }) => <div className="text-sm">{row.original.rayon?.name ?? '-'}</div>,
    },
    {
      id: 'expected',
      header: 'Minggu / Tanggal',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Minggu / Tanggal' },
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.expectedDate ? (
            <>{new Date(row.original.expectedDate).toLocaleDateString('id-ID')}</>
          ) : row.original.expectedYear && row.original.expectedIsoWeek ? (
            <>
              W{row.original.expectedIsoWeek}/{row.original.expectedYear}
            </>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Status' },
      cell: ({ row }) => (
        <StatusPill tone={PRUNING_REQUEST_STATUS_TONES[row.original.status]} dot>
          {PRUNING_REQUEST_STATUS_LABELS[row.original.status]}
        </StatusPill>
      ),
    },
    {
      id: 'createdAt',
      header: 'Tanggal Masuk',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tanggal Masuk' },
      cell: ({ row }) => (
        <div className="text-sm">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID')}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Aksi', pinRight: true },
      cell: ({ row }) => (
        <Link
          href={`/pruning-requests/${row.original.id}`}
          className="text-nb-success-dark font-semibold hover:underline"
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
    <div className="space-y-5">
      <PageHeader description="Tinjau dan kelola permohonan pemangkasan dari kecamatan." />

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
            <DataTable<PruningRequest, unknown>
              columns={columns}
              data={data?.data ?? []}
              loading={isLoading}
              enablePagination={false}
              getRowId={(r) => r.id}
              emptyTitle="Belum ada permohonan untuk filter ini."
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
