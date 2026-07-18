'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Pencil, Trash2, Power } from 'lucide-react';
import {
  Button,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  StatusPill,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';
import {
  useTeamCategories,
  useDeleteTeamCategory,
  useUpdateTeamCategory,
  type TeamCategory,
} from '@/lib/api/teams';
import { TeamCategoryFormModal } from '@/components/teams/TeamCategoryFormModal';

export default function TeamsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  // Catalog management shows deactivated categories too — pickers elsewhere keep
  // the active-only default.
  const { data: teamCategories = [], isLoading, error, refetch } = useTeamCategories(true, true);
  const deleteTeamCategory = useDeleteTeamCategory();
  const updateTeamCategory = useUpdateTeamCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamCategory | null>(null);
  const [toDelete, setToDelete] = useState<TeamCategory | null>(null);

  const columns = useMemo<ColumnDef<TeamCategory>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('admin:teamCategories.columnName'),
        cell: ({ row }) => <span className="font-bold text-nb-black">{row.original.name}</span>,
      },
      {
        id: 'active',
        accessorFn: (c) =>
          c.is_active
            ? t('admin:teamCategories.statusActive')
            : t('admin:teamCategories.statusInactive'),
        header: t('admin:teamCategories.columnStatus'),
        meta: {
          label: t('admin:teamCategories.columnStatus'),
          filterVariant: 'enum',
          filterOptions: [
            {
              value: t('admin:teamCategories.statusActive'),
              label: t('admin:teamCategories.statusActive'),
            },
            {
              value: t('admin:teamCategories.statusInactive'),
              label: t('admin:teamCategories.statusInactive'),
            },
          ],
        },
        cell: ({ row }) =>
          row.original.is_active ? (
            <StatusPill tone="ok" dot>
              {t('admin:teamCategories.statusActive')}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot>
              {t('admin:teamCategories.statusInactive')}
            </StatusPill>
          ),
      },
      {
        id: 'marker',
        header: t('admin:teamCategories.columnMarker'),
        enableSorting: false,
        cell: ({ row }) => {
          // eslint-disable-next-line sekar-design/no-inline-hex-colors -- fallback for missing color
          const color = row.original.marker_color || '#cccccc';
          return (
            <span
              className="inline-flex size-9 rounded-nb-base border-2 border-nb-black"
              style={{ backgroundColor: color }}
              title={color}
            />
          );
        },
      },
    ],
    [t],
  );

  const handleToggleActive = async (category: TeamCategory) => {
    try {
      await updateTeamCategory.mutateAsync({
        id: category.id,
        data: { is_active: !category.is_active },
      });
      toast.success(
        category.is_active
          ? t('admin:teamCategories.successDeactivated')
          : t('admin:teamCategories.successActivated'),
      );
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const rowActions = (r: TeamCategory): DataTableRowAction<TeamCategory>[] => [
    {
      key: 'edit',
      label: t('common:actions.edit'),
      icon: Pencil,
      hidden: !can('team:manage'),
      onClick: () => {
        setEditing(r);
        setFormOpen(true);
      },
    },
    {
      key: 'toggle-active',
      label: r.is_active
        ? t('admin:teamCategories.actionDeactivate')
        : t('admin:teamCategories.actionActivate'),
      icon: Power,
      hidden: !can('team:manage'),
      onClick: () => handleToggleActive(r),
    },
    {
      key: 'delete',
      label: t('common:actions.delete'),
      icon: Trash2,
      variant: 'danger',
      hidden: !can('team:manage'),
      onClick: () => setToDelete(r),
    },
  ];

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTeamCategory.mutateAsync(toDelete.id);
      toast.success(t('admin:teamCategories.successDeleted'));
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!can('team:read')) {
    return <EmptyState variant="error" title={t('admin:teamCategories.denied')} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-nb-h1">{t('admin:teamCategories.pageTitle')}</h1>
        <p className="text-nb-body-sm text-nb-gray-600">{t('admin:teamCategories.description')}</p>
      </div>

      <DataTable
        columns={columns}
        data={teamCategories}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder={t('admin:teamCategories.searchPlaceholder')}
        rowActions={rowActions}
        createAction={{
          label: t('admin:teamCategories.buttonAdd'),
          hidden: !can('team:manage'),
          onClick: () => {
            setEditing(null);
            setFormOpen(true);
          },
        }}
        emptyTitle={t('admin:teamCategories.emptyTitle')}
      />

      <TeamCategoryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        teamCategory={editing}
        onSuccess={() => refetch()}
      />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('admin:teamCategories.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-nb-body-sm text-nb-black">
              {t('admin:teamCategories.deleteMessage', { name: toDelete?.name })}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteTeamCategory.isPending}>
              {t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
