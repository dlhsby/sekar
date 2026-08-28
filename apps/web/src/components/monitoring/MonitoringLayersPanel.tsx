'use client';

/**
 * MonitoringLayersPanel — the "Pengaturan" (settings) control popover, opened
 * from the settings button. Chooses what the map draws per layer. State is owned
 * by the page (persisted via useMonitoringLayers).
 *
 * Two sections, deliberately shaped differently because they are different
 * things. **Mode** is one primary choice that changes what the whole map does,
 * so it gets a full-width control and a line explaining the trade. **Lapisan
 * peta** is four peers, so it is a two-column grid — label column, control
 * column — which reads as a settings table and stays short.
 *
 * Every layer row is one {@link MultiSelect}: independent facets, with Semua /
 * Sembunyikan as the dropdown's own all-row. A single-choice select made the
 * operator translate what they wanted into one of four named states, and could
 * not express combinations at all (see `layers.ts`).
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
    <div className="absolute left-3 right-3 top-28 z-30 max-h-[65%] w-auto overflow-y-auto rounded-nb-md border-2 border-nb-black bg-nb-white p-4 shadow-nb-lg sm:right-auto sm:w-80">
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
        className="min-h-touch w-full rounded-nb-sm border-2 border-nb-black bg-nb-white px-2 py-1 text-sm font-bold text-nb-black"
      >
        {MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.labelKey)}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs leading-snug text-nb-gray-500">
        {t(`monitoring:mode.${mode}Hint`)}
      </p>

      {/* A rule, not a gap: the two sections answer different questions, and
          spacing alone left them reading as one long list of controls. */}
      <hr className="my-4 border-t-2 border-nb-gray-100" />

      <span className="mb-2 block text-xs font-bold uppercase text-nb-gray-500">
        {t('monitoring:layers.overlays')}
      </span>
      {/* Grid, not four independently sized rows: the labels share a column and
          the controls share the rest, so both edges line up and no row can
          overflow the panel on a longer label ("Petugas & Tim" did). */}
      <ul className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
        {LAYER_ROWS.map(({ key, labelKey, facets }) => {
          const selected = layers[key] as readonly string[];
          return (
            <li key={key} className="contents">
              <span className="text-sm font-medium text-nb-black">{t(labelKey)}</span>
              <MultiSelect
                // The dropdown may outgrow its trigger: the trigger truncates a
                // long summary, but the options behind it must stay readable.
                contentClassName="min-w-44"
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
