'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2, RotateCcw, History } from 'lucide-react';
import { Button, Badge, Textarea, FormInput, FormSelect } from '@/components/ui';
import { EntityHistoryDialog } from '@/components/audit/EntityHistoryDialog';
import { getErrorMessage } from '@/lib/api/client';
import { hasPermission } from '@/lib/auth/permissions';
import { usePermissions } from '@/lib/auth/usePermissions';
import {
  useUpdateRole,
  type Role,
  type MonitoringScope,
  type HomeScope,
  type PermissionCatalogCategory,
} from '@/lib/api/roles';
import { PermissionAccordion } from './PermissionAccordion';
import { MarkerIconPicker } from '@/components/forms/MarkerIconPicker';
import { ColorField, HEX_COLOR } from '@/components/forms/ColorField';

const SCOPES: MonitoringScope[] = ['city', 'district', 'region', 'location', 'none'];
const HOME_SCOPES: HomeScope[] = ['none', 'district'];

/** '' ↔ null (unlimited); otherwise the integer, or NaN when not a whole number. */
const limitToText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
const textToLimit = (text: string): number | null =>
  text.trim() === '' ? null : /^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
// Fallback accent for a role that has no colour yet (custom roles pre-pick).
// eslint-disable-next-line sekar-design/no-inline-hex-colors -- color-input default value
const DEFAULT_ROLE_COLOR = '#7FBC8C';

interface RoleEditorProps {
  role: Role;
  catalog: PermissionCatalogCategory[];
  canManage: boolean;
  onRequestDelete: (role: Role) => void;
}

/** Right-pane editor: label/scope/marker + permission accordion + save. */
export function RoleEditor({ role, catalog, canManage, onRequestDelete }: RoleEditorProps) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const updateRole = useUpdateRole();
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const [homeScope, setHomeScope] = useState<HomeScope>(role.home_scope ?? 'none');
  const [maxPlaces, setMaxPlaces] = useState(limitToText(role.max_places_per_shift));
  const [maxTeams, setMaxTeams] = useState(limitToText(role.max_teams_per_shift));
  const initialColor = role.marker_color ?? DEFAULT_ROLE_COLOR;
  const [markerColor, setMarkerColor] = useState<string>(initialColor);
  const initialIcon = role.marker_icon ?? null;
  const [markerIcon, setMarkerIcon] = useState<string | null>(initialIcon);
  const [checked, setChecked] = useState<Set<string>>(initialChecked);

  const permsDirty =
    checked.size !== initialChecked.size || [...checked].some((k) => !initialChecked.has(k));
  const isDirty =
    name !== role.name ||
    description !== (role.description ?? '') ||
    scope !== role.monitoring_scope ||
    homeScope !== (role.home_scope ?? 'none') ||
    maxPlaces !== limitToText(role.max_places_per_shift) ||
    maxTeams !== limitToText(role.max_teams_per_shift) ||
    (markerIcon ?? null) !== initialIcon ||
    markerColor !== initialColor ||
    permsDirty;

  const resetChanges = () => {
    setName(role.name);
    setDescription(role.description ?? '');
    setScope(role.monitoring_scope);
    setHomeScope(role.home_scope ?? 'none');
    setMaxPlaces(limitToText(role.max_places_per_shift));
    setMaxTeams(limitToText(role.max_teams_per_shift));
    setMarkerIcon(initialIcon);
    setMarkerColor(initialColor);
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
  const homeScopeOptions = HOME_SCOPES.map((s) => ({
    value: s,
    label: t(`access-control:homeScope.${s}`),
  }));

  const trimmedName = name.trim();
  const nameError = !trimmedName ? t('access-control:validation.nameRequired') : undefined;
  const colorError = !HEX_COLOR.test(markerColor)
    ? t('access-control:validation.colorInvalid')
    : undefined;
  // Mirrors the backend: district monitoring is filtered by the viewer's home rayon.
  const homeScopeError =
    scope === 'district' && homeScope !== 'district'
      ? t('access-control:validation.homeScopeForDistrict')
      : undefined;
  const placesValue = textToLimit(maxPlaces);
  const teamsValue = textToLimit(maxTeams);
  const placesError =
    Number.isNaN(placesValue) || (placesValue !== null && placesValue < 1)
      ? t('access-control:validation.limitInvalid')
      : undefined;
  const teamsError = Number.isNaN(teamsValue) ? t('access-control:validation.limitInvalid') : undefined;
  const formError = nameError ?? colorError ?? homeScopeError ?? placesError ?? teamsError;

  const handleSave = async () => {
    if (formError) {
      toast.error(formError);
      return;
    }
    try {
      await updateRole.mutateAsync({
        id: role.id,
        payload: {
          name: name.trim(),
          description: description.trim() || undefined,
          monitoring_scope: scope,
          home_scope: homeScope,
          max_places_per_shift: placesValue,
          max_teams_per_shift: teamsValue,
          marker_icon: markerIcon ?? undefined,
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
            <Badge variant="secondary" size="sm" title={t('access-control:systemBadgeHint')}>
              {t('access-control:systemBadge')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {can('audit:read') && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<History className="size-4" />}
              onClick={() => setHistoryOpen(true)}
            >
              {t('admin:audit.history.action')}
            </Button>
          )}
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
              disabled={!!formError || !isDirty}
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
        <FormSelect
          label={t('access-control:fields.homeScope')}
          helperText={t('access-control:fields.homeScopeHint')}
          options={homeScopeOptions}
          value={homeScope}
          onChange={(v) => setHomeScope(v as HomeScope)}
          disabled={!canManage}
          error={canManage ? homeScopeError : undefined}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label={t('access-control:fields.maxPlaces')}
            inputMode="numeric"
            value={maxPlaces}
            onChange={(e) => setMaxPlaces(e.target.value)}
            helperText={t('access-control:fields.limitHint')}
            disabled={!canManage}
            error={canManage ? placesError : undefined}
          />
          <FormInput
            label={t('access-control:fields.maxTeams')}
            inputMode="numeric"
            value={maxTeams}
            onChange={(e) => setMaxTeams(e.target.value)}
            helperText={t('access-control:fields.limitHint')}
            disabled={!canManage}
            error={canManage ? teamsError : undefined}
          />
        </div>
        <Textarea
          label={t('access-control:fields.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canManage}
        />
        <MarkerIconPicker value={markerIcon} onChange={setMarkerIcon} disabled={!canManage} />
        <ColorField
          label={t('access-control:fields.markerColor')}
          value={markerColor}
          fallback={DEFAULT_ROLE_COLOR}
          onChange={setMarkerColor}
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

      <EntityHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entityType="role"
        entityId={role.id}
        name={role.name}
      />
    </div>
  );
}
