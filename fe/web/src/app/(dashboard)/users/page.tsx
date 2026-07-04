/**
 * Users List Page — account master data on the standardized DataTable
 * (toolbar search, per-column filter, sort, column-toggle, refresh, kebab row
 * actions). Create/edit happen in a modal; actions are permission-gated.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, Pencil, Trash2, Power, KeyRound, MapPin } from 'lucide-react';
import { UserAreasSheet, type UserAreasSheetTarget } from '@/components/users/UserAreasSheet';
import { toast } from 'sonner';
import {
  Button,
  ConfirmDialog,
  DataTable,
  PageHeader,
  RoleAvatar,
  StatusPill,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { RolePill } from '@/components/users/RolePill';
import { DeleteUserModal } from '@/components/users/DeleteUserModal';
import { UserFormModal } from '@/components/users/UserFormModal';
import { TempPasswordDialog } from '@/components/users/TempPasswordDialog';
import {
  useUsers,
  useDeactivateUser,
  useActivateUser,
  useResetUserPassword,
} from '@/lib/api/users';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import { useRayons } from '@/lib/api/rayons';
import { useUser } from '@/lib/auth/hooks';
import { ADMIN_ROLES, ROLE_LABELS } from '@/lib/constants/roles';
import { formatDate } from '@/lib/utils/time';
import { getErrorMessage } from '@/lib/api/client';
import type { User } from '@/types/models';

export default function UsersPage() {
  const { t } = useTranslation();
  const currentUser = useUser();
  // Full management (create/edit/delete) is admin-only; other roles that can
  // reach this page (admin_data) get a view-only kebab.
  const canManage = !!currentUser && ADMIN_ROLES.includes(currentUser.role);

  const { data, isLoading, error, refetch } = useUsers({ limit: 1000 });
  const users = useMemo(() => data?.data ?? [], [data]);
  const total = data?.meta?.total ?? users.length;

  const deactivateUser = useDeactivateUser();
  const activateUser = useActivateUser();
  const resetPassword = useResetUserPassword();
  const { data: shifts = [] } = useShiftDefinitions();
  const shiftNameById = useMemo(() => new Map(shifts.map((s) => [s.id, s.name])), [shifts]);
  // Rayon has no entity relation on User (only rayon_id) — resolve the name via
  // a map, mirroring how shift names are resolved above.
  const { data: rayons = [] } = useRayons();
  const rayonNameById = useMemo(() => new Map(rayons.map((r) => [r.id, r.name])), [rayons]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  // One-time temp password returned by the reset action, shown in a dialog.
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPwUsername, setTempPwUsername] = useState<string | undefined>(undefined);
  // The user pending a force-reset confirmation (shown before generating).
  const [resetConfirmUser, setResetConfirmUser] = useState<User | null>(null);
  const [areasSheetUser, setAreasSheetUser] = useState<UserAreasSheetTarget | null>(null);

  const handleResetPassword = useCallback(
    async (u: User) => {
      try {
        const { temp_password } = await resetPassword.mutateAsync(u.id);
        setTempPwUsername(u.username);
        setTempPassword(temp_password);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [resetPassword]
  );

  // Resolve an actor id (created_by/updated_by) to a display name via the loaded
  // user list — the backend returns ids only.
  const userNameById = useMemo(
    () => new Map(users.map((u) => [u.id, u.full_name])),
    [users]
  );
  const actorName = useCallback(
    (id?: string): string => (id ? (userNameById.get(id) ?? '—') : '—'),
    [userNameById]
  );

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'id',
        accessorKey: 'id',
        header: t('admin:users.columnId'),
        enableSorting: false,
        meta: { label: t('admin:users.columnId'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-nb-gray-600">{row.original.id}</span>
        ),
      },
      {
        id: 'full_name',
        accessorKey: 'full_name',
        header: t('admin:users.columnUser'),
        meta: { label: t('admin:users.columnUser'), filterVariant: 'text' },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <RoleAvatar name={u.full_name} role={u.role} src={u.profile_picture_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-bold text-nb-black">{u.full_name}</p>
                <p className="truncate font-mono text-[11px] text-nb-gray-600">{u.username}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'username',
        accessorKey: 'username',
        header: t('admin:users.columnUsername'),
        meta: { label: t('admin:users.columnUsername'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-nb-body-sm">{row.original.username}</span>
        ),
      },
      {
        id: 'role',
        // Filter/sort/search against the human label ("Top Management"), not the
        // raw enum ("top_management"), so typing the visible text matches.
        accessorFn: (u) => ROLE_LABELS[u.role] ?? u.role,
        header: t('admin:users.columnRole'),
        meta: { label: t('admin:users.columnRole'), filterVariant: 'text' },
        cell: ({ row }) => <RolePill role={row.original.role} />,
      },
      {
        id: 'phone_number',
        accessorFn: (u) => u.phone_number ?? '',
        header: t('admin:users.columnPhone'),
        meta: { label: t('admin:users.columnPhone'), filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="font-mono text-nb-body-sm">{row.original.phone_number ?? '—'}</span>
        ),
      },
      {
        id: 'rayon',
        accessorFn: (u) => (u.rayon_id ? (rayonNameById.get(u.rayon_id) ?? '') : ''),
        header: t('admin:users.columnRayon'),
        meta: { label: t('admin:users.columnRayon'), filterVariant: 'text' },
        cell: ({ row }) => {
          const id = row.original.rayon_id;
          return <span className="text-nb-body-sm">{id ? (rayonNameById.get(id) ?? '—') : '—'}</span>;
        },
      },
      {
        id: 'areas',
        accessorFn: (u) => u.assigned_area_count ?? 0,
        header: 'Area',
        meta: { label: 'Area' },
        cell: ({ row }) => {
          const u = row.original;
          const count = u.assigned_area_count ?? 0;
          if (count === 0) return <span className="text-nb-body-sm text-nb-gray-500">—</span>;
          return (
            <button
              type="button"
              onClick={() => setAreasSheetUser({ id: u.id, full_name: u.full_name })}
              aria-label={t('admin:areas.viewAssignedAreasAria', { count: count, name: u.full_name })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-nb-black rounded-nb-base bg-nb-white text-nb-body-sm font-bold shadow-nb-xs hover:shadow-nb-sm active:shadow-none transition-shadow duration-100"
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {count} Area
            </button>
          );
        },
      },
      {
        id: 'shift',
        accessorFn: (u) => (u.shift_definition_id ? shiftNameById.get(u.shift_definition_id) ?? '' : ''),
        header: t('admin:users.columnShift'),
        meta: { label: t('admin:users.columnShift'), filterVariant: 'text' },
        cell: ({ row }) => {
          const id = row.original.shift_definition_id;
          return <span className="text-nb-body-sm">{id ? shiftNameById.get(id) ?? '—' : '—'}</span>;
        },
      },
      {
        id: 'password_must_change',
        accessorFn: (u) => (u.password_must_change ? t('admin:users.statusYes') : t('admin:users.statusNo')),
        header: t('admin:users.columnPasswordMustChange'),
        meta: { label: t('admin:users.columnPasswordMustChange'), filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.password_must_change ? (
            <StatusPill tone="warn" dot>
              {t('admin:users.statusYes')}
            </StatusPill>
          ) : (
            <span className="text-nb-body-sm text-nb-gray-600">{t('admin:users.statusNo')}</span>
          ),
      },
      {
        id: 'status',
        accessorFn: (u) => (u.is_active ? t('admin:users.statusActive') : t('admin:users.statusInactive')),
        header: t('admin:users.columnStatus'),
        meta: { label: t('admin:users.columnStatus'), filterVariant: 'text' },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              {t('admin:users.statusActive')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('admin:users.statusInactive')}
            </StatusPill>
          ),
      },
      {
        id: 'created_at',
        accessorKey: 'created_at',
        header: t('admin:users.columnCreated'),
        meta: { label: t('admin:users.columnCreated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: t('admin:users.columnUpdated'),
        meta: { label: t('admin:users.columnUpdated'), defaultHidden: true, filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: 'created_by',
        accessorFn: (u) => actorName(u.created_by),
        header: t('admin:users.columnCreatedBy'),
        meta: { label: t('admin:users.columnCreatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.created_by)}
          </span>
        ),
      },
      {
        id: 'updated_by',
        accessorFn: (u) => actorName(u.updated_by),
        header: t('admin:users.columnUpdatedBy'),
        meta: { label: t('admin:users.columnUpdatedBy'), defaultHidden: true, filterVariant: 'text' },
        cell: ({ row }) => (
          <span className="text-nb-body-sm text-nb-gray-600">
            {actorName(row.original.updated_by)}
          </span>
        ),
      },
    ],
    [actorName, shiftNameById, rayonNameById]
  );

  const rowActions = useCallback(
    (u: User): DataTableRowAction<User>[] => [
      {
        key: 'view',
        label: t('admin:users.actionView'),
        icon: Eye,
        onClick: () => {
          setViewingUser(u);
          setViewOpen(true);
        },
      },
      {
        key: 'edit',
        label: t('admin:users.actionEdit'),
        icon: Pencil,
        disabled: !canManage,
        onClick: () => {
          setEditingUser(u);
          setFormOpen(true);
        },
      },
      {
        key: 'reset-password',
        label: t('admin:users.actionResetPassword'),
        icon: KeyRound,
        hidden: !canManage,
        onClick: () => setResetConfirmUser(u),
      },
      {
        key: 'toggle-active',
        label: u.is_active ? t('admin:users.actionDeactivate') : t('admin:users.actionActivate'),
        icon: Power,
        hidden: !canManage,
        onClick: () => (u.is_active ? deactivateUser.mutate(u.id) : activateUser.mutate(u.id)),
      },
      {
        key: 'delete',
        label: t('admin:users.actionDelete'),
        icon: Trash2,
        variant: 'danger',
        hidden: !canManage,
        onClick: () => setUserToDelete(u),
      },
    ],
    [canManage, deactivateUser, activateUser, t]
  );

  return (
    <div className="space-y-5">
      <PageHeader description={total ? t('admin:users.totalCount', { count: total }) : undefined} />

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(u) => u.id}
        searchPlaceholder={t('admin:users.searchPlaceholder')}
        rowActions={rowActions}
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditingUser(null);
                setFormOpen(true);
              }}
              leftIcon={<Plus className="h-5 w-5" />}
            >
              {t('admin:users.buttonAdd')}
            </Button>
          ) : undefined
        }
        emptyTitle={t('admin:users.emptyTitle')}
        emptyDescription={
          canManage ? t('admin:users.emptyDescription') : undefined
        }
      />

      <UserFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={() => refetch()}
        onCreated={(u) => {
          if (u.temp_password) {
            setTempPwUsername(u.username);
            setTempPassword(u.temp_password);
          }
        }}
      />

      <UserFormModal open={viewOpen} onOpenChange={setViewOpen} user={viewingUser} readOnly />

      <DeleteUserModal
        user={userToDelete}
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onSuccess={() => setUserToDelete(null)}
      />

      <ConfirmDialog
        open={!!resetConfirmUser}
        onOpenChange={(open) => !open && setResetConfirmUser(null)}
        title={t('admin:users.resetPasswordTitle')}
        description={
          resetConfirmUser
            ? t('admin:users.resetPasswordMessage', { fullName: resetConfirmUser.full_name })
            : undefined
        }
        confirmLabel={t('admin:users.resetPasswordConfirm')}
        loading={resetPassword.isPending}
        onConfirm={async () => {
          if (!resetConfirmUser) return;
          // Await first so the dialog shows its loading state; handleResetPassword
          // swallows errors (toast), so we always close + (on success) show the
          // temp-password dialog afterward.
          await handleResetPassword(resetConfirmUser);
          setResetConfirmUser(null);
        }}
      />

      <TempPasswordDialog
        password={tempPassword}
        username={tempPwUsername}
        onClose={() => {
          setTempPassword(null);
          setTempPwUsername(undefined);
        }}
      />

      <UserAreasSheet user={areasSheetUser} onClose={() => setAreasSheetUser(null)} />
    </div>
  );
}
