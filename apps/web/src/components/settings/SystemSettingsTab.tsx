'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, Badge, Input, SectionCard, Skeleton, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { getErrorMessage } from '@/lib/api/client';
import {
  useSystemSettings,
  useUpdateSetting,
  useClearSetting,
  type SettingDescription,
} from '@/lib/api/settings';
import { SettingsGroupRail, type SettingsGroup } from './SettingsGroupRail';
import { SettingsHeaderActions } from './SettingsHeaderActions';

const SOURCE_VARIANT: Record<SettingDescription['source'], 'success' | 'secondary' | 'warning'> = {
  db: 'success',
  env: 'secondary',
  unset: 'warning',
};

const NO_SUBGROUP = '_';

/**
 * System settings (ADR-049): master/detail with SWAT-style sub-group sections.
 * The rail shows a per-group setting count; each group's detail renders one card
 * per sub-group. Save/Reset live in the group header. Every row is label-left /
 * control-right.
 */
export function SystemSettingsTab({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const clearSetting = useClearSetting();
  const [staged, setStaged] = useState<Record<string, string>>({});
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const revert = async (key: string) => {
    try {
      await clearSetting.mutateAsync(key);
      setStaged((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success(t('settings:system.reverted'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, SettingDescription[]>();
    for (const s of data ?? []) {
      const arr = map.get(s.group) ?? [];
      arr.push(s);
      map.set(s.group, arr);
    }
    return Array.from(map.entries());
  }, [data]);

  if (isLoading || !data) {
    return (
      <SectionCard title={t('settings:system.title')}>
        <div className="space-y-3 py-2">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </SectionCard>
    );
  }
  if (isError) {
    return (
      <SectionCard title={t('settings:system.title')}>
        <EmptyState variant="error" title={t('settings:system.loadError')} />
      </SectionCard>
    );
  }

  const originalString = (s: SettingDescription) => (s.isSecret ? '' : String(s.value ?? ''));
  const isChanged = (s: SettingDescription) =>
    staged[s.key] !== undefined && staged[s.key] !== originalString(s);
  const setValue = (key: string, value: string) => setStaged((p) => ({ ...p, [key]: value }));

  const groupDirty = (items: SettingDescription[]) => items.some(isChanged);
  const active = groups.find(([g]) => g === selectedGroup) ?? groups[0];

  // Save/reset are scoped to the active group (buttons live in the header).
  const saveGroup = async (items: SettingDescription[]) => {
    const changed = items.filter(isChanged);
    try {
      for (const s of changed) {
        await updateSetting.mutateAsync({ key: s.key, value: staged[s.key] });
      }
      setStaged((prev) => {
        const next = { ...prev };
        items.forEach((s) => delete next[s.key]);
        return next;
      });
      toast.success(t('settings:system.saved'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const resetGroup = (items: SettingDescription[]) =>
    setStaged((prev) => {
      const next = { ...prev };
      items.forEach((s) => delete next[s.key]);
      return next;
    });

  const railGroups: SettingsGroup[] = groups.map(([group, items]) => ({
    key: group,
    label: t(`settings:system.groups.${group}`, { defaultValue: group }),
    hint: t('settings:system.settingCount', { count: items.length }),
    dirty: groupDirty(items),
  }));

  // Split the active group's settings into ordered sub-group sections.
  const subSections: [string, SettingDescription[]][] = [];
  if (active) {
    const map = new Map<string, SettingDescription[]>();
    for (const s of active[1]) {
      const sub = s.subgroup ?? NO_SUBGROUP;
      const arr = map.get(sub) ?? [];
      arr.push(s);
      map.set(sub, arr);
    }
    subSections.push(...map.entries());
  }

  // Setting labels + help are localized on the web, keyed by the setting key,
  // falling back to the backend catalog string (Indonesian) if a key is absent.
  const asMap = (v: unknown): Record<string, string> =>
    v && typeof v === 'object' ? (v as Record<string, string>) : {};
  const labelMap = asMap(t('settings:system.labels', { returnObjects: true }));
  const helpMap = asMap(t('settings:system.help', { returnObjects: true }));

  const renderRow = (s: SettingDescription) => (
    <SettingRow
      key={s.key}
      s={s}
      label={labelMap[s.key] ?? s.label}
      help={helpMap[s.key] ?? s.help}
      value={staged[s.key] ?? originalString(s)}
      canManage={canManage}
      reverting={clearSetting.isPending}
      onChange={(v) => setValue(s.key, v)}
      onRevert={() => revert(s.key)}
      sourceBadge={t(`settings:system.source.${s.source}`)}
      revertLabel={t('settings:system.revert')}
      secretPlaceholder={t('settings:system.secretPlaceholder')}
    />
  );

  return (
    <div className="space-y-4">
      {!canManage && (
        <p className="border-2 border-nb-info bg-nb-info-light px-4 py-3 text-nb-body-sm font-medium text-nb-black">
          {t('settings:system.readOnly')}
        </p>
      )}
      {/* Master/detail: group rail (left) + the selected group's sub-sections. */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <SettingsGroupRail
          groups={railGroups}
          selected={active?.[0] ?? ''}
          onSelect={setSelectedGroup}
          ariaLabel={t('settings:system.title')}
        />

        {active && (
          <div className="space-y-4">
            {/* Group header: title + Save/Reset (scoped to the whole group). */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-nb-h3">
                {t(`settings:system.groups.${active[0]}`, { defaultValue: active[0] })}
              </h3>
              {canManage && (
                <SettingsHeaderActions
                  dirty={groupDirty(active[1])}
                  saving={updateSetting.isPending}
                  onReset={() => resetGroup(active[1])}
                  onSave={() => saveGroup(active[1])}
                />
              )}
            </div>

            {/* Always titled sub-group cards — a subgroup-less setting (none in
                the catalog today) falls back to the "Lainnya"/Other card, so a
                card is never rendered without a title. */}
            {subSections.map(([sub, items]) => (
              <SectionCard
                key={sub}
                title={
                  sub === NO_SUBGROUP
                    ? t('settings:system.subgroups.other')
                    : t(`settings:system.subgroups.${sub}`, { defaultValue: sub })
                }
              >
                <ul className="divide-y-2 divide-nb-gray-100">{items.map(renderRow)}</ul>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── row (label left / control right) ─────────────────────────────────────── */

function SettingRow({
  s,
  label,
  help,
  value,
  canManage,
  reverting,
  onChange,
  onRevert,
  sourceBadge,
  revertLabel,
  secretPlaceholder,
}: {
  s: SettingDescription;
  /** Localized label (falls back to the backend catalog string). */
  label: string;
  /** Localized help (falls back to the backend catalog string). */
  help?: string;
  value: string;
  canManage: boolean;
  reverting: boolean;
  onChange: (v: string) => void;
  onRevert: () => void;
  sourceBadge: string;
  revertLabel: string;
  secretPlaceholder: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-nb-black">{label}</span>
          <Badge variant={SOURCE_VARIANT[s.source]} size="sm">
            {sourceBadge}
          </Badge>
          {canManage && s.source === 'db' && (
            <Button variant="ghost" size="sm" onClick={onRevert} loading={reverting}>
              {revertLabel}
            </Button>
          )}
        </div>
        {help && <p className="text-nb-caption text-nb-gray-600">{help}</p>}
        <p className="font-mono text-[11px] text-nb-gray-600">{s.key}</p>
      </div>
      <div className="w-full sm:w-56">
        {s.valueType === 'boolean' ? (
          <BooleanControl
            checked={value === 'true'}
            disabled={!canManage}
            onToggle={(next) => onChange(String(next))}
            label={label}
          />
        ) : s.valueType === 'select' ? (
          <select
            value={value}
            disabled={!canManage}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="h-11 w-full rounded-nb-base border-2 border-nb-black bg-nb-white px-3 text-nb-body-sm font-semibold text-nb-black shadow-nb-xs disabled:opacity-60"
          >
            {(s.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={s.valueType === 'number' ? 'number' : 'text'}
            value={value}
            disabled={!canManage}
            placeholder={s.isSecret ? secretPlaceholder : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </li>
  );
}

function BooleanControl({
  checked,
  disabled,
  onToggle,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onToggle(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-nb-black transition-colors disabled:opacity-60',
        checked ? 'bg-nb-primary' : 'bg-nb-gray-200',
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full border-2 border-nb-black bg-nb-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
