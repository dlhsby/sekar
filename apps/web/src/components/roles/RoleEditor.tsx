'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  Textarea,
  FormInput,
  FormSelect,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import { hasPermission } from '@/lib/auth/permissions';
import {
  useUpdateRole,
  type Role,
  type MonitoringScope,
  type PermissionCatalogCategory,
} from '@/lib/api/roles';
import { PermissionAccordion } from './PermissionAccordion';

// eslint-disable-next-line sekar-design/no-inline-hex-colors -- color-input default value
const DEFAULT_MARKER_COLOR = '#7FBC8C';
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
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [scope, setScope] = useState<MonitoringScope>(role.monitoring_scope);
  const [markerIcon, setMarkerIcon] = useState(role.marker_icon ?? '');
  const [markerColor, setMarkerColor] = useState(role.marker_color ?? DEFAULT_MARKER_COLOR);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(allKeys.filter((k) => hasPermission(role.permissionKeys, k))),
  );

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

  const handleSave = async () => {
    try {
      await updateRole.mutateAsync({
        id: role.id,
        payload: {
          name: name.trim(),
          description: description.trim() || undefined,
          monitoring_scope: scope,
          marker_icon: markerIcon.trim() || undefined,
          marker_color: markerColor,
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
            <Badge variant="secondary" size="sm">
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
            <Button onClick={handleSave} loading={updateRole.isPending}>
              {updateRole.isPending
                ? t('access-control:actions.saving')
                : t('access-control:actions.save')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput
          label={t('access-control:fields.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
        />
        <FormSelect
          label={t('access-control:fields.scope')}
          options={scopeOptions}
          value={scope}
          onChange={(v) => setScope(v as MonitoringScope)}
          disabled={!canManage}
        />
        <div className="md:col-span-2">
          <Textarea
            label={t('access-control:fields.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canManage}
          />
        </div>
        <FormInput
          label={t('access-control:fields.markerIcon')}
          placeholder={t('access-control:fields.markerIconPlaceholder')}
          value={markerIcon}
          onChange={(e) => setMarkerIcon(e.target.value)}
          disabled={!canManage}
        />
        <div className="space-y-1.5">
          <label className="block text-nb-body-sm font-semibold text-nb-black">
            {t('access-control:fields.markerColor')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={t('access-control:fields.markerColor')}
              value={/^#[0-9a-fA-F]{6}$/.test(markerColor) ? markerColor : DEFAULT_MARKER_COLOR}
              onChange={(e) => setMarkerColor(e.target.value)}
              disabled={!canManage}
              className="h-11 w-14 shrink-0 cursor-pointer rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
            <Input
              value={markerColor}
              onChange={(e) => setMarkerColor(e.target.value)}
              disabled={!canManage}
              className="font-mono"
            />
          </div>
        </div>
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
