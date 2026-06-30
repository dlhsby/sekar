/**
 * Activities List Page (Phase 2C - with approval workflow)
 * Access: MONITORING_ROLES
 */

'use client';

import type { DetailModalRow } from '@/components/ui';
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
  Field,
  DateRangePicker,
  DetailModal,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Eye } from 'lucide-react';
import type { Activity, ActivityFilters, ActivityStatus } from '@/types/models';
import { MONITORING_ROLES, ACTIVITY_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_BADGES } from '@/lib/constants/activities';
import { useViewModal } from '@/lib/hooks/use-view-modal';

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
  const view = useViewModal<Activity>();
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

  // Define canApprove and handlers before any early return
  const canApprove = !!user && hasRole(user.role, ACTIVITY_APPROVER_ROLES);

  const handleApprove = useCallback(
    async (id: string) => {
      await approveMutation.mutateAsync(id);
    },
    [approveMutation]
  );

  const handleReject = useCallback(
    async (id: string) => {
      if (!rejectReason.trim()) return;
      await rejectMutation.mutateAsync({ id, reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
    },
    [rejectReason, rejectMutation]
  );

  const rowActions = useCallback(
    (row: Activity): DataTableRowAction<Activity>[] => [
      {
        key: 'view',
        label: 'Lihat',
        icon: Eye,
        onClick: () => {
          view.openWith(row);
        },
      },
      {
        key: 'approve',
        label: 'Setujui',
        icon: Check,
        onClick: () => handleApprove(row.id),
        disabled: approveMutation.isPending,
        hidden: row.status !== 'pending' || !canApprove,
      },
      {
        key: 'reject',
        label: 'Tolak',
        icon: X,
        variant: 'danger',
        onClick: () => setRejectingId(row.id),
        hidden: row.status !== 'pending' || !canApprove,
      },
    ],
    [canApprove, approveMutation.isPending, handleApprove, view]
  );

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
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      enableSorting: false,
      meta: { label: 'ID', defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'created_at',
      header: 'Tanggal',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tanggal' },
      cell: ({ row }) => (
        <div className="text-sm">{new Date(row.original.created_at).toLocaleDateString('id-ID')}</div>
      ),
    },
    {
      id: 'user',
      header: 'Pengguna',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Pengguna' },
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-nb-black">{row.original.user?.full_name || '-'}</div>
          <div className="text-xs text-nb-gray-600">{row.original.user?.username || ''}</div>
        </div>
      ),
    },
    {
      id: 'activity_type',
      header: 'Tipe Aktivitas',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Tipe Aktivitas' },
      cell: ({ row }) => (
        <Badge variant="default" size="sm">
          {row.original.activity_type?.name || '-'}
        </Badge>
      ),
    },
    {
      id: 'area',
      header: 'Area',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Area' },
      cell: ({ row }) => <div className="text-sm">{row.original.area?.name || '-'}</div>,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Status' },
      cell: ({ row }) => (
        <Badge variant={ACTIVITY_STATUS_BADGES[row.original.status]} size="sm">
          {ACTIVITY_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'photo_urls',
      header: 'Foto',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: 'Foto' },
      cell: ({ row }) => (
        <Badge variant="secondary" size="sm">
          {row.original.photo_urls?.length || 0} foto
        </Badge>
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
            <Field label="Rentang Tanggal">
              {() => (
                <DateRangePicker
                  showSteppers={false}
                  value={{
                    from: filters.fromDate || new Date().toISOString().slice(0, 10),
                    to: filters.toDate || new Date().toISOString().slice(0, 10),
                  }}
                  onChange={(r) => {
                    setFilters((prev) => ({
                      ...prev,
                      fromDate: r.from,
                      toDate: r.to,
                      page: 1,
                    }));
                  }}
                />
              )}
            </Field>
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
          <DataTable<Activity, unknown>
            columns={columns}
            data={activities}
            loading={isLoading}
            enablePagination={false}
            getRowId={(r) => r.id}
            rowActions={rowActions}
            emptyTitle="Tidak ada aktivitas"
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

      {view.item && (
        <DetailModal
          open={view.open}
          onOpenChange={view.onOpenChange}
          title="Detail Aktivitas"
          rows={[
            { label: 'Tanggal', value: new Date(view.item.created_at).toLocaleDateString('id-ID') },
            { label: 'Pengguna', value: view.item.user?.full_name },
            { label: 'Tipe Aktivitas', value: view.item.activity_type?.name },
            { label: 'Area', value: view.item.area?.name },
            {
              label: 'Status',
              value: (
                <Badge variant={ACTIVITY_STATUS_BADGES[view.item.status]} size="sm">
                  {ACTIVITY_STATUS_LABELS[view.item.status]}
                </Badge>
              ),
            },
            { label: 'Foto', value: `${view.item.photo_urls?.length || 0} foto` },
            { label: 'Catatan', value: view.item.notes },
          ] as DetailModalRow[]}
        />
      )}
    </div>
  );
}
