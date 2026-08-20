'use client';

/**
 * MonitoringLayersPanel — the "Pengaturan" (settings) control popover, opened
 * from the settings button. Chooses what the map draws per layer. State is owned
 * by the page (persisted via useMonitoringLayers).
 *
 * Every row is the same control: independent checkbox chips, one per facet, plus
 * Semua / Sembunyikan shortcuts. A select made the operator translate what they
 * wanted into one of four named states; the chips say it directly, and they can
 * express combinations the select had no word for (see `layers.ts`).
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LAYER_ROWS, allFacets, toggleFacet, type MonitoringLayers } from '@/lib/monitoring/layers';
import { MODE_OPTIONS, type MonitoringMode } from '@/lib/monitoring/mapMode';

export interface MonitoringLayersPanelProps {
  layers: MonitoringLayers;
  onSetLayer: (key: keyof MonitoringLayers, facets: string[]) => void;
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

      {/* Mode — how much of the hierarchy the map draws at once. A SELECT, not a
          segmented control: three options no longer fit side by side without
          truncating their labels, and the layer rows below already read as
          controls-in-a-list. */}
      <label
        htmlFor="monitoring-mode"
        className="mb-1.5 block text-xs font-bold uppercase text-nb-gray-500"
      >
        {t('monitoring:mode.title')}
      </label>
      <select
        id="monitoring-mode"
        value={mode}
        onChange={(e) => onSetMode(e.target.value as MonitoringMode)}
        className="mb-2 min-h-touch w-full rounded-nb-sm border-2 border-nb-black bg-nb-white px-2 py-1 text-sm font-bold text-nb-black"
      >
        {MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.labelKey)}
          </option>
        ))}
      </select>
      <p className="mb-4 text-xs text-nb-gray-500">{t(`monitoring:mode.${mode}Hint`)}</p>

      <span className="mb-1.5 block text-xs font-bold uppercase text-nb-gray-500">
        {t('monitoring:layers.overlays')}
      </span>
      <ul className="flex flex-col gap-3">
        {LAYER_ROWS.map(({ key, labelKey, facets }) => {
          const selected = layers[key] as readonly string[];
          const every = allFacets(key);
          const isAll = selected.length === every.length;
          const isNone = selected.length === 0;
          return (
            <li key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-nb-black">{t(labelKey)}</span>
                {/* Shortcuts, not options: they write the same set the chips do,
                    so the two can never disagree. Disabled once already applied,
                    which doubles as the "you are here" indicator. */}
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onSetLayer(key, every)}
                    disabled={isAll}
                    className="rounded-nb-sm px-1.5 py-0.5 text-xs font-bold text-nb-gray-500 underline-offset-2 hover:text-nb-black hover:underline disabled:cursor-default disabled:text-nb-gray-300 disabled:no-underline"
                  >
                    {t('monitoring:layers.option.all')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetLayer(key, [])}
                    disabled={isNone}
                    className="rounded-nb-sm px-1.5 py-0.5 text-xs font-bold text-nb-gray-500 underline-offset-2 hover:text-nb-black hover:underline disabled:cursor-default disabled:text-nb-gray-300 disabled:no-underline"
                  >
                    {t('monitoring:layers.option.none')}
                  </button>
                </span>
              </div>
              <div
                role="group"
                aria-label={t(labelKey)}
                className="flex flex-wrap gap-1.5"
              >
                {facets.map((f) => {
                  const on = selected.includes(f.value);
                  return (
                    <label
                      key={f.value}
                      className={cn(
                        'flex cursor-pointer select-none items-center gap-1.5 rounded-nb-sm border-2 border-nb-black px-2 py-1 text-xs font-bold',
                        on
                          ? 'bg-nb-primary text-nb-black'
                          : 'bg-nb-white text-nb-gray-500 hover:bg-nb-gray-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-nb-black"
                        checked={on}
                        onChange={() => onSetLayer(key, toggleFacet(key, selected, f.value))}
                      />
                      {t(f.labelKey)}
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
