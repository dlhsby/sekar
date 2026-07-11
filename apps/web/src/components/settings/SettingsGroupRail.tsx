'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';

export interface SettingsGroup {
  key: string;
  label: string;
  /** Optional secondary line under the label (SWAT-style master rail). */
  hint?: string;
  /** Show the unsaved-changes dot for this group. */
  dirty?: boolean;
}

/**
 * Master rail for the settings master/detail layout — one selectable button per
 * group, with an unsaved-changes dot. Shared by the Personal + System tabs.
 */
export function SettingsGroupRail({
  groups,
  selected,
  onSelect,
  ariaLabel,
}: {
  groups: SettingsGroup[];
  selected: string;
  onSelect: (key: string) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-col gap-2" aria-label={ariaLabel}>
      {groups.map((g) => {
        const isActive = g.key === selected;
        return (
          <button
            key={g.key}
            type="button"
            aria-current={isActive}
            onClick={() => onSelect(g.key)}
            className={cn(
              'flex items-start justify-between gap-2 rounded-nb-base border-2 border-nb-black px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5',
              isActive
                ? '-translate-y-0.5 bg-nb-primary shadow-nb-md'
                : 'bg-nb-white shadow-nb-sm',
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-nb-body-sm font-bold text-nb-black">
                {g.label}
              </span>
              {g.hint && (
                <span className="block truncate text-nb-caption text-nb-gray-600">{g.hint}</span>
              )}
            </span>
            {g.dirty && (
              <span
                className="mt-1 size-2 shrink-0 rounded-full bg-nb-warning"
                aria-label={t('settings:actionBar.unsavedDot')}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
