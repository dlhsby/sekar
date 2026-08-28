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
import { LAYER_ROWS, type MonitoringLayers } from '@/lib/monitoring/layers';
import { MultiSelect } from '@/components/ui';
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
          return (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-sm font-medium text-nb-black">{t(labelKey)}</span>
              {/* One control per row instead of a wrapping chip field. The chips
                  were fine for one tier and became a wall across four: this
                  panel is a settings surface, and its rows should read as
                  label + value like every other setting.

                  The options are unchanged — the same independent facets, with
                  Semua/Sembunyikan folded into the list's own all-row, which
                  writes exactly the set the boxes do. */}
              <MultiSelect
                // Fixed, not max-width: the four controls then share a left AND
                // right edge, so the panel reads as a column of settings rather
                // than four independently sized rows.
                className="w-44 shrink-0"
                ariaLabel={t(labelKey)}
                options={facets.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
                values={[...selected]}
                onChange={(next) => onSetLayer(key, next as MonitoringLayers[typeof key])}
                allLabel={t('monitoring:layers.option.all')}
                noneLabel={t('monitoring:layers.option.none')}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
