'use client';

/**
 * MonitoringLayersPanel — the "Pengaturan" (settings) control popover, opened
 * from the settings button. Chooses what the map draws per layer. State is owned
 * by the page (persisted via useMonitoringLayers).
 *
 * Every row is a select with the same shape, so the panel reads as one control
 * repeated rather than a mix of widgets — and the personnel row can no longer be
 * put into a combination that means nothing (see `layers.ts`).
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LAYER_ROWS, type MonitoringLayers } from '@/lib/monitoring/layers';
import { MODE_OPTIONS, type MonitoringMode } from '@/lib/monitoring/mapMode';

export interface MonitoringLayersPanelProps {
  layers: MonitoringLayers;
  onSetLayer: (key: keyof MonitoringLayers, value: string) => void;
  mode: MonitoringMode;
  onSetMode: (mode: MonitoringMode) => void;
  onClose: () => void;
}

export function MonitoringLayersPanel({
  layers,
  onSetLayer,
  mode,
  onSetMode,
  onClose,
}: MonitoringLayersPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute left-3 right-3 top-28 z-30 max-h-[65%] w-auto overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white p-4 shadow-nb-lg sm:right-auto sm:w-72">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-nb-black">{t('monitoring:layers.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('monitoring:page.closePanelLabel')}
          className="rounded-nb-sm p-1 text-nb-gray-500 hover:bg-nb-gray-100 hover:text-nb-black"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode — how much of the hierarchy the map draws at once. A segmented
          control rather than a select: there are two options and the choice
          reshapes the whole map, so it should read as a stance, not a setting. */}
      <span className="mb-1.5 block text-xs font-bold uppercase text-nb-gray-500">
        {t('monitoring:mode.title')}
      </span>
      <div
        role="radiogroup"
        aria-label={t('monitoring:mode.title')}
        className="mb-4 flex overflow-hidden rounded-nb-sm border-2 border-nb-black"
      >
        {MODE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => onSetMode(o.value)}
            className={cn(
              'min-h-touch flex-1 px-2 py-1.5 text-sm font-bold',
              mode === o.value
                ? 'bg-nb-primary text-nb-black'
                : 'bg-nb-white text-nb-gray-500 hover:bg-nb-gray-50'
            )}
          >
            {t(o.labelKey)}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs text-nb-gray-500">{t(`monitoring:mode.${mode}Hint`)}</p>

      <span className="mb-1.5 block text-xs font-bold uppercase text-nb-gray-500">
        {t('monitoring:layers.overlays')}
      </span>
      <ul className="flex flex-col gap-2">
        {LAYER_ROWS.map(({ key, labelKey, options }) => (
          <li key={key} className="flex items-center justify-between gap-3">
            <label
              htmlFor={`layer-${key}`}
              className="text-sm font-medium text-nb-black"
            >
              {t(labelKey)}
            </label>
            <select
              id={`layer-${key}`}
              value={layers[key]}
              onChange={(e) => onSetLayer(key, e.target.value)}
              className="min-h-touch rounded-nb-sm border-2 border-nb-black bg-nb-white px-2 py-1 text-sm font-medium text-nb-black"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
