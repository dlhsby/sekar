/**
 * Activities List Page (Phase 2C - with approval workflow)
 * Access: MONITORING_ROLES
 */

'use client';

import type { DetailModalRow } from '@/components/ui';
import { intlLocale } from '@/lib/i18n/date-locale';
import { useAuth } from '@/lib/auth/hooks';
import { useActivities, useApproveActivity, useRejectActivity } from '@/lib/api/activities';
import { useActivityTypes } from '@/lib/api/activity-types';
import { useLocations } from '@/lib/api/locations';
import { useTranslation } from 'react-i18next';
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
import { ActivityFormModal } from '@/components/activities/ActivityFormModal';
import { DeleteActivityModal } from '@/components/activities/DeleteActivityModal';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Activity, ActivityFilters, ActivityStatus } from '@/types/models';
import { MONITORING_ROLES, ACTIVITY_APPROVER_ROLES, hasRole } from '@/lib/constants/roles';
import { getActivityStatusLabels, ACTIVITY_STATUS_BADGES } from '@/lib/constants/activities';
import { useViewModal } from '@/lib/hooks/use-view-modal';
import { runAction } from '@/lib/hooks/use-action';

const isValidActivityStatus = (value: string): value is ActivityStatus | 'all' => {
  return ['all', 'pending', 'approved', 'rejected'].includes(value);
};

export default function ActivitiesPage() {
  const { t } = useTranslation(['activities', 'common', 'status']);
  const activityLabels = getActivityStatusLabels();
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; activity: Activity | null }>({
    isOpen: false,
    activity: null,
  });
  const limit = 20;
  const isAdmin =
    user?.role === 'admin_system' || user?.role === 'superadmin' || user?.role === 'management';

  const approveMutation = useApproveActivity();
  const rejectMutation = useRejectActivity();

  useEffect(() => {
    if (!authLoading && user && !hasRole(user.role, MONITORING_ROLES)) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Auto-scope korlap to their area
  useEffect(() => {
    if (user && user.role === 'korlap' && user.location_id && filters.areaId === 'all') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilters((prev) => ({ ...prev, areaId: user.location_id as string }));
    }
  }, [user, filters.areaId]);

  const { data: activityTypes } = useActivityTypes();
  const { data: areasData } = useLocations();

  const apiFilters: ActivityFilters = {
    activity_type_id: filters.activityTypeId !== 'all' ? filters.activityTypeId : undefined,
    status: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
    location_id: filters.areaId !== 'all' ? filters.areaId : undefined,
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
      await runAction(() => approveMutation.mutateAsync(id), {
        success: t('common:messages.approved'),
      });
    },
    [approveMutation, t]
  );

  const handleReject = useCallback(
    async (id: string) => {
      if (!rejectReason.trim()) return;
      await runAction(() => rejectMutation.mutateAsync({ id, reason: rejectReason }), {
        success: t('common:messages.rejected'),
        onSuccess: () => {
          setRejectingId(null);
          setRejectReason('');
        },
      });
    },
    [rejectReason, rejectMutation, t]
  );

  const rowActions = useCallback(
    (row: Activity): DataTableRowAction<Activity>[] => [
      {
        key: 'view',
        label: t('common:actions.view'),
        icon: Eye,
        onClick: () => {
          view.openWith(row);
        },
      },
      {
        key: 'edit',
        label: t('common:actions.edit'),
        icon: Pencil,
        hidden: !isAdmin,
        onClick: () => {
          setEditingActivity(row);
          setFormOpen(true);
        },
      },
      {
        key: 'approve',
        label: t('common:actions.approve'),
        icon: Check,
        onClick: () => handleApprove(row.id),
        disabled: approveMutation.isPending,
        hidden: row.status !== 'pending' || !canApprove,
      },
      {
        key: 'reject',
        label: t('common:actions.reject'),
        icon: X,
        variant: 'danger',
        onClick: () => setRejectingId(row.id),
        hidden: row.status !== 'pending' || !canApprove,
      },
      {
        key: 'delete',
        label: t('common:actions.delete'),
        icon: Trash2,
        variant: 'danger',
        hidden: !isAdmin,
        onClick: () => setDeleteModal({ isOpen: true, activity: row }),
      },
    ],
    [canApprove, approveMutation.isPending, handleApprove, view, isAdmin, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-nb-primary mx-auto mb-4"></div>
          <p className="text-nb-gray-600">{t('common:actions.loading')}</p>
        </div>
      </div>
    );
  }

  if (!hasRole(user.role, MONITORING_ROLES)) return null;

  const activities = activitiesData?.data || [];
  const pagination = activitiesData?.meta;

  const activityTypeOptions = [
    { value: 'all', label: t('activities:list.filters.allTypes') },
    ...(activityTypes || []).map((type) => ({ value: type.id, label: type.name })),
  ];

  const statusOptions = [
    { value: 'all', label: t('activities:list.filters.allStatus') },
    { value: 'pending', label: t('status:pending') },
    { value: 'approved', label: t('status:approved') },
    { value: 'rejected', label: t('status:rejected') },
  ];

  const areaOptions = [
    { value: 'all', label: t('activities:list.filters.allAreas') },
    ...(areasData?.data || []).map((a) => ({ value: a.id, label: a.name })),
  ];

  const columns: ColumnDef<Activity>[] = [
    {
      id: 'id',
      accessorKey: 'id',
      header: t('activities:list.table.columns.id'),
      enableSorting: false,
      meta: { label: t('activities:list.table.columns.id'), defaultHidden: true, filterVariant: 'text' },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
      ),
    },
    {
      id: 'created_at',
      header: t('activities:list.table.columns.date'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('activities:list.table.columns.date') },
      cell: ({ row }) => (
        <div className="text-sm">{new Date(row.original.created_at).toLocaleDateString(intlLocale())}</div>
      ),
    },
    {
      id: 'user',
      header: t('activities:list.table.columns.user'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('activities:list.table.columns.user') },
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-nb-black">{row.original.user?.full_name || '-'}</div>
          <div className="text-xs text-nb-gray-600">{row.original.user?.username || ''}</div>
        </div>
      ),
    },
    {
      id: 'activity_type',
      header: t('activities:list.table.columns.activityType'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('activities:list.table.columns.activityType') },
      cell: ({ row }) => (
        <Badge variant="default" size="sm">
          {row.original.activity_type?.name || '-'}
        </Badge>
      ),
    },
    {
      id: 'area',
      header: t('activities:list.table.columns.area'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('activities:list.table.columns.area') },
      cell: ({ row }) => <div className="text-sm">{row.original.area?.name || '-'}</div>,
    },
    {
      id: 'status',
      header: t('activities:list.table.columns.status'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('activities:list.table.columns.status') },
      cell: ({ row }) => (
        <Badge variant={ACTIVITY_STATUS_BADGES[row.original.status]} size="sm">
          {activityLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'photo_urls',
      header: t('activities:list.table.columns.photos'),
      enableSorting: false,
      enableColumnFilter: false,
      meta: { label: t('activities:list.table.columns.photos') },
      cell: ({ row }) => (
        <Badge variant="secondary" size="sm">
          {row.original.photo_urls?.length || 0} {t('activities:list.table.columns.photos').toLowerCase()}
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
        <p className="text-nb-gray-600 mt-1">{t('activities:list.description')}</p>
      </div>

      <Card variant="elevated">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label={t('activities:list.filters.activityType')}
              value={filters.activityTypeId}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, activityTypeId: value, page: 1 }))
              }
              options={activityTypeOptions}
            />
            <FormSelect
              label={t('activities:list.filters.status')}
              value={filters.statusFilter}
              onChange={(value) => {
                if (isValidActivityStatus(value)) {
                  setFilters((prev) => ({ ...prev, statusFilter: value, page: 1 }));
                }
              }}
              options={statusOptions}
            />
            <FormSelect
              label={t('activities:list.filters.area')}
              value={filters.areaId}
              onChange={(value) => setFilters((prev) => ({ ...prev, areaId: value, page: 1 }))}
              options={areaOptions}
            />
            <Field label={t('activities:list.filters.dateRange')}>
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
              {t('common:actions.reset')} {t('common:actions.filter')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject Reason Dialog */}
      {rejectingId && (
        <Card variant="elevated">
          <CardContent>
            <div className="space-y-3">
              <h3 className="font-bold text-nb-black">{t('activities:list.actions.rejectDialog')}</h3>
              <FormInput
                label={t('activities:list.actions.reasonLabel')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('activities:list.actions.reasonPlaceholder')}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(rejectingId)}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  {t('activities:list.actions.rejectButton')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                >
                  {t('common:actions.cancel')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-nb-black">{t('activities:list.table.title')}</h2>
            <div className="text-sm text-nb-gray-600">{pagination?.total || 0} {t('activities:list.pagination.total')}</div>
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
            createAction={{
              label: t('activities:createButton'),
              hidden: !isAdmin,
              onClick: () => {
                setEditingActivity(null);
                setFormOpen(true);
              },
            }}
            emptyTitle={t('activities:list.empty.noActivities')}
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t-3 border-nb-black">
              <div className="text-sm text-nb-gray-600">
                {t('activities:list.pagination.page', {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                })}
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
                  {t('activities:list.pagination.previous')}
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
                  {t('activities:list.pagination.next')}
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
          title={t('activities:list.actions.viewModal')}
          rows={[
            { label: t('activities:detail.fields.dateTime'), value: new Date(view.item.created_at).toLocaleDateString(intlLocale()) },
            { label: t('activities:detail.fields.user'), value: view.item.user?.full_name },
            { label: t('activities:detail.fields.activityType'), value: view.item.activity_type?.name },
            { label: t('activities:detail.fields.area'), value: view.item.area?.name },
            {
              label: t('activities:list.table.columns.status'),
              value: (
                <Badge variant={ACTIVITY_STATUS_BADGES[view.item.status]} size="sm">
                  {activityLabels[view.item.status]}
                </Badge>
              ),
            },
            { label: t('activities:detail.fields.photos'), value: `${view.item.photo_urls?.length || 0} ${t('activities:detail.fields.photos').toLowerCase()}` },
            { label: t('activities:detail.fields.notes'), value: view.item.notes },
          ] as DetailModalRow[]}
        />
      )}

      <ActivityFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        activity={editingActivity}
        onSuccess={() => {
          setFilters((prev) => ({ ...prev, page: 1 }));
        }}
      />

      <DeleteActivityModal
        activity={deleteModal.activity}
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, activity: null })}
        onSuccess={() => {
          setDeleteModal({ isOpen: false, activity: null });
          setFilters((prev) => ({ ...prev, page: 1 }));
        }}
      />
    </div>
  );
}
