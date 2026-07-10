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
import { useTeams, useDeleteTeam, type Team } from '@/lib/api/teams';
import { TeamFormModal } from '@/components/teams/TeamFormModal';

export default function TeamsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { data: teams = [], isLoading, error, refetch } = useTeams();
  const deleteTeam = useDeleteTeam();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [toDelete, setToDelete] = useState<Team | null>(null);

  const columns = useMemo<ColumnDef<Team>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('admin:teams.columnName'),
        cell: ({ row }) => <span className="font-bold text-nb-black">{row.original.name}</span>,
      },
      {
        id: 'type',
        accessorFn: (r) => r.team_type?.name ?? '',
        header: t('admin:teams.columnType'),
        cell: ({ row }) => <Badge variant="secondary">{row.original.team_type?.name ?? '—'}</Badge>,
      },
      {
        id: 'marker',
        header: t('admin:teams.columnMarker'),
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original.marker_color;
          return c ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border-2 border-nb-black"
                style={{ backgroundColor: c }}
                title={c}
              />
              <span className="font-mono text-nb-body-sm text-nb-gray-600">{c}</span>
            </span>
          ) : (
            <span className="text-nb-gray-500">—</span>
          );
        },
      },
    ],
    [t],
  );

  const rowActions = (r: Team): DataTableRowAction<Team>[] => [
    {
      key: 'edit',
      label: t('common:actions.edit'),
      icon: Pencil,
      hidden: !can('team:update'),
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
      hidden: !can('team:delete'),
      onClick: () => setToDelete(r),
    },
  ];

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTeam.mutateAsync(toDelete.id);
      toast.success(t('admin:teams.successDeleted'));
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (!can('team:read')) {
    return <EmptyState variant="error" title={t('admin:teams.denied')} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-nb-h1">{t('admin:teams.pageTitle')}</h1>
        <p className="text-nb-body-sm text-nb-gray-600">{t('admin:teams.description')}</p>
      </div>

      <DataTable
        columns={columns}
        data={teams}
        loading={isLoading}
        error={!!error}
        onRetry={() => refetch()}
        onRefresh={() => refetch()}
        getRowId={(r) => r.id}
        searchPlaceholder={t('admin:teams.searchPlaceholder')}
        rowActions={rowActions}
        actions={
          can('team:create') ? (
            <Button
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('admin:teams.buttonAdd')}
            </Button>
          ) : undefined
        }
        emptyTitle={t('admin:teams.emptyTitle')}
      />

      <TeamFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editing}
        onSuccess={() => refetch()}
      />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('admin:teams.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-nb-body-sm text-nb-black">
              {t('admin:teams.deleteMessage', { name: toDelete?.name })}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteTeam.isPending}>
              {t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
