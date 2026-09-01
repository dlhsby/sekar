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
    // Mobile: a horizontal, scrollable tab strip so the groups don't stack into a
    // tall column above the content. Desktop (lg+, where the master/detail grid
    // splits): the original vertical rail.
    <nav
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label={ariaLabel}
    >
      {groups.map((g) => {
        const isActive = g.key === selected;
        return (
          <button
            key={g.key}
            type="button"
            aria-current={isActive}
            onClick={() => onSelect(g.key)}
            className={cn(
              'flex shrink-0 items-center justify-between gap-2 rounded-nb-base border-2 border-nb-black px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5 lg:shrink lg:items-start',
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
                <span
                  className={cn(
                    'hidden truncate text-nb-caption lg:block',
                    // Darker on the active (primary) background so the hint keeps
                    // WCAG 2.1 AA contrast (gray-600 on nb-primary is only 3.44:1).
                    isActive ? 'text-nb-gray-700' : 'text-nb-gray-600',
                  )}
                >
                  {g.hint}
                </span>
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
