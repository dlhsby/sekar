/**
 * Activities List Page (Phase 2C - with approval workflow)
 * Access: MONITORING_ROLES
 */

'use client';

import { useAuth } from '@/lib/auth/hooks';
import { useActivities, useApproveActivity, useRejectActivity } from '@/lib/api/activities';
import { useActivityTypes } from '@/lib/api/activity-types';
import { useAreas } from '@/lib/api/areas';
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
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { Activity, ActivityFilters, ActivityStatus } from '@/types/models';
import { MONITORING_ROLES, ACTIVITY_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_BADGES } from '@/lib/constants/activities';

const isValidActivityStatus = (value: string): value is ActivityStatus | 'all' => {
  return ['all', 'pending', 'approved', 'rejected'].includes(value);
};

export default function ActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState<{
    activityTypeId: string;
    statusFilter: ActivityStatus | 'all';
    areaId: string;
    fromDate: string;
    toDate: string;
    page: number;
  }>({
    activityTypeId: 'all',
    statusFilter: 'all',
    areaId: 'all',
    fromDate: '',
    toDate: '',
    page: 1,
  });
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const limit = 20;

  const approveMutation = useApproveActivity();
  const rejectMutation = useRejectActivity();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Auto-scope korlap to their area
  useEffect(() => {
    if (user && user.role === 'korlap' && user.area_id && filters.areaId === 'all') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters((prev) => ({ ...prev, areaId: user.area_id as string }));
    }
  }, [user, filters.areaId]);

  const { data: activityTypes } = useActivityTypes();
  const { data: areasData } = useAreas();

  const apiFilters: ActivityFilters = {
    activity_type_id: filters.activityTypeId !== 'all' ? filters.activityTypeId : undefined,
    status: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
    area_id: filters.areaId !== 'all' ? filters.areaId : undefined,
    from_date: filters.fromDate || undefined,
    to_date: filters.toDate || undefined,
    page: filters.page,
    limit,
  };

  const { data: activitiesData, isLoading } = useActivities(apiFilters);

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

  const activities = activitiesData?.data || [];
  const pagination = activitiesData?.meta;
  const canApprove = hasRole(user.role, ACTIVITY_APPROVER_ROLES);

  const handleApprove = async (id: string) => {
    await approveMutation.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;
    await rejectMutation.mutateAsync({ id, reason: rejectReason });
    setRejectingId(null);
    setRejectReason('');
  };

  const activityTypeOptions = [
    { value: 'all', label: 'Semua Tipe' },
    ...(activityTypes || []).map((t) => ({ value: t.id, label: t.name })),
  ];

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  const areaOptions = [
    { value: 'all', label: 'Semua Area' },
    ...(areasData?.data || []).map((a) => ({ value: a.id, label: a.name })),
  ];

  const columns: ColumnDef<Activity>[] = [
    {
      key: 'created_at',
      header: 'Tanggal',
      cell: (a) => (
        <div className="text-sm">{new Date(a.created_at).toLocaleDateString('id-ID')}</div>
      ),
    },
    {
      key: 'user',
      header: 'Pengguna',
      cell: (a) => (
        <div>
          <div className="font-semibold text-nb-black">{a.user?.full_name || '-'}</div>
          <div className="text-xs text-nb-gray-600">{a.user?.username || ''}</div>
        </div>
      ),
    },
    {
      key: 'activity_type',
      header: 'Tipe Aktivitas',
      cell: (a) => (
        <Badge variant="default" size="sm">
          {a.activity_type?.name || '-'}
        </Badge>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      cell: (a) => <div className="text-sm">{a.area?.name || '-'}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (a) => (
        <Badge variant={ACTIVITY_STATUS_BADGES[a.status]} size="sm">
          {ACTIVITY_STATUS_LABELS[a.status]}
        </Badge>
      ),
    },
    {
      key: 'photo_urls',
      header: 'Foto',
      cell: (a) => (
        <Badge variant="secondary" size="sm">
          {a.photo_urls?.length || 0} foto
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (a) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/activities/${a.id}`}
            className="text-nb-primary font-semibold hover:underline"
          >
            Detail
          </Link>
          {canApprove && a.status === 'pending' && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(a.id)}
                disabled={approveMutation.isPending}
                leftIcon={<Check className="w-3 h-3" />}
              >
                Setujui
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectingId(a.id)}
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

  const hasActiveFilters =
    filters.activityTypeId !== 'all' ||
    filters.statusFilter !== 'all' ||
    filters.areaId !== 'all' ||
    filters.fromDate ||
    filters.toDate;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-nb-black">Aktivitas</h1>
        <p className="text-nb-gray-600 mt-1">Kelola dan tinjau aktivitas kerja</p>
      </div>

      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Tipe Aktivitas"
              value={filters.activityTypeId}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, activityTypeId: value, page: 1 }))
              }
              options={activityTypeOptions}
            />
            <FormSelect
              label="Status"
              value={filters.statusFilter}
              onChange={(value) => {
                if (isValidActivityStatus(value)) {
                  setFilters((prev) => ({ ...prev, statusFilter: value, page: 1 }));
                }
              }}
              options={statusOptions}
            />
            <FormSelect
              label="Area"
              value={filters.areaId}
              onChange={(value) => setFilters((prev) => ({ ...prev, areaId: value, page: 1 }))}
              options={areaOptions}
            />
            <FormInput
              label="Dari Tanggal"
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, fromDate: e.target.value, page: 1 }))
              }
            />
            <FormInput
              label="Sampai Tanggal"
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value, page: 1 }))}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              onClick={() =>
                setFilters({
                  activityTypeId: 'all',
                  statusFilter: 'all',
                  areaId: 'all',
                  fromDate: '',
                  toDate: '',
                  page: 1,
                })
              }
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
              <h3 className="font-bold text-nb-black">Alasan Penolakan Aktivitas</h3>
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
                  Tolak Aktivitas
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
            <h2 className="text-xl font-bold text-nb-black">Daftar Aktivitas</h2>
            <div className="text-sm text-nb-gray-600">{pagination?.total || 0} total</div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<Activity>
            columns={columns}
            data={activities}
            loading={isLoading}
            emptyMessage="Tidak ada aktivitas"
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
