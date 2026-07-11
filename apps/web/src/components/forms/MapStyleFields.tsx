'use client';

import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui';
import type { MapStyle } from '@/lib/api/regions';
import { MarkerImagePicker } from './MarkerImagePicker';

// eslint-disable-next-line sekar-design/no-inline-hex-colors -- color-input default values
const DEFAULTS = { border: '#1C1917', fill: '#7FBC8C' };
const HEX = /^#[0-9a-fA-F]{6}$/;

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
          onChange={(v) => onChange({ border_opacity: v })}
          disabled={disabled}
        />
        <ColorField
          label={t('admin:mapStyle.fillColor')}
          fallback={DEFAULTS.fill}
          value={value.fill_color ?? ''}
          onChange={(v) => onChange({ fill_color: v })}
          disabled={disabled}
        />
        <OpacityField
          label={t('admin:mapStyle.fillOpacity')}
          value={value.fill_opacity}
          onChange={(v) => onChange({ fill_opacity: v })}
          disabled={disabled}
        />
        <div className="sm:col-span-2">
          <MarkerImagePicker
            value={value.marker_image_url ?? null}
            onChange={(v) => onChange({ marker_image_url: v })}
            defaultUrl={markerDefaultUrl}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const swatch = HEX.test(value) ? value : fallback;
  return (
    <div className="space-y-1.5">
      <label className="block text-nb-body-sm font-semibold text-nb-black">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={swatch}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-nb-base border-2 border-nb-black bg-nb-white shadow-nb-sm disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Input
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono"
        />
      </div>
    </div>
  );
}

function OpacityField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-nb-body-sm font-semibold text-nb-black">
        {label} <span className="font-mono text-nb-gray-600">{value ?? '—'}</span>
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value ?? 0.25}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="h-2 w-full cursor-pointer accent-nb-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
