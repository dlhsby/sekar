'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, ShieldCheck } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  FormInput,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Skeleton,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import { usePermissions } from '@/lib/auth/usePermissions';
import {
  useRoles,
  usePermissionCatalog,
  useCreateRole,
  useDeleteRole,
  type Role,
} from '@/lib/api/roles';
import { RoleEditor } from '@/components/roles/RoleEditor';
import { cn } from '@/lib/utils/cn';

export default function RolesPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { data: roles, isLoading, isError: rolesError } = useRoles();
  const { data: catalog, isError: catalogError } = usePermissionCatalog();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const sortedRoles = useMemo(() => roles ?? [], [roles]);
  // `selected` falls back to the first role, so no effect is needed to seed it.
  const selected = useMemo(
    () => sortedRoles.find((r) => r.id === selectedId) ?? sortedRoles[0] ?? null,
    [sortedRoles, selectedId],
  );

  if (!can('role:read')) {
    return <EmptyState variant="error" title={t('access-control:denied')} />;
  }

  const handleCreate = async () => {
    try {
      const created = await createRole.mutateAsync({ name: newName.trim() });
      toast.success(t('access-control:toast.created', { name: created.name }));
      setCreateOpen(false);
      setNewName('');
      setSelectedId(created.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRole.mutateAsync(pendingDelete.id);
      toast.success(t('access-control:toast.deleted'));
      if (selected?.id === pendingDelete.id) setSelectedId(null);
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-nb-h1">{t('access-control:title')}</h1>
          <p className="text-nb-body-sm text-nb-gray-600">{t('access-control:subtitle')}</p>
        </div>
        {can('role:create') && (
          <Button leftIcon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            {t('access-control:addRole')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Role list */}
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </>
          ) : (
            sortedRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedId(role.id)}
                className={cn(
                  'w-full rounded-nb-base border-2 border-nb-black bg-nb-white p-3 text-left shadow-nb-sm transition-transform hover:-translate-y-0.5',
                  selected?.id === role.id && 'bg-nb-primary-light',
                )}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-bold text-nb-black">
                    {role.name}
                  </span>
                  {role.is_system && (
                    <Badge variant="secondary" size="sm">
                      {t('access-control:systemBadge')}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-nb-gray-600">
                  {t('access-control:counts.permissions', { count: role.permissionCount })} ·{' '}
                  {t('access-control:counts.users', { count: role.userCount })}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Editor */}
        <Card variant="outlined" className="p-5">
          {rolesError || catalogError ? (
            <EmptyState variant="error" title={t('access-control:empty.loadError')} />
          ) : selected && catalog ? (
            <RoleEditor
              key={selected.id}
              role={selected}
              catalog={catalog}
              canManage={can('role:update')}
              onRequestDelete={setPendingDelete}
            />
          ) : (
            <EmptyState variant="noData" title={t('access-control:empty.selectRole')} />
          )}
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('access-control:dialog.createTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-nb-body-sm text-nb-gray-600">
              {t('access-control:dialog.createHint')}
            </p>
            <FormInput
              label={t('access-control:fields.name')}
              placeholder={t('access-control:fields.namePlaceholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('access-control:actions.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              loading={createRole.isPending}
              disabled={newName.trim().length < 2}
            >
              {t('access-control:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('access-control:dialog.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-nb-body-sm text-nb-black">
              {t('access-control:dialog.deleteMessage', { name: pendingDelete?.name })}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              {t('access-control:actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleteRole.isPending}>
              {t('access-control:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
