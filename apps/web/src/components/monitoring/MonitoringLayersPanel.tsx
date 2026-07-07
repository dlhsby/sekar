'use client';

/**
 * MonitoringLayersPanel — the "Pengaturan" (settings) control popover, opened
 * from the settings button. Toggles which overlays the map draws. State is owned
 * by the page (persisted via useMonitoringLayers).
 */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { LAYER_TOGGLES, type MonitoringLayers } from '@/lib/monitoring/layers';

export interface MonitoringLayersPanelProps {
  layers: MonitoringLayers;
  onToggleLayer: (key: keyof MonitoringLayers) => void;
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
