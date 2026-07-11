'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, Badge, Input, SectionCard, Skeleton, EmptyState } from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import {
  useSystemSettings,
  useUpdateSetting,
  useClearSetting,
  type SettingDescription,
} from '@/lib/api/settings';

const SOURCE_VARIANT: Record<SettingDescription['source'], 'success' | 'secondary' | 'warning'> = {
  db: 'success',
  env: 'secondary',
  unset: 'warning',
};

/** System settings (ADR-049): grouped, source-badged, staged edits, save per group. */
export function SystemSettingsTab({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const clearSetting = useClearSetting();
  const [staged, setStaged] = useState<Record<string, string>>({});

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
  const currentString = (s: SettingDescription) => staged[s.key] ?? originalString(s);
  const setValue = (key: string, value: string) => setStaged((p) => ({ ...p, [key]: value }));

  const saveGroup = async (items: SettingDescription[]) => {
    const changed = items.filter(
      (s) => staged[s.key] !== undefined && staged[s.key] !== originalString(s),
    );
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

  return (
    <div className="space-y-5">
      {!canManage && (
        <p className="border-2 border-nb-info bg-nb-info-light px-4 py-3 text-nb-body-sm font-medium text-nb-black">
          {t('settings:system.readOnly')}
        </p>
      )}
      {groups.map(([group, items]) => {
        const dirty = items.some(
          (s) => staged[s.key] !== undefined && staged[s.key] !== originalString(s),
        );
        return (
          <SectionCard
            key={group}
            title={t(`settings:system.groups.${group}`, { defaultValue: group })}
            action={
              canManage ? (
                <Button
                  size="sm"
                  onClick={() => saveGroup(items)}
                  loading={updateSetting.isPending}
                  disabled={!dirty}
                >
                  {t('settings:system.save')}
                </Button>
              ) : undefined
            }
          >
            <ul className="divide-y-2 divide-nb-gray-100">
              {items.map((s) => (
                <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-nb-black">{s.label}</span>
                      <Badge variant={SOURCE_VARIANT[s.source]} size="sm">
                        {t(`settings:system.source.${s.source}`)}
                      </Badge>
                      {canManage && s.source === 'db' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revert(s.key)}
                          loading={clearSetting.isPending}
                        >
                          {t('settings:system.revert')}
                        </Button>
                      )}
                    </div>
                    {s.help && <p className="text-nb-caption text-nb-gray-600">{s.help}</p>}
                    <p className="font-mono text-[11px] text-nb-gray-600">{s.key}</p>
                  </div>
                  <div className="w-full sm:w-56">
                    {s.valueType === 'boolean' ? (
                      <BooleanControl
                        checked={currentString(s) === 'true'}
                        disabled={!canManage}
                        onToggle={(next) => setValue(s.key, String(next))}
                        label={s.label}
                      />
                    ) : (
                      <Input
                        type={s.valueType === 'number' ? 'number' : 'text'}
                        value={currentString(s)}
                        disabled={!canManage}
                        placeholder={s.isSecret ? t('settings:system.secretPlaceholder') : undefined}
                        onChange={(e) => setValue(s.key, e.target.value)}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        );
      })}
    </div>
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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-nb-black transition-colors disabled:opacity-60 ${
        checked ? 'bg-nb-primary' : 'bg-nb-gray-200'
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full border-2 border-nb-black bg-nb-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
