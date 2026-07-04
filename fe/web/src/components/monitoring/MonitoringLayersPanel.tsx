'use client';

/**
 * MonitoringLayersPanel — the "Lapisan" (layers) control popover, opened from
 * the Layers button. Toggles which overlays the map draws and hosts the
 * Ringkasan / Semua Petugas view-mode switch. State is owned by the page
 * (persisted via useMonitoringLayers).
 */
import { useTranslation } from 'react-i18next';
import { X, LayoutGrid, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LAYER_TOGGLES, type MonitoringLayers } from '@/lib/monitoring/layers';

export interface MonitoringLayersPanelProps {
  layers: MonitoringLayers;
  onToggleLayer: (key: keyof MonitoringLayers) => void;
  mode: 'aggregate' | 'workers';
  onModeChange: (mode: 'aggregate' | 'workers') => void;
  /** Mode switch is only meaningful above the area scope. */
  showModeToggle: boolean;
  onClose: () => void;
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border-2 border-nb-black transition-colors',
        on ? 'bg-nb-primary' : 'bg-nb-gray-200'
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          'absolute top-0.5 h-3 w-3 rounded-full bg-nb-black transition-transform',
          on ? 'left-0.5 translate-x-4' : 'left-0.5'
        )}
      />
    </span>
  );
}

export function MonitoringLayersPanel({
  layers,
  onToggleLayer,
  mode,
  onModeChange,
  showModeToggle,
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

      {showModeToggle && (
        <div className="mb-3">
          <span className="mb-1.5 block text-xs font-bold uppercase text-nb-gray-500">
            {t('monitoring:layers.viewMode')}
          </span>
          <div className="flex rounded-nb-base border-2 border-nb-black p-0.5">
            <button
              type="button"
              onClick={() => onModeChange('aggregate')}
              aria-pressed={mode === 'aggregate'}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-nb-sm py-1.5 text-sm font-bold transition-colors',
                mode === 'aggregate' ? 'bg-nb-primary text-nb-black' : 'text-nb-gray-600 hover:bg-nb-gray-50'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              {t('monitoring:page.modeSummary')}
            </button>
            <button
              type="button"
              onClick={() => onModeChange('workers')}
              aria-pressed={mode === 'workers'}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-nb-sm py-1.5 text-sm font-bold transition-colors',
                mode === 'workers' ? 'bg-nb-primary text-nb-black' : 'text-nb-gray-600 hover:bg-nb-gray-50'
              )}
            >
              <Users className="h-4 w-4" />
              {t('monitoring:page.modeAllWorkers')}
            </button>
          </div>
        </div>
      )}

      <span className="mb-1.5 block text-xs font-bold uppercase text-nb-gray-500">
        {t('monitoring:layers.overlays')}
      </span>
      <ul className="flex flex-col gap-0.5">
        {LAYER_TOGGLES.map(({ key, labelKey }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => onToggleLayer(key)}
              aria-pressed={layers[key]}
              className="flex w-full items-center justify-between gap-3 rounded-nb-sm px-2 py-2 text-left text-sm font-medium text-nb-black hover:bg-nb-gray-50"
            >
              <span>{t(labelKey)}</span>
              <Switch on={layers[key]} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
