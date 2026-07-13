'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  Badge,
  type ColumnDef,
  type DataTableRowAction,
} from '@/components/ui';
import { usePermissions } from '@/lib/auth/usePermissions';
import { getErrorMessage } from '@/lib/api/client';
import { entityMarkerDefault } from '@/lib/constants/markerDefaults';
import { useTeamCategories, useDeleteTeamCategory, type TeamCategory } from '@/lib/api/teams';
import { TeamCategoryFormModal } from '@/components/teams/TeamCategoryFormModal';

export default function TeamsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { data: teamCategories = [], isLoading, error, refetch } = useTeamCategories();
  const deleteTeamCategory = useDeleteTeamCategory();

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
        accessorKey: 'is_active',
        header: t('admin:teamCategories.columnStatus'),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'secondary' : 'outline'}>
            {row.original.is_active ? t('admin:teamCategories.statusActive') : t('admin:teamCategories.statusInactive')}
          </Badge>
        ),
      },
      {
        id: 'marker',
        header: t('admin:teamCategories.columnMarker'),
        enableSorting: false,
        cell: ({ row }) => {
          const src = row.original.marker_image_url ?? entityMarkerDefault('team');
          const color = row.original.marker_color || 'transparent';
          return (
            <span
              className="inline-flex size-9 items-center justify-center rounded-nb-base border-2 border-nb-black bg-nb-white"
              style={{ backgroundColor: color }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small marker thumbnail */}
              <img src={src} alt="" className="size-6" />
            </span>
          );
        },
      },
    ],
    [t],
  );

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
        actions={
          can('team:manage') ? (
            <Button
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('admin:teamCategories.buttonAdd')}
            </Button>
          ) : undefined
        }
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
