'use client';

import { useTranslation } from 'react-i18next';
import type { MapStyle } from '@/lib/api/regions';
import { cn } from '@/lib/utils/cn';
import { MarkerImagePicker } from './MarkerImagePicker';
import { ColorField, HEX_COLOR } from './ColorField';

// eslint-disable-next-line sekar-design/no-inline-hex-colors -- color-input default values
const DEFAULTS = { border: '#1C1917', fill: '#7FBC8C' };

interface MapStyleFieldsProps {
  value: MapStyle;
  onChange: (patch: Partial<MapStyle>) => void;
  /** System default marker for this entity (shown when none is set). */
  markerDefaultUrl: string;
  disabled?: boolean;
}

/**
 * Reusable per-level map styling controls (ADR-045): separate border + fill
 * color, each with a 0–1 opacity, plus a marker icon + color. Shared by the
 * rayon / region / area forms.
 */
export function MapStyleFields({
  value,
  onChange,
  markerDefaultUrl,
  disabled,
}: MapStyleFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-nb-h3">{t('admin:mapStyle.title')}</h3>

      {/* Border colour + opacity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField
          label={t('admin:mapStyle.borderColor')}
          fallback={DEFAULTS.border}
          value={value.border_color ?? ''}
          onChange={(v) => onChange({ border_color: v })}
          disabled={disabled}
        />
        <OpacityField
          label={t('admin:mapStyle.borderOpacity')}
          value={value.border_opacity}
          defaultValue={1}
          onChange={(v) => onChange({ border_opacity: v })}
          disabled={disabled}
        />
      </div>

      {/* Fill is OPTIONAL: toggle off = no fill, or match the border colour. */}
      <FillControl
        borderValue={value.border_color ?? ''}
        value={value.fill_color ?? null}
        opacity={value.fill_opacity}
        onChange={onChange}
        disabled={disabled}
      />

      <MarkerImagePicker
        value={value.marker_image_url ?? null}
        onChange={(v) => onChange({ marker_image_url: v })}
        defaultUrl={markerDefaultUrl}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Optional fill colour. Off → `fill_color = null` (unfilled/transparent). On →
 * a custom fill, with a one-click "same as border colour". Fill opacity only
 * shows while a fill is set.
 */
function FillControl({
  borderValue,
  value,
  opacity,
  onChange,
  disabled,
}: {
  borderValue: string;
  value: string | null;
  opacity?: number | null;
  onChange: (patch: Partial<MapStyle>) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const enabled = value != null && value !== '';
  // The colour shown in the border swatch: the set border_color, or the border
  // default when it's unset. Fill defaults to (and "same as border" copies) this
  // effective colour — so it works even before border_color is explicitly typed.
  const effectiveBorder = HEX_COLOR.test(borderValue) ? borderValue : DEFAULTS.border;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-nb-body-sm font-semibold text-nb-black">
          {t('admin:mapStyle.fillColor')}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t('admin:mapStyle.fillToggle')}
          disabled={disabled}
          onClick={() => onChange({ fill_color: enabled ? null : effectiveBorder })}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-nb-black transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            enabled ? 'bg-nb-primary' : 'bg-nb-gray-200',
          )}
        >
          <span
            className={cn(
              'inline-block size-4 rounded-full border-2 border-nb-black bg-nb-white transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {enabled ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <ColorField
              ariaLabel={t('admin:mapStyle.fillColor')}
              fallback={DEFAULTS.fill}
              value={value ?? ''}
              onChange={(v) => onChange({ fill_color: v })}
              disabled={disabled}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ fill_color: effectiveBorder })}
              className="text-nb-body-sm font-semibold text-nb-primary underline underline-offset-2 disabled:opacity-50"
            >
              {t('admin:mapStyle.fillSameAsBorder')}
            </button>
          </div>
          <OpacityField
            label={t('admin:mapStyle.fillOpacity')}
            value={opacity}
            onChange={(v) => onChange({ fill_opacity: v })}
            disabled={disabled}
          />
        </div>
      ) : (
        <p className="text-nb-caption text-nb-gray-500">{t('admin:mapStyle.fillNone')}</p>
      )}
    </div>
  );
}

function OpacityField({
  label,
  value,
  defaultValue = 0.25,
  onChange,
  disabled,
}: {
  label: string;
  value?: number | null;
  /** Effective opacity when unset — matches how the map renders it (border → 1, fill → 0.25). */
  defaultValue?: number;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  // Always show the *effective* opacity as a percentage so the readout matches
  // the slider position even when the value is unset (was a bare "—").
  const effective = value ?? defaultValue;
  return (
    <div className="space-y-1.5">
      <label className="block text-nb-body-sm font-semibold text-nb-black">
        {label} <span className="font-mono text-nb-gray-600">{Math.round(effective * 100)}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={effective}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="h-2 w-full cursor-pointer accent-nb-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
