'use client';

/**
 * MonitoringTogglePanel — overlay card pinned to the top-right of the
 * monitoring map. Lets the user toggle which layers (workers / plants /
 * overdue / rayons / areas) are rendered.
 *
 * Phase 3 sub-phase 3-4 (Web mirror of mobile MonitoringToggleSheet).
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';

export interface MonitoringLayerVisibility {
  workers: boolean;
  plants: boolean;
  overdue: boolean;
  rayons: boolean;
  areas: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: MonitoringLayerVisibility = {
  workers: true,
  plants: true,
  overdue: true,
  rayons: true,
  areas: true,
};

interface LayerRow {
  key: keyof MonitoringLayerVisibility;
  labelKey: string;
  icon: string;
}

const LAYER_ROWS: LayerRow[] = [
  { key: 'workers', labelKey: 'monitoring:toggle.workers', icon: '👷' },
  { key: 'plants', labelKey: 'monitoring:toggle.plants', icon: '🌳' },
  { key: 'overdue', labelKey: 'monitoring:toggle.overdue', icon: '⚠️' },
  { key: 'rayons', labelKey: 'monitoring:toggle.rayons', icon: '🗺️' },
  { key: 'areas', labelKey: 'monitoring:toggle.areas', icon: '📍' },
];

export interface MonitoringTogglePanelProps {
  value: MonitoringLayerVisibility;
  onChange: (next: MonitoringLayerVisibility) => void;
  className?: string;
}

export function MonitoringTogglePanel({
  value,
  onChange,
  className,
}: MonitoringTogglePanelProps) {
  const { t } = useTranslation(['monitoring']);
  const toggle = useCallback(
    (key: keyof MonitoringLayerVisibility) => {
      onChange({ ...value, [key]: !value[key] });
    },
    [value, onChange]
  );

  return (
    <div
      role="group"
      aria-label={t('monitoring:toggle.label')}
      className={cn(
        'absolute top-3 left-3 z-[5]',
        'border-2 border-nb-black bg-nb-white rounded-nb-base',
        'shadow-nb-md',
        'flex flex-col min-w-[170px] overflow-hidden',
        className
      )}
    >
      <div className="px-3 py-1.5 border-b-2 border-nb-black bg-nb-gray-50">
        <p className="text-nb-caption font-black text-nb-black uppercase tracking-wide">
          {t('monitoring:toggle.title')}
        </p>
      </div>
      <ul className="flex flex-col">
        {LAYER_ROWS.map((row, idx) => {
          const label = t(row.labelKey);
          return (
            <li
              key={row.key}
              className={cn(
                idx !== LAYER_ROWS.length - 1 && 'border-b border-nb-gray-200'
              )}
            >
              <label
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-1.5 cursor-pointer select-none',
                  'hover:bg-nb-gray-50'
                )}
              >
                <span className="flex items-center gap-1.5 text-nb-caption font-bold text-nb-black">
                  <span aria-hidden="true">{row.icon}</span>
                  {label}
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={t('monitoring:toggle.showLayer', { label })}
                  checked={value[row.key]}
                  onChange={() => toggle(row.key)}
                  className="w-4 h-4 accent-nb-primary"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
