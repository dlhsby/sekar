/**
 * Overtime List Page (Phase 2C - NEW)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useOvertimes, useApproveOvertime, useRejectOvertime } from '@/lib/api/overtime';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  DataTable,
  FormSelect,
  FormInput,
  Button,
} from '@/components/ui';
import type { ColumnDef } from '@/components/ui/data-table';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { Overtime, OvertimeStatus } from '@/types/models';
import { MONITORING_ROLES, OVERTIME_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { OVERTIME_STATUS_LABELS, OVERTIME_STATUS_BADGES } from '@/lib/constants/overtime';

/**
 * Type guard for overtime status filter values
 */
const isValidOvertimeStatus = (value: string): value is OvertimeStatus | 'all' => {
  return ['all', 'pending', 'approved', 'rejected'].includes(value);
};

export default function OvertimePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<OvertimeStatus | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const limit = 20;

  const approveMutation = useApproveOvertime();
  const rejectMutation = useRejectOvertime();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const { data: overtimeData, isLoading } = useOvertimes({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    page,
    limit,
  });

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

  if (!hasRole(user.role, MONITORING_ROLES)) return null;

  const overtimes = overtimeData?.data || [];
  const pagination = overtimeData?.meta;
  const canApprove = hasRole(user.role, OVERTIME_APPROVER_ROLES);

  const handleApprove = async (id: string) => {
    await approveMutation.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ id, reason: rejectReason });
    setRejectingId(null);
    setRejectReason('');
  };

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  const columns: ColumnDef<Overtime>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      cell: (ot) => <div className="text-sm">{new Date(ot.date).toLocaleDateString('id-ID')}</div>,
    },
    {
      key: 'user',
      header: 'Pengguna',
      cell: (ot) => (
        <div>
          <div className="font-semibold text-nb-black">{ot.user?.full_name || '-'}</div>
          <div className="text-xs text-nb-gray-600">{ot.user?.username || ''}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      cell: (ot) => <div className="text-sm">{ot.area?.name || '-'}</div>,
    },
    {
      key: 'time',
      header: 'Waktu',
      cell: (ot) => (
        <div className="text-sm font-mono">
          {ot.start_time} - {ot.end_time}
        </div>
      ),
    },
    {
      key: 'activity_type',
      header: 'Tipe Aktivitas',
      cell: (ot) => <div className="text-sm">{ot.activity_type?.name || '-'}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (ot) => (
        <Badge variant={OVERTIME_STATUS_BADGES[ot.status]} size="sm">
          {OVERTIME_STATUS_LABELS[ot.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (ot) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/overtime/${ot.id}`}
            className="text-nb-primary font-semibold hover:underline"
          >
            Detail
          </Link>
          {canApprove && ot.status === 'pending' && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(ot.id)}
                disabled={approveMutation.isPending}
                leftIcon={<Check className="w-3 h-3" />}
              >
                Setujui
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectingId(ot.id)}
                leftIcon={<X className="w-3 h-3" />}
              >
                Tolak
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const hasActiveFilters = statusFilter !== 'all' || fromDate || toDate;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-nb-black">Lembur</h1>
        <p className="text-nb-gray-600 mt-1">Kelola permintaan lembur</p>
      </div>

      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormSelect
              label="Filter Status"
              value={statusFilter}
              onChange={(value) => {
                if (isValidOvertimeStatus(value)) {
                  setStatusFilter(value);
                  setPage(1);
                } else {
                  console.warn('Invalid overtime status:', value);
                }
              }}
              options={statusOptions}
            />
            <FormInput
              label="Dari Tanggal"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <FormInput
              label="Sampai Tanggal"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              onClick={() => {
                setStatusFilter('all');
                setFromDate('');
                setToDate('');
                setPage(1);
              }}
              className="mt-4"
            >
              Reset Filter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      {rejectingId && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">Alasan Penolakan</h3>
              <FormInput
                label="Alasan"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Masukkan alasan penolakan..."
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(rejectingId)}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  Tolak Lembur
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  Batal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">Daftar Lembur</h2>
            <div className="text-sm text-nb-gray-600">{pagination?.total || 0} total</div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<Overtime>
            columns={columns}
            data={overtimes}
            loading={isLoading}
            emptyMessage="Tidak ada permintaan lembur"
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                Halaman {pagination.page} dari {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
