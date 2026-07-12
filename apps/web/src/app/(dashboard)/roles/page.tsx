'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, ShieldCheck, Search, ArrowUpDown, Check } from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  Input,
  FormInput,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

// System-role hierarchy (top → bottom). Custom roles sort after these, by name.
const ROLE_ORDER = [
  'superadmin',
  'admin_system',
  'management',
  'kepala_rayon',
  'admin_rayon',
  'korlap',
  'linmas',
  'satgas',
  'staff_kecamatan',
];
const roleRank = (code: string) => {
  const i = ROLE_ORDER.indexOf(code);
  return i === -1 ? ROLE_ORDER.length : i;
};

type SortMode = 'hierarchy' | 'nameAsc' | 'nameDesc' | 'users' | 'permissions';
const SORT_MODES: SortMode[] = ['hierarchy', 'nameAsc', 'nameDesc', 'users', 'permissions'];
const roleComparators: Record<SortMode, (a: Role, b: Role) => number> = {
  hierarchy: (a, b) => roleRank(a.code) - roleRank(b.code) || a.name.localeCompare(b.name),
  nameAsc: (a, b) => a.name.localeCompare(b.name),
  nameDesc: (a, b) => b.name.localeCompare(a.name),
  users: (a, b) => b.userCount - a.userCount || a.name.localeCompare(b.name),
  permissions: (a, b) => b.permissionCount - a.permissionCount || a.name.localeCompare(b.name),
};

export default function RolesPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { data: roles, isLoading, isError: rolesError } = useRoles();
  const { data: catalog, isError: catalogError } = usePermissionCatalog();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('hierarchy');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const sortedRoles = useMemo(
    () => [...(roles ?? [])].sort(roleComparators[sortMode]),
    [roles, sortMode],
  );
  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedRoles;
    return sortedRoles.filter((r) => r.name.toLowerCase().includes(q));
  }, [sortedRoles, search]);
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
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('access-control:search.placeholder')}
              aria-label={t('access-control:search.placeholder')}
              leftIcon={<Search className="size-4" />}
              className="flex-1"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('access-control:sort.label')}
                  title={t('access-control:sort.label')}
                >
                  <ArrowUpDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {SORT_MODES.map((mode) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className="flex items-center justify-between"
                  >
                    {t(`access-control:sort.${mode}`)}
                    {sortMode === mode && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isLoading ? (
            <>
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </>
          ) : filteredRoles.length === 0 ? (
            <p className="px-1 py-6 text-center text-nb-body-sm text-nb-gray-600">
              {t('access-control:search.noResults')}
            </p>
          ) : (
            filteredRoles.map((role) => {
              const isSelected = selected?.id === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  aria-current={isSelected}
                  onClick={() => setSelectedId(role.id)}
                  className={cn(
                    'w-full rounded-nb-base border-2 border-nb-black p-3 text-left transition-transform hover:-translate-y-0.5',
                    isSelected
                      ? '-translate-y-0.5 bg-nb-primary shadow-nb-md'
                      : 'bg-nb-white shadow-nb-sm',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-bold text-nb-black">
                      {role.name}
                    </span>
                    {role.is_system && (
                      <Badge variant="secondary" size="sm" title={t('access-control:systemBadgeHint')}>
                        {t('access-control:systemBadge')}
                      </Badge>
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      isSelected ? 'text-nb-black' : 'text-nb-gray-600',
                    )}
                  >
                    {t('access-control:counts.permissions', { count: role.permissionCount })} ·{' '}
                    {t('access-control:counts.users', { count: role.userCount })}
                  </p>
                </button>
              );
            })
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
