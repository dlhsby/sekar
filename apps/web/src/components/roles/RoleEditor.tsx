'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2, RotateCcw } from 'lucide-react';
import { Button, Badge, Textarea, FormInput, FormSelect } from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import { hasPermission } from '@/lib/auth/permissions';
import {
  useUpdateRole,
  type Role,
  type MonitoringScope,
  type PermissionCatalogCategory,
} from '@/lib/api/roles';
import { PermissionAccordion } from './PermissionAccordion';
import { MarkerImagePicker } from '@/components/forms/MarkerImagePicker';
import { roleMarkerDefault } from '@/lib/constants/markerDefaults';

const SCOPES: MonitoringScope[] = ['city', 'district', 'region', 'location', 'none'];

interface RoleEditorProps {
  role: Role;
  catalog: PermissionCatalogCategory[];
  canManage: boolean;
  onRequestDelete: (role: Role) => void;
}

/** Right-pane editor: label/scope/marker + permission accordion + save. */
export function RoleEditor({ role, catalog, canManage, onRequestDelete }: RoleEditorProps) {
  const { t } = useTranslation();
  const updateRole = useUpdateRole();

  const isSuperuser = role.permissionKeys.includes('*:*');
  const allKeys = useMemo(
    () => catalog.flatMap((c) => c.resources.flatMap((r) => r.actions.map((a) => a.key))),
    [catalog],
  );

  // State is initialised from props directly; the page keys this component by
  // role.id so it remounts (and re-initialises) when the selection changes.
  // Wildcards are expanded to concrete checked keys via the matcher.
  const initialChecked = useMemo(
    () => new Set(allKeys.filter((k) => hasPermission(role.permissionKeys, k))),
    [allKeys, role.permissionKeys],
  );

  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [scope, setScope] = useState<MonitoringScope>(role.monitoring_scope);
  const [markerImageUrl, setMarkerImageUrl] = useState<string | null>(
    role.marker_image_url ?? null,
  );
  const [checked, setChecked] = useState<Set<string>>(initialChecked);

  const initialMarker = role.marker_image_url ?? null;
  const permsDirty =
    checked.size !== initialChecked.size || [...checked].some((k) => !initialChecked.has(k));
  const isDirty =
    name !== role.name ||
    description !== (role.description ?? '') ||
    scope !== role.monitoring_scope ||
    (markerImageUrl ?? null) !== initialMarker ||
    permsDirty;

  const resetChanges = () => {
    setName(role.name);
    setDescription(role.description ?? '');
    setScope(role.monitoring_scope);
    setMarkerImageUrl(initialMarker);
    setChecked(new Set(initialChecked));
  };

  const toggle = (key: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const toggleMany = (keys: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const scopeOptions = SCOPES.map((s) => ({ value: s, label: t(`access-control:scope.${s}`) }));

  const trimmedName = name.trim();
  const nameError = !trimmedName ? t('access-control:validation.nameRequired') : undefined;

  const handleSave = async () => {
    if (nameError) {
      toast.error(nameError);
      return;
    }
    try {
      await updateRole.mutateAsync({
        id: role.id,
        payload: {
          name: name.trim(),
          description: description.trim() || undefined,
          monitoring_scope: scope,
          marker_icon: role.marker_icon ?? undefined,
          marker_image_url: markerImageUrl,
          // Preserve the *:* superuser grant instead of materializing it.
          ...(isSuperuser ? {} : { permissionKeys: Array.from(checked) }),
        },
      });
      toast.success(t('access-control:toast.updated', { name: name.trim() }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-nb-h2">{role.name}</h2>
          {role.is_system && (
            <Badge variant="secondary" size="sm" title={t('access-control:systemBadgeHint')}>
              {t('access-control:systemBadge')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManage && !role.is_system && (
            <Button
              variant="destructive"
              size="sm"
              leftIcon={<Trash2 className="size-4" />}
              onClick={() => onRequestDelete(role)}
            >
              {t('access-control:actions.delete')}
            </Button>
          )}
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="size-4" />}
              onClick={resetChanges}
              disabled={!isDirty || updateRole.isPending}
            >
              {t('access-control:actions.resetChanges')}
            </Button>
          )}
          {canManage && (
            <Button
              onClick={handleSave}
              loading={updateRole.isPending}
              disabled={!!nameError || !isDirty}
            >
              {updateRole.isPending
                ? t('access-control:actions.saving')
                : t('access-control:actions.save')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <FormInput
          label={t('access-control:fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
          required
          error={canManage ? nameError : undefined}
        />
        <FormSelect
          label={t('access-control:fields.scope')}
          options={scopeOptions}
          value={scope}
          onChange={(v) => setScope(v as MonitoringScope)}
          disabled={!canManage}
        />
        <Textarea
          label={t('access-control:fields.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canManage}
        />
        <MarkerImagePicker
          value={markerImageUrl}
          onChange={setMarkerImageUrl}
          defaultUrl={roleMarkerDefault(role.code)}
          disabled={!canManage}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-nb-h3">{t('access-control:permissions.title')}</h3>
        {isSuperuser ? (
          <p className="border-2 border-nb-info bg-nb-info-light px-4 py-3 text-nb-body-sm font-medium text-nb-black">
            {t('access-control:superuser')}
          </p>
        ) : (
          <PermissionAccordion
            catalog={catalog}
            checked={checked}
            onToggle={toggle}
            onToggleMany={toggleMany}
            disabled={!canManage}
          />
        )}
      </div>
    </div>
  );
}
